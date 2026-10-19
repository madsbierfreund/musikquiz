'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase';
import { resolveSoon, Round, Team, TEAM_NAME, useCurrentRound, useWakeLock } from '@/lib/round';
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

type PlayerScore = { key: string; name: string; team: Team; points: number };
type Scores = { teams: Record<Team, number>; players: PlayerScore[] };

function useScores(round: Round | null): Scores {
  const [scores, setScores] = useState<Scores>({ teams: { blaa: 0, roed: 0 }, players: [] });
  const trigger = round ? `${round.id}:${round.points}:${round.resolved_at}` : '';

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await sb()
        .from('buzzer_rounds')
        .select('winner_team, winner_name, winner_player_id, points')
        .not('points', 'is', null);
      if (!alive || !data) return;
      const teams: Record<Team, number> = { blaa: 0, roed: 0 };
      const map = new Map<string, PlayerScore>();
      for (const r of data as Pick<Round, 'winner_team' | 'winner_name' | 'winner_player_id' | 'points'>[]) {
        if (!r.winner_team || r.points == null) continue;
        teams[r.winner_team] += r.points;
        const key = r.winner_player_id ?? `${r.winner_team}:${r.winner_name}`;
        const p = map.get(key) ?? { key, name: r.winner_name ?? '', team: r.winner_team, points: 0 };
        p.points += r.points;
        map.set(key, p);
      }
      const players = [...map.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
      setScores({ teams, players });
    })();
    return () => {
      alive = false;
    };
  }, [trigger]);

  return scores;
}

function Host() {
  const round = useCurrentRound();
  const scores = useScores(round);
  const resolvedFor = useRef<number | null>(null);
  const playedFor = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
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

  const judge = async (points: 1 | -1) => {
    if (!round) return;
    await sb().rpc('buzzer_judge', { p_round_id: round.id, p_points: points });
  };

  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setConfirmReset(false);
    await sb().rpc('buzzer_reset');
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

  const resolved = !!(round?.resolved_at && round.winner_team);
  let teamCls = '';
  let state = 'Klar';
  let sub = 'Venter på første tryk';
  if (!round) {
    state = '…';
    sub = 'Forbinder';
  } else if (resolved) {
    teamCls = round.winner_team!;
    state = round.winner_name ?? '';
    sub = `Hold ${TEAM_NAME[round.winner_team!]}`;
  } else if (round.first_arrival_at) {
    state = '…';
    sub = 'Nogen har trykket';
  }

  return (
    <main className={`screen hostgrid ${teamCls}`}>
      <section className="stagearea">
        <h1 className="display state">{state}</h1>
        <p className="sub">{sub}</p>
        {resolved && (
          <div className="judge">
            <button
              className={`judgebtn right ${round!.points === 1 ? 'chosen' : ''}`}
              onClick={() => judge(1)}
            >
              Rigtigt +1
            </button>
            <button
              className={`judgebtn wrong ${round!.points === -1 ? 'chosen' : ''}`}
              onClick={() => judge(-1)}
            >
              Forkert −1
            </button>
          </div>
        )}
      </section>

      <aside className="board">
        <div className="teamscores">
          <div className="teamscore blaa">
            <span>Hold Blå</span>
            <strong>{scores.teams.blaa}</strong>
          </div>
          <div className="teamscore roed">
            <span>Hold Rød</span>
            <strong>{scores.teams.roed}</strong>
          </div>
        </div>
        <h2>Individuelt</h2>
        {scores.players.length === 0 ? (
          <p className="muted">Ingen point endnu</p>
        ) : (
          <ol className="players">
            {scores.players.map((p) => (
              <li key={p.key}>
                <span className={`dot ${p.team}`} aria-label={`Hold ${TEAM_NAME[p.team]}`} />
                <span className="pname">{p.name}</span>
                <span className="ppts">{p.points}</span>
              </li>
            ))}
          </ol>
        )}
      </aside>

      <div className="controls">
        <button className="pill" onClick={newRound} disabled={busy}>Ny runde</button>
        <button className="link resetlink" onClick={reset}>
          {confirmReset ? 'Tryk igen for at nulstille alle point' : 'Nulstil point'}
        </button>
      </div>
    </main>
  );
}
