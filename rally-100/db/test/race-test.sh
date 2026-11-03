#!/bin/sh
# RALLY 100 v1 — two-session race proofs (review items 6 and 7). Concurrency
# cannot be tested from one session, so each race holds one transaction open
# with pg_sleep while a second session runs the conflicting operation.
#
#   sh rally-100/db/test/race-test.sh rally100_test
#
# Runs on the database rally100-test.sql has just populated (its fixtures:
# owner, leader Dana, reps Tyler and Jo). Exits non-zero on any failure.
set -e
DB="${1:-rally100_test}"
export PGUSER="${PGUSER:-postgres}"
P="psql -X -q -At -d $DB"
OWNER=00000000-0000-4000-8000-000000000001
L1=00000000-0000-4000-8000-000000000002
R1=00000000-0000-4000-8000-000000000004
R3=00000000-0000-4000-8000-000000000006
N=0
pass() { echo "PASS: $1"; N=$((N + 1)); }
fail() { echo "FAIL: $1"; exit 1; }
as() { echo "begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub','$1','role','authenticated')::text, true) is not null;"; }

# A credited, ready referral per race, made through the API as the suite does.
setup_referral() {  # $1 = rep uid, $2 = entry number; prints "<person> <reward>"
  $P -v ON_ERROR_STOP=1 >/dev/null <<SQL
call t.login('$1');
select rally100.save_entry(t.full($2, 'Race$2', 'Person$2'));
select rally100.record_intro(t.e($2), 'text', 'in');
reset role;
SQL
  SP="$($P -c "select t.person_of(t.e($2))")"
  $P -v ON_ERROR_STOP=1 >/dev/null <<SQL
call t.login('$L1');
select rally100.confirm_intro_received('$SP', '$1');
select rally100.set_requirement('$SP', 1, true);
select rally100.set_requirement('$SP', 2, true);
select rally100.set_requirement('$SP', 3, true);
select rally100.set_requirement('$SP', 4, true, null, null, '2027-04-01', null, true);
reset role;
SQL
  $P -c "select '$SP' || ' ' || (select id from rally100.rewards where kind = 'referral' and person_id = '$SP' and status = 'ready')"
}

# ------------------------------------------------ RACE A: approve, then untick
set -- $(setup_referral $R3 3901); PX=$1; RW=$2
[ -n "$RW" ] || fail "race A setup: no ready referral"
( { as $OWNER; echo "select rally100.review_reward('$RW', 'approve') ->'reward'->>'status'; select pg_sleep(2); commit;"; } | $P -v ON_ERROR_STOP=1 >/dev/null ) &
sleep 0.7
OUT="$( { as $L1; echo "select rally100.set_requirement('$PX', 4, false, null, 'recruit backed out') ->'reward'->>'status'; commit;"; } | $P 2>&1 || true)"
wait
FINAL="$($P -c "select status || ' ' || (select count(*) from rally100.requirements where person_id = '$PX' and confirmed) from rally100.rewards where id = '$RW'")"
echo "$OUT" | grep -q "rally100: locked_reward" && [ "$FINAL" = "approved 4" ] \
  || fail "race A: an untick racing an approval (got '$OUT', final '$FINAL')"
pass "race A [6] an untick that waits for an approval in flight is refused locked_reward; the reward stays approved with 4 of 4"

# ------------------------------------------------ RACE A2: untick, then approve
set -- $(setup_referral $R3 3902); PX=$1; RW=$2
[ -n "$RW" ] || fail "race A2 setup: no ready referral"
( { as $L1; echo "select rally100.set_requirement('$PX', 4, false, null, 'start moved') ->'reward'->>'status'; select pg_sleep(2); commit;"; } | $P -v ON_ERROR_STOP=1 >/dev/null ) &
sleep 0.7
OUT="$( { as $OWNER; echo "select rally100.review_reward('$RW', 'approve') ->'reward'->>'status'; commit;"; } | $P 2>&1 || true)"
wait
FINAL="$($P -c "select status || ' ' || (select count(*) from rally100.requirements where person_id = '$PX' and confirmed) from rally100.rewards where id = '$RW'")"
echo "$OUT" | grep -q "rally100: not_ready" && [ "$FINAL" = "in_progress 3" ] \
  || fail "race A2: an approval racing an untick (got '$OUT', final '$FINAL')"
pass "race A2 [6] an approval that waits for an untick in flight is refused not_ready; nothing is approved at 3 of 4"

# ------------------------------------------------ RACE B: pay, then close the rep
INC="$($P -c "select id from rally100.incentives where status = 'published' order by created_at limit 1")"
AW="$( { as $L1; echo "select rally100.award_incentive('$INC', '$R3', 'race prize', gen_random_uuid()) ->'reward'->>'id'; commit;"; } | $P | tail -1)"
[ -n "$AW" ] || fail "race B setup: no award"
( { as $OWNER; echo "select rally100.mark_pay_issued('$AW', '2026-11-03', 'cash') ->'reward'->>'status'; select pg_sleep(2); commit;"; } | $P -v ON_ERROR_STOP=1 >/dev/null ) &
sleep 0.7
OUT="$( { as $OWNER; echo "select rally100.close_rep_unpaid('$R3', 'left'); commit;"; } | $P 2>&1 || true)"
wait
FINAL="$($P -c "select status || ' ' || (reversed_at is null) from rally100.rewards where id = '$AW'")"
echo "$OUT" | grep -q '"closed"' && [ "$FINAL" = "paid true" ] \
  || fail "race B: close_rep_unpaid racing mark_pay_issued (got '$OUT', final '$FINAL')"
pass "race B [7] closing a rep while their pay is being issued waits, then leaves the paid award paid and unreversed"

# ------------------------------------------------ RACE C: close the rep, then approve
set -- $(setup_referral $R1 1901); PX=$1; RW=$2
[ -n "$RW" ] || fail "race C setup: no ready referral"
( { as $OWNER; echo "select rally100.close_rep_unpaid('$R1', 'left'); select pg_sleep(2); commit;"; } | $P -v ON_ERROR_STOP=1 >/dev/null ) &
sleep 0.7
OUT="$( { as $L1; echo "select rally100.review_reward('$RW', 'approve') ->'reward'->>'status'; commit;"; } | $P 2>&1 || true)"
wait
FINAL="$($P -c "select status || ' ' || (reversed_at is not null) from rally100.rewards where id = '$RW'")"
echo "$OUT" | grep -Eq "rally100: (reward_reversed|rep_closed)" && [ "$FINAL" = "ready true" ] \
  || fail "race C: an approval racing close_rep_unpaid (got '$OUT', final '$FINAL')"
pass "race C [5][6] an approval that waits for a closure in flight is refused; the reward stays unapproved and reversed"

echo "RACES: ALL GREEN ($N checks)"
