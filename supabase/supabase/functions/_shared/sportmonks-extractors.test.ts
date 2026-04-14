// =============================================================================
// Unit Tests for Sportmonks Extractors
// Run with: cd supabase && deno test supabase/functions/_shared/sportmonks-extractors.test.ts
// =============================================================================

import {
  assertEquals,
  assertStrictEquals,
  assert,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import type {
  SmFixture,
  SmBatting,
  SmBowling,
  SmRun,
} from './sportmonks.ts';

import {
  isMatchFinished,
  mapToBracket,
  extractFirstWicketOver,
  extractFiftyScored,
  extractBowlerThreeWickets,
  extractTopScorer,
  extractTopWicketTaker,
  extractMostSixesPlayer,
  extractHomeTeamInningsScore,
  extractAwayTeamInningsScore,
  extractForScenario,
  extractLiveScorecard,
  type ExtractResult,
  type LiveScorecardData,
} from './sportmonks-extractors.ts';

// ---------------------------------------------------------------------------
// Test Helpers — minimal fixture factories
// ---------------------------------------------------------------------------

/** Create a minimal SmFixture with sensible defaults. Override as needed. */
function makeFixture(overrides: Partial<SmFixture> = {}): SmFixture {
  return {
    resource: 'fixtures',
    id: 1,
    league_id: 1,
    season_id: 1,
    stage_id: 1,
    round: '1',
    localteam_id: 100,
    visitorteam_id: 200,
    starting_at: '2026-04-11T14:00:00.000000Z',
    type: 'T20',
    live: false,
    status: 'NS',
    last_period: null,
    note: null,
    venue_id: null,
    toss_won_team_id: null,
    winner_team_id: null,
    draw_noresult: null,
    man_of_match_id: null,
    man_of_series_id: null,
    total_overs_played: null,
    elected: null,
    super_over: false,
    follow_on: false,
    localteam_dl_data: { score: null, overs: null, wickets_out: null },
    visitorteam_dl_data: { score: null, overs: null, wickets_out: null },
    rpc_overs: null,
    rpc_target: null,
    ...overrides,
  } as SmFixture;
}

/** Create a minimal SmBatting entry. */
function makeBatting(overrides: Partial<SmBatting> = {}): SmBatting {
  return {
    resource: 'batting',
    id: 1,
    sort: 1,
    fixture_id: 1,
    team_id: 100,
    active: false,
    scoreboard: 'S1',
    player_id: 1001,
    wicket_id: null,
    ball: 20,
    score_id: null,
    score: 30,
    four_x: 3,
    six_x: 1,
    catch_stump_player_id: null,
    runout_by_id: null,
    batsmanout_id: null,
    bowling_player_id: null,
    fow_score: 0,
    fow_balls: 0,
    rate: 150.0,
    updated_at: '2026-04-11T15:00:00.000000Z',
    ...overrides,
  } as SmBatting;
}

/** Create a minimal SmBowling entry. */
function makeBowling(overrides: Partial<SmBowling> = {}): SmBowling {
  return {
    resource: 'bowling',
    id: 1,
    sort: 1,
    fixture_id: 1,
    team_id: 100,
    active: false,
    scoreboard: 'S1',
    player_id: 2001,
    overs: 4,
    medians: 0,
    runs: 30,
    wickets: 1,
    wide: 0,
    noball: 0,
    rate: 7.5,
    updated_at: '2026-04-11T15:00:00.000000Z',
    ...overrides,
  } as SmBowling;
}

/** Create a minimal SmRun entry. */
function makeRun(overrides: Partial<SmRun> = {}): SmRun {
  return {
    resource: 'runs',
    id: 1,
    fixture_id: 1,
    team_id: 100,
    inning: 1,
    score: 180,
    wickets: 6,
    overs: 20,
    pp1: '0.1-6.0',
    pp2: null,
    pp3: null,
    updated_at: '2026-04-11T15:00:00.000000Z',
    ...overrides,
  } as SmRun;
}

// =============================================================================
// isMatchFinished
// =============================================================================

Deno.test('isMatchFinished', async (t) => {
  await t.step("returns true for 'finished'", () => {
    assertStrictEquals(isMatchFinished('finished'), true);
  });

  await t.step("returns true for 'Finished' (case-insensitive)", () => {
    assertStrictEquals(isMatchFinished('Finished'), true);
  });

  await t.step("returns true for 'FINISHED' (uppercase)", () => {
    assertStrictEquals(isMatchFinished('FINISHED'), true);
  });

  await t.step("returns true for 'won'", () => {
    assertStrictEquals(isMatchFinished('won'), true);
  });

  await t.step("returns true for 'Won'", () => {
    assertStrictEquals(isMatchFinished('Won'), true);
  });

  await t.step("returns true for 'draw'", () => {
    assertStrictEquals(isMatchFinished('draw'), true);
  });

  await t.step("returns true for 'Draw'", () => {
    assertStrictEquals(isMatchFinished('Draw'), true);
  });

  await t.step('returns false for null', () => {
    assertStrictEquals(isMatchFinished(null), false);
  });

  await t.step('returns false for undefined', () => {
    assertStrictEquals(isMatchFinished(undefined), false);
  });

  await t.step("returns false for empty string ''", () => {
    assertStrictEquals(isMatchFinished(''), false);
  });

  await t.step("returns false for 'NS' (not started)", () => {
    assertStrictEquals(isMatchFinished('NS'), false);
  });

  await t.step("returns false for '1st Innings'", () => {
    assertStrictEquals(isMatchFinished('1st Innings'), false);
  });

  await t.step("returns false for 'Innings Break'", () => {
    assertStrictEquals(isMatchFinished('Innings Break'), false);
  });

  await t.step("returns false for 'abandoned'", () => {
    assertStrictEquals(isMatchFinished('abandoned'), false);
  });
});

// =============================================================================
// mapToBracket
// =============================================================================

Deno.test('mapToBracket', async (t) => {
  // --- Exact match ---
  await t.step('exact match: value 0 matches "0"', () => {
    assertStrictEquals(mapToBracket(0, ['0', '1', '2', '3', '4+']), '0');
  });

  await t.step('exact match: value 1 matches "1"', () => {
    assertStrictEquals(mapToBracket(1, ['0', '1', '2', '3', '4+']), '1');
  });

  await t.step('exact match: value 3 matches "3"', () => {
    assertStrictEquals(mapToBracket(3, ['0', '1', '2', '3', '4+']), '3');
  });

  await t.step('exact match: value 5 does NOT match "3"', () => {
    assertStrictEquals(mapToBracket(5, ['0', '1', '2', '3']), null);
  });

  // --- Less-than ---
  await t.step('less-than: value 139 matches "<140"', () => {
    assertStrictEquals(
      mapToBracket(139, ['<140', '140-159', '160-179', '180-199', '200+']),
      '<140'
    );
  });

  await t.step('less-than: boundary value 140 does NOT match "<140"', () => {
    assertStrictEquals(
      mapToBracket(140, ['<140', '140-159', '160-179', '180-199', '200+']),
      '140-159'
    );
  });

  await t.step('less-than: value 0 matches "<140"', () => {
    assertStrictEquals(
      mapToBracket(0, ['<140', '140-159', '160-179', '180-199', '200+']),
      '<140'
    );
  });

  // --- Plus (greater-or-equal) ---
  await t.step('plus: value 200 matches "200+"', () => {
    assertStrictEquals(
      mapToBracket(200, ['<140', '140-159', '160-179', '180-199', '200+']),
      '200+'
    );
  });

  await t.step('plus: value 250 matches "200+"', () => {
    assertStrictEquals(
      mapToBracket(250, ['<140', '140-159', '160-179', '180-199', '200+']),
      '200+'
    );
  });

  await t.step('plus: boundary value 199 does NOT match "200+"', () => {
    assertStrictEquals(
      mapToBracket(199, ['<140', '140-159', '160-179', '180-199', '200+']),
      '180-199'
    );
  });

  await t.step('plus: value 4 matches "4+"', () => {
    assertStrictEquals(mapToBracket(4, ['0', '1', '2', '3', '4+']), '4+');
  });

  await t.step('plus: value 10 matches "4+"', () => {
    assertStrictEquals(mapToBracket(10, ['0', '1', '2', '3', '4+']), '4+');
  });

  // --- Range ---
  await t.step('range: value 140 matches "140-159"', () => {
    assertStrictEquals(
      mapToBracket(140, ['<140', '140-159', '160-179', '180-199', '200+']),
      '140-159'
    );
  });

  await t.step('range: value 159 matches "140-159"', () => {
    assertStrictEquals(
      mapToBracket(159, ['<140', '140-159', '160-179', '180-199', '200+']),
      '140-159'
    );
  });

  await t.step('range: value 160 matches "160-179"', () => {
    assertStrictEquals(
      mapToBracket(160, ['<140', '140-159', '160-179', '180-199', '200+']),
      '160-179'
    );
  });

  await t.step('range: wicket range "4-5" matches value 4', () => {
    assertStrictEquals(
      mapToBracket(4, ['0', '1', '2', '3', '4-5', '6+']),
      '4-5'
    );
  });

  await t.step('range: wicket range "4-5" matches value 5', () => {
    assertStrictEquals(
      mapToBracket(5, ['0', '1', '2', '3', '4-5', '6+']),
      '4-5'
    );
  });

  await t.step('range: value 6 matches "6+" not "4-5"', () => {
    assertStrictEquals(
      mapToBracket(6, ['0', '1', '2', '3', '4-5', '6+']),
      '6+'
    );
  });

  // --- No match ---
  await t.step('returns null when no bracket matches', () => {
    assertStrictEquals(mapToBracket(50, ['0', '1', '2', '3']), null);
  });

  await t.step('returns null for empty options array', () => {
    assertStrictEquals(mapToBracket(100, []), null);
  });
});

// =============================================================================
// extractFirstWicketOver
// =============================================================================

Deno.test('extractFirstWicketOver', async (t) => {
  await t.step('normal case: fow_balls=8.1 yields over 9', () => {
    const fixture = makeFixture({
      batting: [
        makeBatting({ scoreboard: 'S1', fow_balls: 8.1, player_id: 1001 }),
        makeBatting({ scoreboard: 'S1', fow_balls: 12.3, player_id: 1002 }),
      ],
    });
    const result = extractFirstWicketOver(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '9');
  });

  await t.step('edge case: fow_balls=0.1 yields over 1', () => {
    const fixture = makeFixture({
      batting: [
        makeBatting({ scoreboard: 'S1', fow_balls: 0.1, player_id: 1001 }),
      ],
    });
    const result = extractFirstWicketOver(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1');
  });

  await t.step('edge case: fow_balls=5.6 yields over 6', () => {
    const fixture = makeFixture({
      batting: [
        makeBatting({ scoreboard: 'S1', fow_balls: 5.6, player_id: 1001 }),
      ],
    });
    const result = extractFirstWicketOver(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '6');
  });

  await t.step('picks the minimum fow_balls among dismissed batsmen', () => {
    const fixture = makeFixture({
      batting: [
        makeBatting({ scoreboard: 'S1', fow_balls: 12.3, player_id: 1001 }),
        makeBatting({ scoreboard: 'S1', fow_balls: 3.2, player_id: 1002 }),
        makeBatting({ scoreboard: 'S1', fow_balls: 7.5, player_id: 1003 }),
      ],
    });
    const result = extractFirstWicketOver(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '4');
  });

  await t.step('no dismissed batsmen (all fow_balls=0) → not resolved', () => {
    const fixture = makeFixture({
      batting: [
        makeBatting({ scoreboard: 'S1', fow_balls: 0, player_id: 1001 }),
        makeBatting({ scoreboard: 'S1', fow_balls: 0, player_id: 1002 }),
      ],
    });
    const result = extractFirstWicketOver(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('empty batting array → not resolved', () => {
    const fixture = makeFixture({ batting: [] });
    const result = extractFirstWicketOver(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('no batting data → not resolved', () => {
    const fixture = makeFixture();
    const result = extractFirstWicketOver(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('only considers S1 (first innings) scoreboard entries', () => {
    const fixture = makeFixture({
      batting: [
        // S2 entry with a small fow_balls — should be ignored
        makeBatting({ scoreboard: 'S2', fow_balls: 1.1, player_id: 1001 }),
        makeBatting({ scoreboard: 'S1', fow_balls: 10.2, player_id: 1002 }),
      ],
    });
    const result = extractFirstWicketOver(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '11');
  });
});

// =============================================================================
// extractFiftyScored
// =============================================================================

Deno.test('extractFiftyScored', async (t) => {
  await t.step('"Yes" when any batting score >= 50 (mid-match)', () => {
    const fixture = makeFixture({
      status: '1st Innings',
      batting: [
        makeBatting({ score: 55, player_id: 1001 }),
        makeBatting({ score: 12, player_id: 1002 }),
      ],
    });
    const result = extractFiftyScored(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, 'Yes');
  });

  await t.step('"Yes" when score is exactly 50', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [makeBatting({ score: 50, player_id: 1001 })],
    });
    const result = extractFiftyScored(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, 'Yes');
  });

  await t.step('"No" only when status=finished and no 50', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ score: 49, player_id: 1001 }),
        makeBatting({ score: 30, player_id: 1002 }),
      ],
    });
    const result = extractFiftyScored(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, 'No');
  });

  await t.step('not resolved when mid-match and no 50 yet', () => {
    const fixture = makeFixture({
      status: '1st Innings',
      batting: [
        makeBatting({ score: 40, player_id: 1001 }),
        makeBatting({ score: 20, player_id: 1002 }),
      ],
    });
    const result = extractFiftyScored(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved when no batting data', () => {
    const fixture = makeFixture({ status: 'Finished' });
    const result = extractFiftyScored(fixture);
    assertStrictEquals(result.resolved, false);
  });
});

// =============================================================================
// extractBowlerThreeWickets
// =============================================================================

Deno.test('extractBowlerThreeWickets', async (t) => {
  await t.step('"Yes" when any bowler has 3+ wickets (mid-match)', () => {
    const fixture = makeFixture({
      status: '2nd Innings',
      bowling: [
        makeBowling({ wickets: 3, player_id: 2001 }),
        makeBowling({ wickets: 1, player_id: 2002 }),
      ],
    });
    const result = extractBowlerThreeWickets(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, 'Yes');
  });

  await t.step('"Yes" when bowler has exactly 3 wickets', () => {
    const fixture = makeFixture({
      status: 'Finished',
      bowling: [makeBowling({ wickets: 3, player_id: 2001 })],
    });
    const result = extractBowlerThreeWickets(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, 'Yes');
  });

  await t.step('"No" only when match finished and no bowler has 3+', () => {
    const fixture = makeFixture({
      status: 'Finished',
      bowling: [
        makeBowling({ wickets: 2, player_id: 2001 }),
        makeBowling({ wickets: 1, player_id: 2002 }),
      ],
    });
    const result = extractBowlerThreeWickets(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, 'No');
  });

  await t.step('not resolved when mid-match and no 3-wicket haul yet', () => {
    const fixture = makeFixture({
      status: '1st Innings',
      bowling: [
        makeBowling({ wickets: 2, player_id: 2001 }),
        makeBowling({ wickets: 0, player_id: 2002 }),
      ],
    });
    const result = extractBowlerThreeWickets(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved when no bowling data', () => {
    const fixture = makeFixture({ status: 'Finished' });
    const result = extractBowlerThreeWickets(fixture);
    assertStrictEquals(result.resolved, false);
  });
});

// =============================================================================
// extractTopScorer
// =============================================================================

Deno.test('extractTopScorer', async (t) => {
  await t.step('returns player with highest score when match finished', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ player_id: 1001, score: 45, ball: 30 }),
        makeBatting({ player_id: 1002, score: 78, ball: 55 }),
        makeBatting({ player_id: 1003, score: 60, ball: 40 }),
      ],
    });
    const result = extractTopScorer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1002');
  });

  await t.step('tiebreaker: same score → fewer balls wins', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ player_id: 1001, score: 70, ball: 50 }),
        makeBatting({ player_id: 1002, score: 70, ball: 40 }),
        makeBatting({ player_id: 1003, score: 70, ball: 55 }),
      ],
    });
    const result = extractTopScorer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1002');
  });

  await t.step('not resolved when match not finished', () => {
    const fixture = makeFixture({
      status: '2nd Innings',
      batting: [makeBatting({ player_id: 1001, score: 80, ball: 50 })],
    });
    const result = extractTopScorer(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved when no batting data', () => {
    const fixture = makeFixture({ status: 'Finished' });
    const result = extractTopScorer(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('single batsman returns that player', () => {
    const fixture = makeFixture({
      status: 'Won',
      batting: [makeBatting({ player_id: 1001, score: 10, ball: 15 })],
    });
    const result = extractTopScorer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1001');
  });

  await t.step('aggregates score across multiple batting entries (super over)', () => {
    // Player 1001 bats in main innings AND super over: 40 + 12 = 52 total
    // Player 1002 bats only in main innings: 45
    // Without aggregation, 1002 would "win" (45 > 40). With aggregation, 1001 wins (52 > 45).
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ player_id: 1001, score: 40, ball: 30, scoreboard: 'S1' }),
        makeBatting({ player_id: 1002, score: 45, ball: 35, scoreboard: 'S2' }),
        makeBatting({ player_id: 1001, score: 12, ball: 8, scoreboard: 'S3' }), // super over
      ],
    });
    const result = extractTopScorer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1001');
  });

  await t.step('aggregates balls for tiebreaker across entries', () => {
    // Player 1001: 30 + 10 = 40 runs, 20 + 5 = 25 balls
    // Player 1002: 40 runs in one entry, 30 balls
    // Same total score (40), 1001 has fewer total balls (25 < 30) → wins
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ player_id: 1001, score: 30, ball: 20, scoreboard: 'S1' }),
        makeBatting({ player_id: 1001, score: 10, ball: 5, scoreboard: 'S3' }),
        makeBatting({ player_id: 1002, score: 40, ball: 30, scoreboard: 'S2' }),
      ],
    });
    const result = extractTopScorer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1001');
  });
});

