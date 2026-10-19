alter table buzzer_rounds add column if not exists excluded uuid[] not null default '{}';

create or replace function buzzer_press(
  p_round_id bigint, p_team text, p_player_id uuid, p_player_name text, p_press_ms double precision
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_now double precision := extract(epoch from clock_timestamp()) * 1000;
  v_round buzzer_rounds;
begin
  select * into v_round from buzzer_rounds where id = p_round_id for update;
  if not found then return 'no_round'; end if;
  if v_round.resolved_at is not null then return 'too_late'; end if;
  if p_player_id = any(v_round.excluded) then return 'excluded'; end if;
  p_press_ms := greatest(least(p_press_ms, v_now), v_now - 2000);
  insert into buzzer_presses(round_id, team, player_id, player_name, press_ms, arrived_ms)
  values (p_round_id, p_team, p_player_id, left(p_player_name, 40), p_press_ms, v_now)
  on conflict (round_id, player_id) do nothing;
  if v_round.first_arrival_at is null then
    update buzzer_rounds set first_arrival_at = clock_timestamp() where id = p_round_id;
  end if;
  return 'ok';
end $$;

create or replace function buzzer_wrong(p_round_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_round buzzer_rounds;
begin
  select * into v_round from buzzer_rounds where id = p_round_id for update;
  if not found or v_round.resolved_at is null or v_round.winner_player_id is null then return; end if;
  if exists (select 1 from buzzer_rounds where id > p_round_id) then return; end if;
  update buzzer_rounds set points = -1 where id = p_round_id;
  insert into buzzer_rounds(excluded) values (v_round.excluded || v_round.winner_player_id);
end $$;

grant execute on function buzzer_wrong(bigint) to anon;
