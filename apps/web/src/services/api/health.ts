import type { HealthResponse } from '@induinventory/contracts';
import { apiClient } from './client';

export function getHealth(signal: AbortSignal | undefined): Promise<HealthResponse> {
  return apiClient.get<HealthResponse>('/health', { signal });
}
