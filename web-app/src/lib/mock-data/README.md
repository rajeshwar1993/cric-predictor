# Mock Data — CricketData.org API Fixtures

These JSON files simulate CricketData.org API responses for local development.

## Structure

```
mock-data/
├── matches.json              # Series match list (all IPL 2026 fixtures)
├── squads/
│   ├── match-1.json          # Squad for Match 1 (RCB vs SRH)
│   └── match-2.json          # Squad for Match 2 (CSK vs MI)
├── scorecards/
│   ├── match-1/
│   │   ├── toss.json         # After toss
│   │   ├── powerplay.json    # After 6 overs
│   │   ├── innings-break.json # End of first innings
│   │   ├── mid-match.json    # During second innings
│   │   └── completed.json    # Final scorecard
│   └── match-2/
│       └── ...
└── README.md
```

## Usage

When `NEXT_PUBLIC_MOCK_MODE=true`, the cricket API client reads from these files
instead of making HTTP requests to api.cricapi.com.

## Adding New Fixtures

1. Copy an existing match folder (e.g., `scorecards/match-1/`)
2. Update team names, scores, and player data
3. Ensure the mock match ID matches what's seeded in the database

## Phase Snapshots

Each scorecard directory can have multiple phase snapshots:
- **toss.json** — Only tossWinner is populated
- **powerplay.json** — 6 overs of batting/bowling data
- **innings-break.json** — Complete first innings
- **mid-match.json** — Partial second innings
- **completed.json** — Full final scorecard

The cron mock uses these to simulate progressive resolution.
