import { api } from './http-client';

const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api/v1';

export interface RestockingCampaign {
  id: string;
  bloodType: string;
  region: string;
  bloodBankId: string;
  thresholdUnits: number;
  currentUnits: number;
  targetUnits: number;
  audienceSize: number;
  notificationsSent: number;
  conversions: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface CreateCampaignPayload {
  bloodType: string;
  region: string;
  bloodBankId: string;
  thresholdUnits: number;
  targetUnits: number;
}

export const fetchCampaigns = (bloodBankId?: string) => {
  const qs = bloodBankId ? `?bloodBankId=${bloodBankId}` : '';
  return api.get<RestockingCampaign[]>(`/${PREFIX}/inventory/campaigns${qs}`);
};

export const createCampaign = (payload: CreateCampaignPayload) =>
  api.post<RestockingCampaign>(`/${PREFIX}/inventory/campaigns`, payload);
