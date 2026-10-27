import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './contexts/identity/api/company';

export function createQueryClient(): QueryClient {
  let client: QueryClient;
  const queryCache = new QueryCache({
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        return;
      }
      if (error.status !== 401) {
        return;
      }
      void client.invalidateQueries({ queryKey: ['company-actor'] });
    },
  });
  client = new QueryClient({
    queryCache,
    defaultOptions: { queries: { retry: false } },
  });
  return client;
}
