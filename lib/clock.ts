import { sb } from './supabase';

// Offset between this device's clock and the server clock, in ms.
let offset = 0;

export async function syncClock() {
  let bestRtt = Infinity;
  let bestOffset = offset;
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const { data, error } = await sb().rpc('buzzer_now');
    const t1 = performance.now();
    if (error || typeof data !== 'number') continue;
    const rtt = t1 - t0;
    if (rtt < bestRtt) {
      bestRtt = rtt;
      bestOffset = data - (performance.timeOrigin + (t0 + t1) / 2);
    }
  }
  if (bestRtt < Infinity) offset = bestOffset;
}

// Converts an event's timeStamp (the moment the finger touched) to server time.
export function serverTimeFromEvent(timeStamp: number) {
  return performance.timeOrigin + timeStamp + offset;
}

export function startClockSync() {
  syncClock();
  const id = setInterval(syncClock, 20000);
  const onVisible = () => {
    if (document.visibilityState === 'visible') syncClock();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