// =============================================================================
// extractTopWicketTaker
// =============================================================================

Deno.test('extractTopWicketTaker', async (t) => {
  await t.step('returns bowler with most wickets when match finished', () => {
    const fixture = makeFixture({
      status: 'Finished',
      bowling: [
        makeBowling({ player_id: 2001, wickets: 2, runs: 30 }),
        makeBowling({ player_id: 2002, wickets: 4, runs: 35 }),
        makeBowling({ player_id: 2003, wickets: 1, runs: 20 }),
      ],
    });
    const result = extractTopWicketTaker(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '2002');
  });

  await t.step('tiebreaker: same wickets → fewer runs wins', () => {
    const fixture = makeFixture({
      status: 'Finished',
      bowling: [
        makeBowling({ player_id: 2001, wickets: 3, runs: 40 }),
        makeBowling({ player_id: 2002, wickets: 3, runs: 25 }),
        makeBowling({ player_id: 2003, wickets: 3, runs: 35 }),
      ],
    });
    const result = extractTopWicketTaker(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '2002');
  });

  await t.step('not resolved when match not finished', () => {
    const fixture = makeFixture({
      status: '2nd Innings',
      bowling: [makeBowling({ player_id: 2001, wickets: 5, runs: 20 })],
    });
    const result = extractTopWicketTaker(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved when no bowling data', () => {
    const fixture = makeFixture({ status: 'Finished' });
    const result = extractTopWicketTaker(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('aggregates wickets across multiple bowling entries (super over)', () => {
    // Bowler 2001 bowls in main match AND super over: 2 + 1 = 3 wickets
    // Bowler 2002 bowls only in main match: 2 wickets
    // Without aggregation, they'd tie at 2. With aggregation, 2001 wins (3 > 2).
    const fixture = makeFixture({
      status: 'Finished',
      bowling: [
        makeBowling({ player_id: 2001, wickets: 2, runs: 30, scoreboard: 'S1' }),
        makeBowling({ player_id: 2002, wickets: 2, runs: 25, scoreboard: 'S2' }),
        makeBowling({ player_id: 2001, wickets: 1, runs: 8, scoreboard: 'S3' }), // super over
      ],
    });
    const result = extractTopWicketTaker(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '2001');
  });

  await t.step('aggregates runs for tiebreaker across entries', () => {
    // Bowler 2001: 2 + 1 = 3 wickets, 20 + 5 = 25 runs
    // Bowler 2002: 3 wickets in one entry, 30 runs
    // Same total wickets (3), 2001 has fewer total runs (25 < 30) → wins
    const fixture = makeFixture({
      status: 'Finished',
      bowling: [
        makeBowling({ player_id: 2001, wickets: 2, runs: 20, scoreboard: 'S1' }),
        makeBowling({ player_id: 2001, wickets: 1, runs: 5, scoreboard: 'S3' }),
        makeBowling({ player_id: 2002, wickets: 3, runs: 30, scoreboard: 'S2' }),
      ],
    });
    const result = extractTopWicketTaker(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '2001');
  });
});

// =============================================================================
// extractMostSixesPlayer
// =============================================================================

Deno.test('extractMostSixesPlayer', async (t) => {
  await t.step('returns player with most sixes in a single innings', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ player_id: 1001, six_x: 3, ball: 20 }),
        makeBatting({ player_id: 1002, six_x: 5, ball: 30 }),
        makeBatting({ player_id: 1003, six_x: 2, ball: 15 }),
      ],
    });
    const result = extractMostSixesPlayer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1002');
  });

  await t.step('aggregates sixes across both innings (same player_id)', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        // Player 1001: 2 sixes in first innings
        makeBatting({ player_id: 1001, six_x: 2, ball: 20, scoreboard: 'S1' }),
        // Player 1002: 3 sixes in first innings
        makeBatting({ player_id: 1002, six_x: 3, ball: 25, scoreboard: 'S1' }),
        // Player 1001: 3 sixes in second innings (super over or similar)
        // Total for 1001: 2+3=5, total for 1002: 3
        makeBatting({ player_id: 1001, six_x: 3, ball: 10, scoreboard: 'S2' }),
      ],
    });
    const result = extractMostSixesPlayer(fixture);
    assert(result.resolved);
    // 1001 has 5 sixes total (2+3), 1002 has 3
    if (result.resolved) assertStrictEquals(result.value, '1001');
  });

  await t.step('tiebreaker: same sixes → fewer balls wins', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ player_id: 1001, six_x: 4, ball: 30 }),
        makeBatting({ player_id: 1002, six_x: 4, ball: 20 }),
      ],
    });
    const result = extractMostSixesPlayer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1002');
  });

  await t.step('tiebreaker with aggregation: total balls across innings', () => {
    const fixture = makeFixture({
      status: 'Finished',
      batting: [
        makeBatting({ player_id: 1001, six_x: 2, ball: 15, scoreboard: 'S1' }),
        makeBatting({ player_id: 1001, six_x: 1, ball: 10, scoreboard: 'S2' }),
        // 1001 total: 3 sixes, 25 balls
        makeBatting({ player_id: 1002, six_x: 3, ball: 20, scoreboard: 'S1' }),
        // 1002 total: 3 sixes, 20 balls → 1002 wins tiebreak
      ],
    });
    const result = extractMostSixesPlayer(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '1002');
  });

  await t.step('not resolved when match not finished', () => {
    const fixture = makeFixture({
      status: '1st Innings',
      batting: [makeBatting({ player_id: 1001, six_x: 6, ball: 30 })],
    });
    const result = extractMostSixesPlayer(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved when no batting data', () => {
    const fixture = makeFixture({ status: 'Finished' });
    const result = extractMostSixesPlayer(fixture);
    assertStrictEquals(result.resolved, false);
  });
});

