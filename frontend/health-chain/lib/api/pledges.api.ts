import { api } from './http-client';

const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api/v1';

export type PledgeFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface CreatePledgeRequest {
  amount: number;
  payerAddress: string;
  recipientId: string;
  frequency: PledgeFrequency;
  causeTag?: string;
  regionTag?: string;
  emergencyPool?: boolean;
  asset?: string;
  sorobanPledgeId?: string;
}

export const createPledge = (body: CreatePledgeRequest) =>
  api.post(`/${PREFIX}/donations/pledges`, body);

export const listPledgesByPayer = (payerAddress: string) =>
  api.get(`/${PREFIX}/donations/pledges/by-payer/${encodeURIComponent(payerAddress)}`, {
    skipAuth: true,
  });
