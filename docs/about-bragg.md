# About Bragg

Bragg is a free, web-based social prediction game built for the Indian Premier League (IPL). The name is an intentional play on "brag" — the entire point is bragging rights. There's no real money, no betting, and no prizes. You predict, you compete, you talk trash.

## How It Works

You and your friends form a **squad** — a private group of up to 10 people. One person creates the squad and gets an invite code. Share the code, friends request to join, and an admin approves them. That's your crew for the season.

Before each IPL match, every squad member makes predictions across **16 scenarios** covering different aspects of the game:

- **Match outcome**: Who wins? Who wins the toss?
- **Player performance**: Top scorer, top wicket-taker, Player of the Match, most sixes
- **Match stats**: First innings score, total runs, powerplay score, powerplay wickets, total sixes, total wickets, first wicket over
- **Yes/No calls**: Will someone score 50+? Will a bowler take 3+ wickets? Will there be a super over?

Each scenario is worth between 5 and 20 points. You either get it right and earn the points, or you don't — no partial credit. Predictions lock 45 minutes before the match starts.

## Custom Scenarios

Squads can go beyond the 16 defaults. Any member can propose a custom scenario — something like "Will there be a run-out?" or "Will the captain score 30+?" — with custom options and point values. Admins approve or reject these. Once a member has started predicting on a match, no new scenarios can be added for that match.

## Scoring and Leaderboards

After a match ends, results are entered and predictions are scored automatically. Each squad has two views:

- **Match leaderboard**: Rankings for a single match. If two members tie, whoever submitted earlier wins.
- **Season standings**: Cumulative rankings across all matches, showing total points, accuracy percentage, points per match, and number of matches predicted.

Only approved squad members appear on leaderboards, and each squad's standings are completely independent — there's no cross-squad competition.

## Squad Administration

Every squad has an **owner** (the creator) and optional **admins**. Admins can approve or remove members, set custom prediction deadlines per match, manually lock predictions, enter match results, and moderate custom scenarios. The owner can additionally promote or demote admins. This gives each squad autonomy over how strictly or casually they play.

## Who It's For

Bragg is designed for friend groups who follow the IPL and want a structured, low-stakes way to compete with each other. It's mobile-first, works entirely in the browser, and requires nothing more than an email to sign up (magic link authentication — no passwords). Users must be 18 or older.

## Technical Overview

The app is built with Next.js and hosted on Vercel. Supabase handles authentication, the Postgres database, and real-time features. Match data comes from a third-party cricket API. The frontend uses Tailwind CSS and shadcn/ui components.