// =============================================================================
// extractHomeTeamInningsScore / extractAwayTeamInningsScore
// =============================================================================

Deno.test('extractHomeTeamInningsScore', async (t) => {
  await t.step('resolves when overs >= 20 (innings complete)', () => {
    const fixture = makeFixture({
      status: '2nd Innings',
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 20, score: 185, wickets: 7 })],
    });
    const result = extractHomeTeamInningsScore(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '185');
  });

  await t.step('resolves when wickets >= 10 (all out)', () => {
    const fixture = makeFixture({
      status: '2nd Innings',
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 17.3, score: 145, wickets: 10 })],
    });
    const result = extractHomeTeamInningsScore(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '145');
  });

  await t.step('resolves when match is finished regardless of overs', () => {
    const fixture = makeFixture({
      status: 'Finished',
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 15.2, score: 120, wickets: 5 })],
    });
    const result = extractHomeTeamInningsScore(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '120');
  });

  await t.step('not resolved when mid-innings (overs < 20, wickets < 10)', () => {
    const fixture = makeFixture({
      status: '1st Innings',
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 12.4, score: 95, wickets: 3 })],
    });
    const result = extractHomeTeamInningsScore(fixture);
    assertStrictEquals(result.resolved, false);
  });

  await t.step('uses team_id filter, not inning number', () => {
    // Home team bats second (inning 2) — should still resolve using team_id
    const fixture = makeFixture({
      status: 'Finished',
      localteam_id: 100,
      visitorteam_id: 200,
      runs: [
        makeRun({ team_id: 200, inning: 1, overs: 20, score: 175, wickets: 8 }),
        makeRun({ team_id: 100, inning: 2, overs: 18.3, score: 176, wickets: 4 }),
      ],
    });
    const result = extractHomeTeamInningsScore(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '176');
  });

  await t.step('not resolved when no runs data for home team', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 200, overs: 20, score: 180 })],
    });
    const result = extractHomeTeamInningsScore(fixture);
    assertStrictEquals(result.resolved, false);
  });
});

