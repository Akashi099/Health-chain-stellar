import { api } from './http-client';

const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api/v1';

export interface QrVerificationLog {
  id: string;
  unitNumber: string;
  orderId: string;
  scannedBy: string;
  result: 'MATCH' | 'MISMATCH';
  failureReason: string | null;
  scannedAt: string;
}

export const verifyQr = (payload: { qrPayload: string; orderId: string; scannedBy: string }) =>
  api.post<{ verified: boolean; unitNumber: string }>(`/${PREFIX}/blood-units/verify-qr`, payload);

export const fetchVerificationHistory = (orderId: string) =>
  api.get<QrVerificationLog[]>(`/${PREFIX}/blood-units/verify-qr/history/${orderId}`);
