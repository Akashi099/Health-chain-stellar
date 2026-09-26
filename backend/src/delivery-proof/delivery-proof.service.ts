import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Keypair } from '@stellar/stellar-sdk';

import { PaginatedResponse, PaginationUtil } from '../common/pagination';
import { CreateDeliveryProofDto } from './dto/create-delivery-proof.dto';
import { DeliveryProofQueryDto } from './dto/delivery-proof-query.dto';
import { DeliveryProofEntity } from './entities/delivery-proof.entity';
import { SorobanService } from '../soroban/soroban.service';
import { CustodyService } from '../custody/custody.service';
import { UploadValidationService } from './upload-validation.service';
import { FileMetadataService } from '../file-metadata/file-metadata.service';
import { FileOwnerType } from '../file-metadata/entities/file-metadata.entity';

// Blood products must be stored between 2°C and 6°C (backend compliance threshold)
const TEMP_MIN_CELSIUS = 2;
const TEMP_MAX_CELSIUS = 6;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TrustedSignerKey {
  kid: string;
  publicKey: string;
}

export interface DeliveryStatistics {
  totalDeliveries: number;
  successfulDeliveries: number;
  successRate: number;
  temperatureCompliantDeliveries: number;
  temperatureComplianceRate: number;
  averageTemperatureCelsius: number | null;
}

@Injectable()
export class DeliveryProofService {
  private readonly logger = new Logger(DeliveryProofService.name);

  constructor(
    @InjectRepository(DeliveryProofEntity)
    private readonly proofRepo: Repository<DeliveryProofEntity>,
    private readonly configService: ConfigService,
    private readonly sorobanService: SorobanService,
    private readonly custodyService: CustodyService,
    private readonly uploadValidation: UploadValidationService,
    private readonly fileMetadata: FileMetadataService,
  ) {}

  async uploadPhoto(orderId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Reject path-traversal payloads (e.g. "../../../tmp/x") before the value
    // is ever embedded in a file name or used as an owner id.
    if (!UUID_REGEX.test(orderId)) {
      throw new BadRequestException('orderId must be a valid UUID');
    }

    // Validate against photo policy (MIME, extension, size, content sniffing).
    this.uploadValidation.validate(file, 'photo');

    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const auditMeta = this.uploadValidation.buildAuditMetadata(file, 'photo', hash);

    const storagePath = this.configService.get<string>('STORAGE_PATH', './uploads');
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

    const storageRoot = path.resolve(storagePath);
    const fileExt = path.extname(file.originalname) || '.png';
    const fileName = `dp-${orderId}-${Date.now()}${fileExt}`;
    const resolvedPath = path.resolve(storageRoot, fileName);

    // Defense-in-depth: the resolved path must stay inside the storage root.
    if (resolvedPath !== storageRoot && !resolvedPath.startsWith(storageRoot + path.sep)) {
      throw new BadRequestException('Invalid storage path');
    }

    try {
      fs.writeFileSync(resolvedPath, file.buffer);
    } catch (err) {
      this.logger.error(`Failed to write file to storage: ${err.message}`);
      throw new BadRequestException('Internal Storage Error');
    }

    const storageUrl = `${storagePath}/${fileName}`;

    await this.fileMetadata.replace({
      ownerType: FileOwnerType.DELIVERY_PROOF,
      ownerId: orderId,
      storagePath: resolvedPath,
      originalFilename: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
      sha256Hash: hash,
    });

    const proof = await this.proofRepo.findOne({ where: { orderId } });
    if (!proof) {
      // A delivery proof requires a NOT NULL deliveryId; without an existing
      // proof we cannot safely auto-create one, so fail before any on-chain
      // anchoring leaves an orphan anchor for a proof that does not exist.
      throw new NotFoundException(
        `No delivery proof found for order ${orderId}`,
      );
    }

    proof.photoUrl = storageUrl;
    if (!proof.photoHashes) proof.photoHashes = [];
    proof.photoHashes.push(hash);

    let txId: string | null = null;
    try {
      const anchorResult = await this.sorobanService.anchorHash(orderId, hash);
      txId = anchorResult.transactionHash;
      proof.blockchainTxHash = txId;
    } catch (error) {
      this.logger.warn(`On-chain anchoring failed for order ${orderId}: ${error.message}`);
    }

    await this.proofRepo.save(proof);

    return {
      success: true,
      message: 'Delivery proof photo uploaded and anchored',
      data: {
        orderId,
        sha256Hash: hash,
        storageUrl,
        transactionId: txId,
        audit: auditMeta,
      },
    };
  }