Deno.test('extractAwayTeamInningsScore', async (t) => {
  await t.step('resolves when overs >= 20', () => {
    const fixture = makeFixture({
      status: 'Innings Break',
      visitorteam_id: 200,
      runs: [makeRun({ team_id: 200, overs: 20, score: 195, wickets: 5 })],
    });
    const result = extractAwayTeamInningsScore(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '195');
  });

  await t.step('resolves when wickets >= 10', () => {
    const fixture = makeFixture({
      status: '2nd Innings',
      visitorteam_id: 200,
      runs: [makeRun({ team_id: 200, overs: 16.1, score: 130, wickets: 10 })],
    });
    const result = extractAwayTeamInningsScore(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '130');
  });

  await t.step('resolves when match finished', () => {
    const fixture = makeFixture({
      status: 'Won',
      visitorteam_id: 200,
      runs: [makeRun({ team_id: 200, overs: 14, score: 110, wickets: 6 })],
    });
    const result = extractAwayTeamInningsScore(fixture);
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '110');
  });

  await t.step('not resolved when mid-innings', () => {
    const fixture = makeFixture({
      status: '1st Innings',
      visitorteam_id: 200,
      runs: [makeRun({ team_id: 200, overs: 8, score: 60, wickets: 2 })],
    });
    const result = extractAwayTeamInningsScore(fixture);
    assertStrictEquals(result.resolved, false);
  });
});

