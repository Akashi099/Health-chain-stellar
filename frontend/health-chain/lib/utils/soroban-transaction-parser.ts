import { TransactionAction } from '@/components/modals/TransactionSigningModal';

export function parseSorobanTransaction(rawTx: any): TransactionAction | null {
  // This is a simplified parser - in reality you'd parse the actual Soroban transaction
  // For demonstration, we'll create mock actions based on common patterns

  const contractCall = rawTx.function || rawTx.method || 'unknown';

  switch (contractCall) {
    case 'verify_organization':
      return {
        type: 'verify_organization',
        title: 'Verify Organization',
        description: 'Confirm this healthcare organization meets all compliance and safety standards for participation in the blood supply chain.',
        details: {
          organizationName: rawTx.args?.organizationName || 'Unknown Organization',
          organizationType: rawTx.args?.organizationType || 'Healthcare Provider',
          location: rawTx.args?.location || 'Unknown Location',
        },
        contractCall: `verify_organization(${rawTx.args?.orgId || 'org_id'})`,
        rawData: JSON.stringify(rawTx, null, 2),
      };

    case 'transfer_blood':
    case 'initiate_transfer':
      return {
        type: 'transfer_blood',
        title: 'Initiate Blood Transfer',
        description: 'Authorize the secure transfer of blood units from the blood bank to the receiving hospital.',
        details: {
          unitId: rawTx.args?.unitId || 'Unknown',
          bloodType: rawTx.args?.bloodType || 'Unknown',
          fromBank: rawTx.args?.fromBank || 'Blood Bank',
          toHospital: rawTx.args?.toHospital || 'Hospital',
        },
        contractCall: `initiate_transfer(${rawTx.args?.unitId || 'unit_id'})`,
        rawData: JSON.stringify(rawTx, null, 2),
      };

    case 'allocate_blood':
      return {
        type: 'authorize_release',
        title: 'Authorize Blood Release',
        description: 'Release blood units from inventory for emergency medical use at the specified hospital.',
        details: {
          bloodType: rawTx.args?.bloodType || 'Unknown',
          quantity: rawTx.args?.quantity || 0,
          hospitalName: rawTx.args?.hospitalName || 'Emergency Department',
          urgency: rawTx.args?.urgency || 'High',
        },
        contractCall: `allocate_blood(${rawTx.args?.unitId || 'unit_id'}, ${rawTx.args?.hospitalId || 'hospital_id'})`,
        rawData: JSON.stringify(rawTx, null, 2),
      };

    case 'log_supply_arrival':
      return {
        type: 'log_supply_arrival',
        title: 'Log Supply Chain Event',
        description: 'Record the arrival of medical supplies or blood products in the supply chain system.',
        details: {
          supplyType: rawTx.args?.supplyType || 'Blood Products',
          quantity: rawTx.args?.quantity || 0,
          source: rawTx.args?.source || 'Distribution Center',
          arrivalTime: rawTx.args?.arrivalTime || new Date().toISOString(),
        },
        contractCall: `log_supply_arrival(${JSON.stringify(rawTx.args || {})})`,
        rawData: JSON.stringify(rawTx, null, 2),
      };

    case 'stake_for_audit':
      return {
        type: 'stake_for_audit',
        title: 'Stake for Quality Audit',
        description: 'Commit tokens as a guarantee for maintaining quality standards during the audit period.',
        details: {
          amount: rawTx.args?.amount || 0,
          period: rawTx.args?.period || 30,
          purpose: rawTx.args?.purpose || 'Quality Assurance Audit',
        },
        contractCall: `stake_for_audit(${rawTx.args?.amount || 0}, ${rawTx.args?.period || 30})`,
        rawData: JSON.stringify(rawTx, null, 2),
      };

    default:
      // Generic transaction
      return {
        type: 'custom',
        title: 'Blockchain Transaction',
        description: 'Execute a smart contract function call on the Stellar network.',
        details: rawTx.args || {},
        contractCall: `${contractCall}(${Object.values(rawTx.args || {}).join(', ')})`,
        rawData: JSON.stringify(rawTx, null, 2),
      };
  }
}

// Example usage functions for different healthcare actions
export function createOrganizationVerificationAction(orgData: {
  orgId: string;
  name: string;
  type: string;
  location: string;
}): TransactionAction {
  return {
    type: 'verify_organization',
    title: 'Verify Healthcare Organization',
    description: `Confirm that ${orgData.name} meets all regulatory requirements and safety standards for blood supply chain participation.`,
    details: {
      organizationName: orgData.name,
      organizationType: orgData.type,
      location: orgData.location,
    },
    contractCall: `verify_organization("${orgData.orgId}")`,
  };
}

export function createBloodTransferAction(transferData: {
  unitId: string;
  bloodType: string;
  quantity: number;
  fromBank: string;
  toHospital: string;
}): TransactionAction {
  return {
    type: 'transfer_blood',
    title: 'Secure Blood Transfer',
    description: `Initiate secure transfer of ${transferData.quantity}mL of ${transferData.bloodType} blood from ${transferData.fromBank} to ${transferData.toHospital}.`,
    details: {
      unitId: transferData.unitId,
      bloodType: transferData.bloodType,
      fromBank: transferData.fromBank,
      toHospital: transferData.toHospital,
    },
    contractCall: `initiate_transfer("${transferData.unitId}", "${transferData.toHospital}")`,
  };
}

export function createEmergencyReleaseAction(releaseData: {
  bloodType: string;
  quantity: number;
  hospitalName: string;
  urgency: string;
  patientInfo?: string;
}): TransactionAction {
  return {
    type: 'authorize_release',
    title: 'Emergency Blood Release',
    description: `URGENT: Release ${releaseData.quantity}mL of ${releaseData.bloodType} blood for emergency use at ${releaseData.hospitalName}.`,
    details: {
      bloodType: releaseData.bloodType,
      quantity: releaseData.quantity,
      hospitalName: releaseData.hospitalName,
      urgency: releaseData.urgency,
      patientInfo: releaseData.patientInfo,
    },
    contractCall: `allocate_blood("${releaseData.bloodType}", ${releaseData.quantity}, "${releaseData.hospitalName}")`,
  };
}

export function createSupplyChainAction(supplyData: {
  supplyType: string;
  quantity: number;
  source: string;
  destination: string;
  trackingId: string;
}): TransactionAction {
  return {
    type: 'log_supply_arrival',
    title: 'Log Supply Chain Movement',
    description: `Record the secure movement of ${supplyData.quantity} units of ${supplyData.supplyType} from ${supplyData.source} to ${supplyData.destination}.`,
    details: {
      supplyType: supplyData.supplyType,
      quantity: supplyData.quantity,
      source: supplyData.source,
      arrivalTime: new Date().toISOString(),
      trackingId: supplyData.trackingId,
    },
    contractCall: `log_supply_arrival("${supplyData.trackingId}", ${supplyData.quantity})`,
  };
}

export function createAuditStakeAction(stakeData: {
  amount: number;
  period: number;
  auditType: string;
  organizationName: string;
}): TransactionAction {
  return {
    type: 'stake_for_audit',
    title: 'Quality Assurance Commitment',
    description: `${stakeData.organizationName} commits ${stakeData.amount} XLM as a quality assurance stake for ${stakeData.auditType} audit.`,
    details: {
      amount: stakeData.amount,
      period: stakeData.period,
      purpose: `${stakeData.auditType} Quality Audit`,
    },
    contractCall: `stake_for_audit(${stakeData.amount}, ${stakeData.period})`,
  };
}