  async create(dto: CreateDeliveryProofDto): Promise<DeliveryProofEntity> {
    this.assertEvidenceDigestReferences(dto.evidenceDigestReferences);

    if (!dto.requestId) {
      throw new BadRequestException('requestId is required for delivery proof binding');
    }

    const pickupTimestamp = new Date(dto.pickupTimestamp);
    const deliveredAt = new Date(dto.deliveredAt);
    const signedAt = new Date(dto.signedAt);

    if (deliveredAt < pickupTimestamp) {
      throw new BadRequestException(
        'deliveredAt must be after pickupTimestamp',
      );
    }
    if (signedAt > new Date()) {
      throw new BadRequestException('signedAt cannot be in the future');
    }
    if (!dto.temperatureReadings || dto.temperatureReadings.length === 0) {
      throw new BadRequestException(
        'At least one temperature reading is required',
      );
    }

    // Require all custody handoffs confirmed before delivery can be recorded (#380)
    await this.custodyService.assertCustodyComplete(dto.orderId);

    const trustedSigner = this.resolveTrustedSigner(dto.signerKeyId);
    if (trustedSigner.publicKey !== dto.signerPublicKey) {
      throw new BadRequestException('Signer key does not match trusted rotation set');
    }

    const signedPayload = this.buildSignedPayload({
      deliveryId: dto.deliveryId,
      orderId: dto.orderId,
      requestId: dto.requestId,
      riderId: dto.riderId,
      signerRole: dto.signerRole,
      signedAt: dto.signedAt,
      evidenceDigestReferences: dto.evidenceDigestReferences,
    });
    const payloadDigest = crypto.createHash('sha256').update(signedPayload).digest('hex');
    try {
      const keypair = Keypair.fromPublicKey(dto.signerPublicKey);
      const signatureBytes = Buffer.from(dto.signature, 'base64');
      const digestBytes = Buffer.from(payloadDigest, 'hex');
      if (!keypair.verify(digestBytes, signatureBytes)) {
        throw new BadRequestException('Signature verification failed');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Signature verification failed');
    }

    const isTemperatureCompliant = dto.temperatureReadings.every(
      (t) => t >= TEMP_MIN_CELSIUS && t <= TEMP_MAX_CELSIUS,
    );

    const trustedTimestampAt = new Date();
    const timestampAnchorHash =
      dto.externalTimestampAnchorHash ??
      crypto
        .createHash('sha256')
        .update(`${dto.deliveryId}:${dto.requestId}:${trustedTimestampAt.toISOString()}`)
        .digest('hex');

    const proof = this.proofRepo.create({
      deliveryId: dto.deliveryId,
      orderId: dto.orderId,
      requestId: dto.requestId,
      riderId: dto.riderId,
      pickupTimestamp,
      pickupLocationHash: dto.pickupLocationHash ?? null,
      deliveredAt,
      deliveryLocationHash: dto.deliveryLocationHash ?? null,
      recipientName: dto.recipientName,
      recipientSignatureUrl: dto.recipientSignatureUrl ?? null,
      recipientSignatureHash: dto.recipientSignatureHash ?? null,
      photoUrl: dto.photoUrl ?? null,
      photoHashes: dto.photoHashes ?? [],
      temperatureReadings: dto.temperatureReadings,
      temperatureCelsius: dto.temperatureCelsius ?? null,
      notes: dto.notes ?? null,
      isTemperatureCompliant,
      verified: true,
      signerKeyId: dto.signerKeyId,
      signerPublicKey: dto.signerPublicKey,
      signerRole: dto.signerRole,
      signedAt,
      proofSignature: dto.signature,
      proofPayloadDigest: payloadDigest,
      trustedTimestampAt,


/* … truncated 5374 chars — edit only what you need near the top … */