// =============================================================================
// extractForScenario — Powerplay runs & wickets
// =============================================================================

Deno.test('extractForScenario — home_team_powerplay_runs', async (t) => {
  await t.step('resolves when overs first cross 6 (previousMaxOvers null)', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 6, score: 52, wickets: 1 })],
    });
    const result = extractForScenario('home_team_powerplay_runs', fixture, {
      homeTeamPreviousMaxOvers: null,
    });
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '52');
  });

  await t.step('resolves when overs cross 6 (previousMaxOvers < 6)', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 6.2, score: 55, wickets: 2 })],
    });
    const result = extractForScenario('home_team_powerplay_runs', fixture, {
      homeTeamPreviousMaxOvers: 5.4,
    });
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '55');
  });

  await t.step('not resolved when overs < 6', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 4.3, score: 35, wickets: 0 })],
    });
    const result = extractForScenario('home_team_powerplay_runs', fixture, {
      homeTeamPreviousMaxOvers: null,
    });
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved (guard) when previousMaxOvers >= 6 (already captured)', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 10, score: 85, wickets: 3 })],
    });
    const result = extractForScenario('home_team_powerplay_runs', fixture, {
      homeTeamPreviousMaxOvers: 6.0,
    });
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved when no runs data for team', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 200, overs: 6, score: 50, wickets: 1 })],
    });
    const result = extractForScenario('home_team_powerplay_runs', fixture, {
      homeTeamPreviousMaxOvers: null,
    });
    assertStrictEquals(result.resolved, false);
  });
});

