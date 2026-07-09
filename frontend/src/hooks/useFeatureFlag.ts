'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const flagCache: Record<string, boolean> = {};

/**
 * Custom React Hook to evaluate DB-backed Feature Flags
 *
 * Utilizes memory caching to prevent redundant HTTP requests
 * for the same flag during a single session.
 */
export function useFeatureFlag(key: string, userId?: string) {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    // Return cached value if already evaluated
    if (flagCache[key] !== undefined) {
      return flagCache[key];
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(flagCache[key] === undefined);

  useEffect(() => {
    if (flagCache[key] !== undefined) {
      setIsEnabled(flagCache[key]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function evaluateFlag() {
      try {
        const params: Record<string, string> = { key };
        if (userId) params.userId = userId;

        const { data } = await api.get('/feature-flags/check', { params });
        
        if (isMounted) {
          flagCache[key] = data.enabled;
          setIsEnabled(data.enabled);
        }
      } catch (err) {
        console.error(`Failed to evaluate feature flag "${key}"`, err);
        if (isMounted) {
          setIsEnabled(false); // Fail-safe disabled
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    evaluateFlag();

    return () => {
      isMounted = false;
    };
  }, [key, userId]);

  return { isEnabled, isLoading };
}
