'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function RealtimeSync() {
  const router = useRouter();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const sseUrl = `${apiBase}/settings/sse`;

    let eventSource: EventSource;

    function connect() {
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          console.log('[SSE] Received realtime update:', parsed);
          
          if (parsed && parsed.type) {
            // Re-fetch global settings store immediately
            fetchSettings().catch(() => {});
            
            // Re-render Next.js Server Components dynamically in-place
            router.refresh();
          }
        } catch (err) {
          console.error('[SSE] Failed to parse event data:', err);
        }
      };

      eventSource.onerror = () => {
        console.warn('[SSE] EventSource connection lost. Retrying in 5s...');
        eventSource.close();
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [router, fetchSettings]);

  return null;
}
