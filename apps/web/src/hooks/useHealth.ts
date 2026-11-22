import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../services/api/health';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
