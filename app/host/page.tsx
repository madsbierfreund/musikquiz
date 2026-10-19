'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase';
import { resolveSoon, TEAM_NAME, useCurrentRound, useWakeLock } from '@/lib/round';
import { audio, playTeam } from '@/lib/sounds';

export default function HostPage() {
  const [started, setStarted] = useState(false);
  if (!started) {
    return (
      <main className="screen host">
        <h1 className="display state">Musikquiz</h1>
        <p className="sub">Quizmasterskærm</p>
        <button
          className="pill"
          onClick={() => {
            audio();
            setStarted(true);
          }}
        >
          Start
        </button>
      </main>
    );
  }
  return <Host />;
}

function Host() {
  const round = useCurrentRound();
  const resolvedFor = useRef<number | null>(null);
  const playedFor = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  useWakeLock();

  // Backup: resolve the round if no player's call got through.
  useEffect(() => {
    if (round && round.first_arrival_at && !round.resolved_at && resolvedFor.current !== round.id) {
      resolvedFor.current = round.id;
      resolveSoon(round.id);
    }
  }, [round]);

  useEffect(() => {
    if (round?.resolved_at && round.winner_team && playedFor.current !== round.id) {
      playedFor.current = round.id;
      playTeam(round.winner_team);
    }
  }, [round]);

  const newRound = async () => {
    if (busy) return;
    setBusy(true);
    audio();
    await sb().rpc('buzzer_new_round');
    setBusy(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        newRound();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  let teamCls = '';
  let state = 'Klar';
  let sub = 'Venter på første tryk';
  if (!round) {
    state = '…';
    sub = 'Forbinder';
  } else if (round.resolved_at && round.winner_team) {
    teamCls = round.winner_team;
    state = round.winner_name ?? '';
    sub = `Hold ${TEAM_NAME[round.winner_team]}`;
  } else if (round.first_arrival_at) {
    state = '…';
    sub = 'Nogen har trykket';
  }

  return (
    <main className={`screen host ${teamCls}`}>
      <h1 className="display state">{state}</h1>
      <p className="sub">{sub}</p>
      <div className="actions">
        <button className="pill" onClick={newRound} disabled={busy}>Ny runde</button>
      </div>
    </main>
  );
}