Deno.test('extractForScenario — away_team_powerplay_runs', async (t) => {
  await t.step('resolves for away team when overs first cross 6', () => {
    const fixture = makeFixture({
      visitorteam_id: 200,
      runs: [makeRun({ team_id: 200, overs: 6.1, score: 48, wickets: 2 })],
    });
    const result = extractForScenario('away_team_powerplay_runs', fixture, {
      awayTeamPreviousMaxOvers: 5.5,
    });
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '48');
  });
});

Deno.test('extractForScenario — home_team_powerplay_wickets_lost', async (t) => {
  await t.step('resolves wickets at powerplay snapshot', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 6.0, score: 42, wickets: 2 })],
    });
    const result = extractForScenario('home_team_powerplay_wickets_lost', fixture, {
      homeTeamPreviousMaxOvers: null,
    });
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '2');
  });

  await t.step('not resolved when previousMaxOvers >= 6', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 12, score: 90, wickets: 4 })],
    });
    const result = extractForScenario('home_team_powerplay_wickets_lost', fixture, {
      homeTeamPreviousMaxOvers: 6.0,
    });
    assertStrictEquals(result.resolved, false);
  });

  await t.step('not resolved when overs < 6', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      runs: [makeRun({ team_id: 100, overs: 5.5, score: 38, wickets: 1 })],
    });
    const result = extractForScenario('home_team_powerplay_wickets_lost', fixture, {
      homeTeamPreviousMaxOvers: 4.0,
    });
    assertStrictEquals(result.resolved, false);
  });
});

