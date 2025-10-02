import { useCallback } from 'react';
import { useAppSelector } from '../lib/hooks';

import { apiRequest, getAccessToken, getAuthHeaders, ApiError } from '../lib/api';

export function useProtectedApi() {
  const { accessToken: reduxToken } = useAppSelector((state) => state.auth);

  const protectedFetch = useCallback(async <T>(endpoint: string, options: RequestInit = {}): Promise<T | null> => {
    // First check Redux state
    if (!reduxToken) {
      return null; // Indicate unauthenticated
    }

    // Then check localStorage as backup
    const token = getAccessToken();
    if (!token) {
      return null; // Indicate unauthenticated
    }

    try {
      return await apiRequest<T>(endpoint, {
        ...options,
        headers: {
          ...getAuthHeaders(token),
          ...options.headers,
        },
      });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        // Token might be invalid, but apiRequest already cleared it
        return null;
      }
      throw error;
    }
  }, [reduxToken]);

  return { protectedFetch };
}