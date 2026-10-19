'use client';
import { useEffect, useState } from 'react';
import { sb } from './supabase';

export type Team = 'blaa' | 'roed';

export type Round = {
  id: number;
  created_at: string;
  first_arrival_at: string | null;
  resolved_at: string | null;
  winner_team: Team | null;
  winner_name: string | null;
  winner_player_id: string | null;
  points: number | null;
  excluded: string[] | null;
  winner_press_ms: number | null;
};

export const TEAM_NAME: Record<Team, string> = { blaa: 'Blå', roed: 'Rød' };

export function useCurrentRound() {
  const [round, setRound] = useState<Round | null>(null);

  useEffect(() => {
    let alive = true;
    const accept = (row: Round) =>
      setRound((r) => (!r || row.id >= r.id ? row : r));

    const fetchLatest = async () => {
      const { data } = await sb()
        .from('buzzer_rounds')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (alive && data) accept(data as Round);
    };

    fetchLatest();
    const channel = sb()
      .channel('buzzer-rounds')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buzzer_rounds' },
        (payload) => {
          const row = payload.new as Round;
          if (row && row.id) accept(row);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchLatest();
      });

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLatest();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      sb().removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return round;
}

export function resolveSoon(roundId: number) {
  setTimeout(() => {
    sb().rpc('buzzer_resolve', { p_round_id: roundId });
  }, 350);
}

export function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen');
      } catch {}
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}