Deno.test('extractForScenario — away_team_powerplay_wickets_lost', async (t) => {
  await t.step('resolves for away team when overs first cross 6', () => {
    const fixture = makeFixture({
      visitorteam_id: 200,
      runs: [makeRun({ team_id: 200, overs: 7.0, score: 55, wickets: 3 })],
    });
    const result = extractForScenario('away_team_powerplay_wickets_lost', fixture, {
      awayTeamPreviousMaxOvers: null,
    });
    assert(result.resolved);
    if (result.resolved) assertStrictEquals(result.value, '3');
  });
});

// =============================================================================
// parseScoreString & detectRunsRowRegressions
// =============================================================================
//
// NOTE: parseScoreString and detectRunsRowRegressions are defined in
// supabase/supabase/functions/live-poll-resolve-fixtures/index.ts as private
// (non-exported) functions. They cannot be imported and tested directly without
// modifying the source file. Per the constraints ("Do NOT modify any existing
// source files"), we document this gap here.
//
// If these functions were exported, the tests would look like:
//
// Deno.test('parseScoreString', async (t) => {
//   await t.step('"219/6" → {score:219, wickets:6}', () => {
//     assertEquals(parseScoreString('219/6'), { score: 219, wickets: 6 });
//   });
//   await t.step('null input → null', () => {
//     assertStrictEquals(parseScoreString(null), null);
//   });
//   await t.step('undefined → null', () => {
//     assertStrictEquals(parseScoreString(undefined), null);
//   });
//   await t.step('empty string → null', () => {
//     assertStrictEquals(parseScoreString(''), null);
//   });
//   await t.step('malformed "abc" → null', () => {
//     assertStrictEquals(parseScoreString('abc'), null);
//   });
//   await t.step('"219" (no slash) → null', () => {
//     assertStrictEquals(parseScoreString('219'), null);
//   });
//   await t.step('"219/6/3" (too many parts) → null', () => {
//     assertStrictEquals(parseScoreString('219/6/3'), null);
//   });
// });
//
// For detectRunsRowRegressions, we would mock console.warn and verify calls.
// =============================================================================

// =============================================================================
// extractLiveScorecard — non-striker identification
// =============================================================================

