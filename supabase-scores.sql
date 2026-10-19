alter table buzzer_rounds
  add column if not exists winner_player_id uuid,
  add column if not exists points int check (points in (-1, 1));

create or replace function buzzer_resolve(p_round_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_round buzzer_rounds;
  v_win buzzer_presses;
begin
  select * into v_round from buzzer_rounds where id = p_round_id for update;
  if not found or v_round.resolved_at is not null or v_round.first_arrival_at is null then return; end if;
  if clock_timestamp() < v_round.first_arrival_at + interval '300 milliseconds' then return; end if;
  select * into v_win from buzzer_presses where round_id = p_round_id
    order by press_ms asc, arrived_ms asc limit 1;
  update buzzer_rounds
     set resolved_at = clock_timestamp(), winner_team = v_win.team,
         winner_name = v_win.player_name, winner_player_id = v_win.player_id,
         winner_press_ms = v_win.press_ms
   where id = p_round_id;
end $$;

create or replace function buzzer_judge(p_round_id bigint, p_points int) returns void
language sql security definer set search_path = public as $$
  update buzzer_rounds set points = p_points
   where id = p_round_id and resolved_at is not null and winner_team is not null $$;

create or replace function buzzer_reset() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from buzzer_presses where true;
  delete from buzzer_rounds where true;
  insert into buzzer_rounds default values;
end $$;

grant execute on function buzzer_judge(bigint, int), buzzer_reset() to anon;
