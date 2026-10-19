'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase';
import { serverTimeFromEvent, startClockSync } from '@/lib/clock';
import { resolveSoon, Team, TEAM_NAME, useCurrentRound, useWakeLock } from '@/lib/round';
import { audio, playTeam } from '@/lib/sounds';

type Player = { player_id: string; name: string; team: Team };
const KEY = 'musikquiz-player';

function loadPlayer(): Player | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Player) : null;
  } catch {
    return null;
  }
}

export default function PlayerPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPlayer(loadPlayer());
    setLoaded(true);
  }, []);

  if (!loaded) return null;
  if (!player) return <Join onJoin={setPlayer} />;
  return (
    <Buzzer
      player={player}
      onLeave={() => {
        try { localStorage.removeItem(KEY); } catch {}
        setPlayer(null);
      }}
    />
  );
}

function Join({ onJoin }: { onJoin: (p: Player) => void }) {
  const [name, setName] = useState('');
  const join = (team: Team) => {
    audio();
    const p: Player = { player_id: crypto.randomUUID(), name: name.trim().slice(0, 40), team };
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
    onJoin(p);
  };
  const ok = name.trim().length > 0;
  return (
    <main className="screen join">
      <h1 className="display">Musikquiz</h1>
      <input
        id="name"
        placeholder="Dit navn"
        value={name}
        maxLength={40}
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
      />
      <div className="teams">
        <button className="teambtn blaa" disabled={!ok} onClick={() => join('blaa')}>Hold Blå</button>
        <button className="teambtn roed" disabled={!ok} onClick={() => join('roed')}>Hold Rød</button>
      </div>
      <p className="muted">Skriv dit navn og vælg hold</p>
    </main>
  );
}

function Buzzer({ player, onLeave }: { player: Player; onLeave: () => void }) {
  const round = useCurrentRound();
  const [pressedRound, setPressedRound] = useState<number | null>(null);
  const playedFor = useRef<number | null>(null);
  useWakeLock();

  useEffect(() => startClockSync(), []);

  const resolved = !!round?.resolved_at;
  const won =
    resolved &&
    pressedRound === round!.id &&
    round!.winner_team === player.team &&
    round!.winner_name === player.name;

  useEffect(() => {
    if (won && round && playedFor.current !== round.id) {
      playedFor.current = round.id;
      playTeam(player.team);
      try { navigator.vibrate?.(300); } catch {}
    }
  }, [won, round, player.team]);

  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!round || round.resolved_at || pressedRound === round.id) return;
    const pressMs = serverTimeFromEvent(e.nativeEvent.timeStamp);
    const roundId = round.id;
    setPressedRound(roundId);
    sb()
      .rpc('buzzer_press', {
        p_round_id: roundId,
        p_team: player.team,
        p_player_id: player.player_id,
        p_player_name: player.name,
        p_press_ms: pressMs,
      })
      .then(({ data }) => {
        if (data === 'ok') resolveSoon(roundId);
      });
  };

  let cls = '';
  let big = 'TRYK';
  let small = 'Tryk når du kender svaret';
  if (!round) {
    big = '…';
    small = 'Forbinder';
  } else if (resolved) {
    if (won) {
      cls = 'won';
      big = 'Først!';
      small = 'Svar nu';
    } else {
      cls = 'lost';
      big = 'For sent';
      small = round.winner_team
        ? `${round.winner_name} fra Hold ${TEAM_NAME[round.winner_team]} var først`
        : 'Venter på næste runde';
    }
  } else if (pressedRound === round.id) {
    cls = 'pressed';
    big = '…';
    small = 'Afgøres';
  }

  return (
    <main className="screen">
      <div className="topbar">
        <strong>{player.name} · Hold {TEAM_NAME[player.team]}</strong>
        <button className="link" onClick={onLeave}>Skift hold</button>
      </div>
      <button
        className={`buzz ${player.team} ${cls}`}
        onPointerDown={press}
        onPointerUp={() => audio()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="big">{big}</span>
        <span className="small">{small}</span>
      </button>
    </main>
  );
}