Deno.test('extractLiveScorecard — non-striker', async (t) => {
  await t.step('identifies non-striker when 1 active + 1 undismissed inactive', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 10.3, score: 85, wickets: 2 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: false, sort: 1, score: 15, ball: 12, fow_score: 30, fow_balls: 4.2 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 20, ball: 18, fow_score: 55, fow_balls: 7.1 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1003, active: true, sort: 3, score: 30, ball: 22, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1004, active: false, sort: 4, score: 15, ball: 10, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.striker_name, '1003');
    assertStrictEquals(result!.striker_score, '30 (22)');
    assertStrictEquals(result!.non_striker_name, '1004');
    assertStrictEquals(result!.non_striker_score, '15 (10)');
  });

  await t.step('no non-striker when 0 active batsmen (between deliveries)', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 10.3, score: 85, wickets: 1 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: false, sort: 1, score: 40, ball: 30, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 35, ball: 25, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.striker_name, null);
    assertStrictEquals(result!.non_striker_name, null);
  });

  await t.step('no non-striker when only 1 batting entry exists', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 0.3, score: 5, wickets: 0 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: true, sort: 1, score: 5, ball: 3, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.striker_name, '1001');
    assertStrictEquals(result!.striker_score, '5 (3)');
    assertStrictEquals(result!.non_striker_name, null);
    assertStrictEquals(result!.non_striker_score, null);
  });

  await t.step('picks highest sort among multiple undismissed inactive batsmen', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 5.0, score: 40, wickets: 0 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: true, sort: 1, score: 20, ball: 15, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 15, ball: 12, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1003, active: false, sort: 3, score: 5, ball: 3, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.non_striker_name, '1003');
  });

  await t.step('filters by scoreboard — ignores previous innings batsmen', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '2nd Innings',
      runs: [
        makeRun({ team_id: 200, inning: 1, overs: 20, score: 180, wickets: 7 }),
        makeRun({ team_id: 100, inning: 2, overs: 5.0, score: 40, wickets: 0 }),
      ],
      batting: [
        makeBatting({ team_id: 200, scoreboard: 'S1', player_id: 2001, active: false, sort: 1, score: 50, ball: 35, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S2', player_id: 1001, active: true, sort: 1, score: 25, ball: 18, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S2', player_id: 1002, active: false, sort: 2, score: 10, ball: 12, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.striker_name, '1001');
    assertStrictEquals(result!.non_striker_name, '1002');
  });
});

// =============================================================================
// extractLiveScorecard — current partnership
// =============================================================================

Deno.test('extractLiveScorecard — current partnership', async (t) => {
  await t.step('partnership with wickets fallen', () => {
    // Team score: 85, last wicket at 55 → partnership runs = 30
    // Team overs: 10.3 = 63 balls, last fow at 7.1 = 43 balls → partnership balls = 20
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 10.3, score: 85, wickets: 2 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: false, sort: 1, score: 15, ball: 12, fow_score: 30, fow_balls: 4.2 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 20, ball: 18, fow_score: 55, fow_balls: 7.1 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1003, active: true, sort: 3, score: 30, ball: 22, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1004, active: false, sort: 4, score: 15, ball: 10, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.current_partnership, '30 (20)');
  });

  await t.step('opening partnership (0 wickets fallen)', () => {
    // Team score: 40, 0 wickets → partnership = 40 runs
    // Team overs: 5.0 = 30 balls → partnership balls = 30
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 5.0, score: 40, wickets: 0 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: true, sort: 1, score: 20, ball: 15, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 15, ball: 12, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.current_partnership, '40 (30)');
  });

  await t.step('partnership at start of innings (0 score)', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 0.0, score: 0, wickets: 0 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: true, sort: 1, score: 0, ball: 0, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 0, ball: 0, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.current_partnership, '0 (0)');
  });

  await t.step('partnership null when no striker (between deliveries)', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 10.3, score: 85, wickets: 1 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: false, sort: 1, score: 40, ball: 30, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 35, ball: 25, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.current_partnership, null);
  });

  await t.step('partnership null when no batting data', () => {
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 5.0, score: 40, wickets: 0 })],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.current_partnership, null);
  });

  await t.step('uses highest fow_score for last wicket', () => {
    // Team score: 95, last fow at 55 → partnership runs = 40
    // Team overs: 12.0 = 72 balls, last fow at 7.1 = 43 balls → partnership balls = 29
    const fixture = makeFixture({
      localteam_id: 100,
      visitorteam_id: 200,
      status: '1st Innings',
      runs: [makeRun({ team_id: 100, inning: 1, overs: 12.0, score: 95, wickets: 2 })],
      batting: [
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1001, active: false, sort: 1, score: 15, ball: 12, fow_score: 30, fow_balls: 4.2 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1002, active: false, sort: 2, score: 20, ball: 18, fow_score: 55, fow_balls: 7.1 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1003, active: true, sort: 3, score: 35, ball: 25, fow_score: 0, fow_balls: 0 }),
        makeBatting({ team_id: 100, scoreboard: 'S1', player_id: 1004, active: false, sort: 4, score: 20, ball: 15, fow_score: 0, fow_balls: 0 }),
      ],
    });
    const result = extractLiveScorecard(fixture);
    assert(result !== null);
    assertStrictEquals(result!.current_partnership, '40 (29)');
  });
});
