import { api } from './http-client';

const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api/v1';

export interface DonorImpactEvent {
  date: string;
  type: 'donation' | 'fulfillment';
  description: string;
  bloodType: string;
  quantityMl?: number;
  onChainRef?: string;
}

export interface DonorImpactSummary {
  donorRef: string;
  totalDonations: number;
  totalMlDonated: number;
  requestsFulfilled: number;
  estimatedPatientsSupported: number;
  timeline: DonorImpactEvent[];
}

export const fetchDonorImpact = (donorId: string) =>
  api.get<DonorImpactSummary>(`/${PREFIX}/donor-impact/${donorId}`);
