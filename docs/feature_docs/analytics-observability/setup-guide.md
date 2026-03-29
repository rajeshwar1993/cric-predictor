# Setup Guide: Analytics & Observability

**Date**: 2026-03-29
**Author**: Documentation Writer Agent
**Audience**: Developers and PMs setting up or using the Bragg analytics infrastructure
**Prerequisites**: Access to the Bragg web-app codebase, a Vercel account, and admin access to create PostHog and Firebase projects

---

## Table of Contents

- [Part 1: PostHog Setup](#part-1-posthog-setup)
- [Part 2: Firebase Analytics Setup](#part-2-firebase-analytics-setup)
- [Part 3: Key Metrics Tracking Guide](#part-3-key-metrics-tracking-guide)
- [Part 4: Maintenance](#part-4-maintenance)

---

## Part 1: PostHog Setup

Bragg already has a working PostHog integration. This section covers how to verify it, configure dashboards, and set up alerts.

### 1.1 Verify the Existing PostHog Project

The app uses PostHog Cloud (US region). The integration has two sides: a client-side SDK (`posthog-js`) initialized in `PostHogProvider`, and a server-side SDK (`posthog-node`) used in server actions.

#### Step 1: Confirm Your PostHog Project Exists

1. Go to [https://us.posthog.com](https://us.posthog.com) and sign in.
2. You should see the Bragg project in the project selector (top-left). If you do not have a project yet, create one:
   - Click **New project**.
   - Name it `Bragg - Production` (or `Bragg - Development` for local work).
   - Select the **US** region.
   - Click **Create project**.
3. From the project settings, copy the **Project API Key**. It looks like `phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

#### Step 2: Set Environment Variables

The app reads two PostHog variables. Set them in your `.env.local` file (for local development) or in Vercel (for deployed environments).

| Variable | Value | Example |
|----------|-------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Your PostHog project API key | `phc_abc123...` |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog API host (US cloud) | `https://us.i.posthog.com` |

**For local development** -- add to `web-app/.env.local`:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**For Vercel (production/preview)** -- see [Section 1.6](#16-vercel-environment-variable-setup).

#### Step 3: Verify Events Are Reaching PostHog

1. Start the dev server: `cd web-app && npm run dev`
2. Open `http://localhost:3000` in your browser.
3. Navigate through a few pages (dashboard, a group page, etc.).
4. In PostHog, go to **Activity** > **Live Events** (or **Data Management** > **Events**).
5. You should see `$pageview` events appearing within 30 seconds. Each event will show the URL path and the distinct ID.

**What you should see**: A stream of events with names like `$pageview`, `$pageleave`, `prediction_submitted`, etc. If PostHog debug mode is active (it is in development), you will also see `[PostHog.js]` messages in the browser console showing each event as it fires.

**If no events appear**:
- Check the browser console for errors related to PostHog or Content Security Policy (CSP).
- Confirm `NEXT_PUBLIC_POSTHOG_KEY` is set and not empty. The app silently no-ops if the key is missing.
- Confirm you are not on `/privacy` or `/terms` -- these routes opt out of PostHog tracking by design.
- Check if an ad blocker is blocking requests to `us.i.posthog.com`. Try in an incognito window with extensions disabled.

#### Step 4: Verify Server-Side Events

Server actions use `posthog-node` to fire events from the server. These appear in PostHog with the property `$lib: "posthog-node"` and `source: "server_action"`.

1. In the running dev app, perform an action that fires a server event. Examples:
   - Submit a prediction (fires `prediction_submitted`).
   - Create a group (fires `group_created`).
   - Complete onboarding (fires `auth_onboarding_completed`).
2. In PostHog **Live Events**, filter by the event name. Server events will have `source: server_action` in their properties.

**If server events are missing**:
- Check the terminal running `npm run dev` for any errors related to `posthog-node`.
- The server-side client uses `flushAt: 1` and `flushInterval: 0`, meaning events flush immediately. There should be no delay.

### 1.2 PostHog Dashboard Configuration

PostHog organizes analytics into **Dashboards**, each containing multiple **Insights** (charts, tables, funnels). Below are the four dashboards to create.

#### Creating a Dashboard

1. In PostHog, click **Dashboards** in the left sidebar.
2. Click **+ New dashboard**.
3. Give it a name (e.g., "User Behavior").
4. Click **Create**.
5. Inside the dashboard, click **+ Add insight** to add charts.

### 1.3 Dashboard: User Behavior

This dashboard answers: What are users doing? Which features are popular? How are predictions flowing?

#### Insight 1: Daily Page Views (Trend)

1. Click **+ Add insight** > **Trends**.
2. **Event**: `$pageview`.
3. **Date range**: Last 30 days.
4. **Interval**: Day.
5. Click **Save**.

You should see a line chart of daily page views.

#### Insight 2: Feature Usage Breakdown (Trend, grouped)

1. **+ Add insight** > **Trends**.
2. Add these events as separate series (click **+ Add graph series** for each):
   - `prediction_submitted`
   - `prediction_pick_changed`
   - `group_created`
   - `group_join_requested`
   - `scenario_custom_created`
   - `group_invite_copied`
   - `group_invite_shared`
3. **Date range**: Last 30 days.
4. **Interval**: Day.
5. Click **Save**.

This shows which features are used most and least. Look for features with zero or near-zero usage -- those may need UX improvements or removal.

#### Insight 3: Prediction Patterns (Trend, breakdown by group)

1. **+ Add insight** > **Trends**.
2. **Event**: `prediction_submitted`.
3. **Breakdown**: Click **+ Add breakdown** > Property: `group_id`.
4. **Date range**: Last 14 days.
5. Click **Save**.

This reveals which groups are most active. A group with declining predictions may have disengaged members.

#### Insight 4: Prediction Funnel

1. **+ Add insight** > **Funnels**.
2. Add steps in order:
   - Step 1: `$pageview` with filter `$current_url contains /predict/`
   - Step 2: `prediction_pick_changed`
   - Step 3: `prediction_submitted`
3. **Conversion window**: 30 minutes.
4. **Date range**: Last 30 days.
5. Click **Save**.

This funnel shows: Of users who view the predict page, how many change a pick, and how many submit? A large drop-off between steps 1 and 2 suggests the predict UI is confusing. A drop-off between steps 2 and 3 suggests users change picks but do not submit.

#### Insight 5: Session Duration Distribution (Trend)

PostHog automatically tracks session duration. To visualize it:

1. **+ Add insight** > **Trends**.
2. **Event**: `$pageview`.
3. Click **Property filter** > `$session_duration` > Aggregate as **Average**.
4. **Interval**: Day.
5. Click **Save**.

Alternatively, use **Web Analytics** (PostHog sidebar) for a pre-built sessions overview if your plan includes it.

### 1.4 Dashboard: Error Tracking

This dashboard answers: What errors are happening? How often? Which pages are affected?

#### Insight 1: Error Events Over Time (Trend)

1. **+ Add insight** > **Trends**.
2. Add two event series:
   - `error_boundary_caught`
   - `unhandled_error`
3. **Date range**: Last 30 days.
4. **Interval**: Day.
5. Click **Save**.

A spike in errors correlates with a bad deployment or an external service outage.

#### Insight 2: Error Messages Table

1. **+ Add insight** > **Trends**.
2. **Event**: `error_boundary_caught`.
3. Click **Breakdown** > Property: `error_message`.
4. **Display**: Table.
5. **Date range**: Last 7 days.
6. Click **Save**.

This shows the most common error messages. Prioritize fixing the top 3.

#### Insight 3: Errors by Page (Breakdown)

1. **+ Add insight** > **Trends**.
2. **Event**: `error_boundary_caught`.
3. **Breakdown**: Property `page_path`.
4. **Date range**: Last 7 days.
5. Click **Save**.

If one page dominates, there is a localized bug on that route.

#### Insight 4: Error Rate (Formula)

1. **+ Add insight** > **Trends**.
2. Series A: `error_boundary_caught` (total count).
3. Series B: `$pageview` (total count).
4. Click **Enable formula mode** and enter: `A / B * 100`.
5. **Interval**: Day.
6. Click **Save**.

This gives you the percentage of page views that result in an error boundary catch. A healthy app should be well under 1%.

#### Insight 5: Server-Side Errors (log transport)

1. **+ Add insight** > **Trends**.
2. **Event**: `error_logged`.
3. **Breakdown**: Property `operation`.
4. **Date range**: Last 7 days.
5. Click **Save**.

The `error_logged` event comes from the logger transport and includes structured context (`layer`, `operation`, `error_message`). This captures server-side errors from DAL calls, server actions, and other backend operations.

### 1.5 Dashboard: Performance

This dashboard answers: How fast is the app? Are Core Web Vitals passing? Which pages are slow?

#### Insight 1: Core Web Vitals -- LCP (Trend)

1. **+ Add insight** > **Trends**.
2. **Event**: `web_vitals_lcp`.
3. **Aggregation**: Average of property `value`.
4. **Interval**: Day.
5. **Date range**: Last 30 days.
6. Click **Save**.

**Target**: LCP under 2500ms is "good". Over 4000ms is "poor".

#### Insight 2: Core Web Vitals -- INP (Trend)

1. Same as above but with event `web_vitals_inp`.
2. **Target**: INP under 200ms is "good". Over 500ms is "poor".

#### Insight 3: Core Web Vitals -- CLS (Trend)

1. Same as above but with event `web_vitals_cls`.
2. **Target**: CLS under 0.1 is "good". Over 0.25 is "poor".

#### Insight 4: Web Vitals Rating Distribution (Breakdown)

1. **+ Add insight** > **Trends**.
2. **Event**: `web_vitals_lcp`.
3. **Breakdown**: Property `rating` (values: `good`, `needs-improvement`, `poor`).
4. **Display**: Stacked area or pie chart.
5. Click **Save**.

Repeat for `web_vitals_inp` and `web_vitals_cls`. The goal is to have >75% of values rated "good" (this is the threshold for passing Core Web Vitals in Google Search Console).

#### Insight 5: Slowest Pages by LCP (Table)

1. **+ Add insight** > **Trends**.
2. **Event**: `web_vitals_lcp`.
3. **Aggregation**: P95 of property `value`.
4. **Breakdown**: Property `page_path`.
5. **Display**: Table.
6. Click **Save**.

This reveals which routes have the worst Largest Contentful Paint. Focus optimization on the top 3 slowest pages.

#### Insight 6: Server Action Duration (Trend)

1. **+ Add insight** > **Trends**.
2. **Event**: `server_action_duration`.
3. **Aggregation**: Average of property `duration_ms`.
4. **Breakdown**: Property `action_name`.
5. **Date range**: Last 14 days.
6. Click **Save**.

Track which server actions are slowest. Any action consistently above 3000ms is flagged as slow by the `withTiming` wrapper.

### 1.6 Vercel Environment Variable Setup

For production and preview deployments, set environment variables in Vercel:

1. Go to [vercel.com](https://vercel.com) and open the Bragg project.
2. Navigate to **Settings** > **Environment Variables**.
3. Add the following variables:

| Variable | Environment | Value |
|----------|------------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Production | Your production PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Preview | Your development/staging PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | All | `https://us.i.posthog.com` |

**Important**: Use separate PostHog projects for production and development/preview. This prevents test data from polluting production analytics. In PostHog, create two projects: `Bragg - Production` and `Bragg - Development`. Each project has its own API key.

4. Click **Save** for each variable.
5. Redeploy the app for the variables to take effect.

### 1.7 Setting Up Alerts in PostHog

PostHog supports alerts that notify you when a metric crosses a threshold.

#### Alert: Error Rate Spike

1. Open the **Error Tracking** dashboard.
2. On the "Error Events Over Time" insight, click the **three-dot menu** (top-right of the insight card) > **Subscribe** > **Create alert**.
3. Configure:
   - **Name**: "Error spike alert"
   - **Condition**: When daily total of `error_boundary_caught` exceeds 50 (adjust based on your baseline).
   - **Notification**: Email or Slack webhook.
   - **Frequency**: Check every 1 hour.
4. Click **Create**.

#### Alert: Performance Degradation

1. Open the **Performance** dashboard.
2. On the LCP trend insight, create an alert:
   - **Condition**: When average `value` of `web_vitals_lcp` exceeds 4000 (ms, "poor" threshold).
   - **Notification**: Email or Slack.
   - **Frequency**: Check every 6 hours.

#### Alert: Zero Events (Service Down)

1. Create a new insight: **Trends** > `$pageview` > Last 1 hour > Total count.
2. Create an alert:
   - **Condition**: When total count drops below 1 (meaning no page views in the last hour during expected traffic hours).
   - **Notification**: Email or Slack.

**Note on PostHog plan**: Alerts require a PostHog paid plan. On the free tier, you can manually check dashboards instead. The free tier supports 1M events/month.

### 1.8 Recommended: PostHog Reverse Proxy via Vercel Rewrites

**Current state**: The app makes direct API calls from the browser to `us.i.posthog.com`. Ad blockers commonly block these requests, resulting in data loss.

**Recommended setup (v2)**: Route PostHog requests through a first-party path using Vercel rewrites. This makes PostHog traffic indistinguishable from normal app traffic.

To configure this in the future, add the following to `next.config.ts`:

```typescript
// In the rewrites() section of next.config.ts
async rewrites() {
  return [
    {
      source: "/_ph/static/:path*",
      destination: "https://us-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/_ph/:path*",
      destination: "https://us.i.posthog.com/:path*",
    },
  ];
},
```

Then update the PostHog host env variable:

```
NEXT_PUBLIC_POSTHOG_HOST=/_ph
```

And update the CSP to allow `connect-src 'self'` (which it already does).

This is documented as a **v2 recommendation** and is not implemented in the initial release.

---

## Part 2: Firebase Analytics Setup

Firebase Analytics is new to the project. It provides a second analytics platform (Google Analytics 4 under the hood) for cross-referencing data with PostHog and accessing Google's reporting ecosystem.

### 2.1 Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com).
2. Click **Create a project** (or **Add project**).
3. **Project name**: Enter `bragg-production` (or `bragg-development` for a dev project).
   - Firebase will suggest a globally unique project ID. Accept it or customize.
4. **Google Analytics**: On the "Google Analytics for your Firebase project" step, toggle it **ON**.
   - Select or create a Google Analytics account. If you already have a GA account, select it. Otherwise, create a new one named "Bragg Analytics".
   - Accept the default settings.
5. Click **Create project**. Wait for provisioning to complete (about 30 seconds).
6. Click **Continue** when it finishes.

You should see the Firebase console dashboard for your new project.

**Important**: Create separate Firebase projects for production and development, just like PostHog. This keeps test data out of production reports.

### 2.2 Add a Web App to the Firebase Project

1. From the Firebase console dashboard, click the **web icon** (looks like `</>`) to add a web app. If you do not see it, click the gear icon > **Project settings** > **General** tab > scroll to "Your apps" > **Add app** > **Web**.
2. **App nickname**: Enter `Bragg Web App`.
3. **Firebase Hosting**: Leave unchecked (the app is deployed on Vercel, not Firebase Hosting).
4. Click **Register app**.
5. Firebase will show you a code snippet with the configuration values. You will see something like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "bragg-production.firebaseapp.com",
  projectId: "bragg-production",
  storageBucket: "bragg-production.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-XXXXXXXXXX"
};
```

6. **Copy these values** -- you need them for environment variables. The key fields are:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`
   - `measurementId`

7. Click **Continue to console**.

### 2.3 Set Environment Variables

Add the Firebase config values to your environment. The app reads these as optional variables -- it works fine without them (Firebase silently no-ops when unconfigured).

**For local development** -- add to `web-app/.env.local`:

```
# Firebase Analytics
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bragg-development.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bragg-development
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**For Vercel (production/preview)** -- add these in **Vercel** > **Settings** > **Environment Variables**:

| Variable | Environment | Value |
|----------|------------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Production | Your production Firebase API key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Preview | Your development Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Production | `bragg-production.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Preview | `bragg-development.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Production | `bragg-production` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Preview | `bragg-development` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Production | Your production Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Preview | Your development Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Production | `G-XXXXXXXXXX` (production) |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Preview | `G-YYYYYYYYYY` (development) |

### 2.4 Verify Events Appear in Firebase Console

After setting the environment variables and deploying (or running locally):

1. Start the app: `cd web-app && npm run dev`
2. Open `http://localhost:3000` and navigate through a few pages. Submit a prediction or create a group.
3. Go to the Firebase console: [https://console.firebase.google.com](https://console.firebase.google.com).
4. Select your project.
5. In the left sidebar, click **Analytics** > **Realtime**.

**What you should see**: Within 1-2 minutes, the Realtime view will show:
- **Users in the last 30 minutes**: At least 1 (you).
- **Event count by event name**: You should see events like `page_view`, `prediction_submitted`, `group_created`, etc.
- **Users by country**: Your current location.

**If no events appear**:
- Check the browser console for errors. Look for CSP violations mentioning `google-analytics.com` or `googletagmanager.com`. If present, the CSP update in `next.config.ts` is missing or incorrect.
- Confirm all 5 `NEXT_PUBLIC_FIREBASE_*` variables are set. If any is missing, Firebase silently returns `null` during initialization and no events fire.
- Firebase events may take up to 5 minutes to appear in Realtime for the first time. Be patient on first setup.
- Check if an ad blocker is blocking Google Analytics domains. Try in an incognito window.

**Note on Firebase debug mode**: For real-time debugging during development, you can enable Firebase Analytics debug mode by opening the browser console and running:

```javascript
// Enable debug mode (events appear in Firebase DebugView)
localStorage.setItem('debug_mode', 'true');
```

Then in the Firebase console, go to **Analytics** > **DebugView**. Events will appear in real-time with full parameter details. Remember to remove this for production testing.

### 2.5 Setting Up Key Reports in Firebase

Firebase Analytics provides several built-in reporting tools. Here is how to configure the most useful ones.

#### 2.5.1 Realtime Analytics

Already covered in Section 2.4. The Realtime view is at **Analytics** > **Realtime** in the Firebase console.

**When to use it**: Immediately after a deployment to verify events are flowing. During IPL match hours to see live user activity. When debugging an issue to confirm events fire as expected.

#### 2.5.2 User Engagement Reports

1. In Firebase console, go to **Analytics** > **Reports** > **Engagement**.
2. You will see pre-built reports:
   - **Engagement overview**: Average engagement time, engaged sessions per user, and engagement rate.
   - **Events**: A table of all events with their count and user count. Click any event to drill into its parameters.
   - **Conversions**: Events you have marked as conversions (see below).
   - **Pages and screens**: Most viewed pages, ranked by engagement time.

**Marking key events as conversions**:

1. Go to **Analytics** > **Events**.
2. Find `prediction_submitted` in the event list.
3. Toggle the **Mark as conversion** switch (right side).
4. Repeat for `group_created` and `auth_onboarding_completed`.

These now appear in the **Conversions** report and can be used for funnel analysis in the Explore section.

#### 2.5.3 Event Tracking Reports

1. Go to **Analytics** > **Events**.
2. You will see a table of all events received, with columns:
   - **Event name**: The event constant from `ANALYTICS_EVENTS` (e.g., `prediction_submitted`).
   - **Count**: Total times fired in the selected date range.
   - **Users**: Unique users who fired the event.
3. Click on any event name to see its parameters. For example, clicking `prediction_submitted` shows the distribution of `group_id`, `match_id`, and `prediction_count` values.

**Custom report: Event comparison**

1. Go to **Analytics** > **Explore** (or **Analytics Hub** if using GA4 directly).
2. Click **Blank** to create a new exploration.
3. Add dimensions: `Event name`.
4. Add metrics: `Event count`, `Total users`.
5. Drag `Event name` to Rows and metrics to Values.
6. Filter to show only prediction-related events: `prediction_submitted`, `prediction_pick_changed`, `predict_page_viewed`.
7. Set the date range to Last 7 days.
8. Name it "Prediction Event Comparison" and save.

#### 2.5.4 Audience Segmentation

Firebase Audiences let you define user segments for analysis.

**Audience: Active Predictors**

1. Go to **Analytics** > **Audiences** > **New audience**.
2. **Name**: "Active Predictors".
3. **Condition**: Add condition > Event: `prediction_submitted` > in the last 7 days.
4. Click **Save**.

**Audience: New Users (this week)**

1. **New audience**.
2. **Name**: "New Users This Week".
3. **Condition**: Add condition > `first_open` > in the last 7 days.
4. Click **Save**.

**Audience: Group Creators**

1. **New audience**.
2. **Name**: "Group Creators".
3. **Condition**: Add condition > Event: `group_created` > at any point.
4. Click **Save**.

These audiences appear in reports as segmentation filters and in the **Audiences** dashboard showing their size over time.

### 2.6 Google Analytics 4 (GA4) Integration

Firebase Analytics IS Google Analytics 4 under the hood. They share the same backend. When you enabled Google Analytics during Firebase project creation (step 2.1), a linked GA4 property was automatically created.

**Accessing the full GA4 interface**:

1. Go to [https://analytics.google.com](https://analytics.google.com).
2. You should see the GA4 property linked to your Firebase project (e.g., "Bragg Analytics").
3. GA4 provides additional reporting capabilities:
   - **Explorations**: Build custom freeform, funnel, path, and segment overlap reports.
   - **Advertising**: If you ever run ads, attribution data flows here.
   - **Admin**: Configure data retention, data filters, and user management.

**GA4 Funnel Exploration (alternative to PostHog funnels)**:

1. In GA4, go to **Explore** > **Funnel exploration**.
2. Add steps:
   - Step 1: Event = `page_view` with parameter `page_location` containing `/predict/`.
   - Step 2: Event = `prediction_pick_changed`.
   - Step 3: Event = `prediction_submitted`.
3. Set the date range and click **Apply**.
4. Name the exploration "Prediction Funnel" and save.

The GA4 funnel visualization shows drop-off rates between steps, similar to PostHog but with Google's visualization style.

**Key difference from PostHog**: GA4 reports have a 24-48 hour processing delay for non-realtime data. PostHog processes events in near real-time. Use PostHog for day-of analysis and GA4/Firebase for weekly/monthly trend reports.

---

## Part 3: Key Metrics Tracking Guide

This section maps common questions to the specific steps needed to answer them in PostHog or Firebase.

### 3.1 For PM: Product Questions

#### "How many users made predictions today?"

**PostHog (fastest)**:
1. Go to **Insights** > **New insight** > **Trends**.
2. **Event**: `prediction_submitted`.
3. **Aggregation**: Unique users.
4. **Date range**: Today.
5. The number shown is the count of distinct users who submitted at least one prediction today.

**Firebase**:
1. Go to **Analytics** > **Events**.
2. Find `prediction_submitted`.
3. The **Users** column shows the count for the selected date range. Set the date range to "Today".

---

#### "What is the prediction completion rate?"

This means: of users who view the predict page, what percentage actually submit predictions?

**PostHog**:
1. Use the **Prediction Funnel** from Section 1.3, Insight 4.
2. The funnel shows three steps:
   - Step 1: `$pageview` where URL contains `/predict/` (users who viewed the predict page).
   - Step 2: `prediction_pick_changed` (users who interacted with the form).
   - Step 3: `prediction_submitted` (users who submitted).
3. The **overall conversion rate** (step 1 to step 3) is the prediction completion rate.
4. If the rate is 30%, it means 70% of users who view the predict page leave without submitting.

**What to do with this number**: If completion rate is below 50%, investigate:
- Is the predict page confusing? (Check step 1 to step 2 drop-off -- users are not interacting with the form.)
- Are users changing picks but not submitting? (Check step 2 to step 3 drop-off -- the submit button may be unclear or the process feels unfinished.)

---

#### "Which features are most/least used?"

**PostHog**:
1. Use the **Feature Usage Breakdown** insight from Section 1.3, Insight 2.
2. The chart shows daily usage of each key feature event. Features at the bottom of the chart (or with zero data points) are underused.

Alternatively, for a quick summary:
1. Go to **Insights** > **New insight** > **Trends**.
2. Add each feature event: `prediction_submitted`, `group_created`, `scenario_custom_created`, `group_invite_copied`, `group_invite_shared`.
3. **Aggregation**: Total count.
4. **Date range**: Last 30 days.
5. **Display**: Table.
6. Sort by count descending. The top row is the most-used feature; the bottom is the least-used.

**Firebase**:
1. Go to **Analytics** > **Events**.
2. Sort by **Count** descending.
3. Filter out automatic events (`session_start`, `first_visit`, `page_view`).
4. The remaining custom events are ranked by usage.

---

#### "Where do users drop off?"

**PostHog -- Engagement Flow Funnel**:

This funnel tracks the overall user journey through the app.

1. Go to **Insights** > **New insight** > **Funnels**.
2. Add steps:
   - Step 1: `$pageview` where URL is `/login` (user arrives at login).
   - Step 2: `$pageview` where URL is `/dashboard` (user reaches dashboard after auth).
   - Step 3: `$pageview` where URL contains `/group/` (user enters a group).
   - Step 4: `$pageview` where URL contains `/predict/` (user views a prediction page).
   - Step 5: `prediction_submitted` (user submits a prediction).
3. **Conversion window**: 1 day.
4. **Date range**: Last 30 days.
5. Click **Calculate**.

The funnel visualization shows the percentage of users who complete each step. The largest drop-off between steps indicates where users abandon the flow. Common findings:
- Large drop between steps 2 and 3: Users log in but never join/visit a group. They may not understand what to do next.
- Large drop between steps 3 and 4: Users visit a group but do not predict. They may be confused about how predictions work, or there may be no active matches.
- Large drop between steps 4 and 5: Users view the predict page but do not submit. This is the same as the prediction completion rate issue above.

---

### 3.2 For Developer: Technical Questions

#### "What errors are happening in production?"

**PostHog**:
1. Open the **Error Tracking** dashboard (Section 1.4).
2. The "Error Messages Table" (Insight 2) shows the most common error messages.
3. Click on any error message to see the individual events with full properties: `error_stack`, `error_context`, `page_path`.

For server-side errors:
1. Look at the `error_logged` event (from the logger transport).
2. Filter by `level: error`.
3. Breakdown by `operation` to see which server action or DAL call is failing.

**Quick investigation steps**:
1. In PostHog, go to **Activity** > **Events**.
2. Filter: Event name = `error_boundary_caught` OR `unhandled_error` OR `error_logged`.
3. Set time range to "Last 24 hours".
4. Click on individual events to inspect `error_message`, `error_stack`, and `page_path`.
5. Look at the `error_context` property to understand where the error was caught:
   - `"global"`: Root layout crashed (`global-error.tsx`).
   - `"app"`: Route-level error (`error.tsx`).
   - `"group"`: Group-specific error (`group/[groupId]/error.tsx`).

---

#### "Which pages are slow?"

**PostHog**:
1. Open the **Performance** dashboard (Section 1.5).
2. The "Slowest Pages by LCP" table (Insight 5) ranks pages by their P95 Largest Contentful Paint.
3. Pages over 2500ms need optimization. Pages over 4000ms are critically slow.

**For page load times specifically**:
1. Go to **Insights** > **New insight** > **Trends**.
2. **Event**: `page_load_time`.
3. **Aggregation**: Average of property `full_load_ms`.
4. **Breakdown**: Property `page_path`.
5. **Date range**: Last 7 days.
6. **Display**: Table.
7. Sort by value descending.

---

#### "What is the Core Web Vitals score?"

**PostHog**:
1. Open the **Performance** dashboard.
2. Check the three CWV insights (LCP, INP, CLS).
3. For a pass/fail assessment, check the **Web Vitals Rating Distribution** (Insight 4). If more than 75% of values are "good" for all three metrics, you pass CWV.

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2500ms | 2500-4000ms | > 4000ms |
| INP | < 200ms | 200-500ms | > 500ms |
| CLS | < 0.1 | 0.1-0.25 | > 0.25 |

**Firebase (alternative)**:
1. Go to **Analytics** > **Events**.
2. Click on `web_vitals_lcp`. Inspect the `value` parameter distribution.
3. Repeat for `web_vitals_inp` and `web_vitals_cls`.

---

#### "Are server actions timing out?"

**PostHog**:
1. Go to **Insights** > **New insight** > **Trends**.
2. **Event**: `server_action_duration`.
3. **Aggregation**: P95 of property `duration_ms`.
4. **Breakdown**: Property `action_name`.
5. **Date range**: Last 7 days.

Actions approaching the Vercel serverless timeout (default 10 seconds for Hobby, 60 seconds for Pro) need immediate attention.

**To find actions that exceeded the slow threshold (3000ms)**:
1. **Event**: `server_action_duration`.
2. **Filter**: Property `duration_ms` > 3000.
3. **Aggregation**: Total count.
4. **Breakdown**: Property `action_name`.
5. **Date range**: Last 7 days.

If `submitPredictions` consistently exceeds 3000ms, investigate the DAL layer and Supabase query performance.

---

## Part 4: Maintenance

### 4.1 How to Add New Events

When adding a new feature that needs tracking, follow these steps:

#### Step 1: Add the event constant

Open `web-app/src/lib/posthog/events.ts` and add the new event to the `ANALYTICS_EVENTS` object:

```typescript
export const ANALYTICS_EVENTS = {
  // ... existing events

  // New feature: Leaderboard
  LEADERBOARD_VIEWED: "leaderboard_viewed",
  LEADERBOARD_SHARED: "leaderboard_shared",
} as const;
```

**Naming rules**:
- Use `snake_case`.
- Prefix with the feature domain (e.g., `leaderboard_`, `prediction_`, `group_`).
- Keep names under 40 characters (Firebase limit).
- Do not use `$` prefix (reserved by PostHog for built-in events).

#### Step 2: Fire the event in code

For **client-side events** (user interactions in components):

```typescript
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";

// Inside a component or event handler:
trackEvent(ANALYTICS_EVENTS.LEADERBOARD_VIEWED, {
  group_id: groupId,
  match_id: matchId,
});
```

For **server-side events** (in server actions):

```typescript
import { trackServerEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";

// Inside a server action, after the business logic:
trackServerEvent(userId, ANALYTICS_EVENTS.LEADERBOARD_SHARED, {
  group_id: groupId,
  share_method: "link",
});
```

#### Step 3: Add properties carefully

- Never include PII in event properties. The `sanitizeProperties` function catches known PII fields (`email`, `display_name`, `phone`, etc.) as a safety net, but do not rely on it. Be explicit about what you send.
- Opaque IDs are safe: `group_id`, `match_id`, `scenario_id`, `userId` (Supabase UUID).
- Keep property values short (under 100 characters for Firebase compatibility).
- Limit to 25 custom parameters per event (Firebase limit). This is rarely an issue -- most events have 2-5 properties.

#### Step 4: Verify the event fires

1. Run the app locally with `NEXT_PUBLIC_POSTHOG_KEY` set.
2. Open the browser console. If PostHog debug mode is on (it is in development), you will see `[PostHog.js] Sending event: your_event_name` in the console.
3. Trigger the action that should fire the event.
4. Check PostHog **Live Events** to see the event arrive with correct properties.
5. If Firebase is configured, check Firebase **Realtime** or **DebugView** for the same event.

#### Step 5: Update the event tests

Run the existing event naming test to make sure your new event follows conventions:

```bash
cd web-app && npx vitest run src/lib/posthog/events.test.ts
```

This test validates:
- All event names are `snake_case`.
- All event names are unique.
- There are at least 29 events defined (update this count if you add events).

### 4.2 How to Verify Events Are Firing Correctly

Use this checklist when testing a new deployment or investigating missing data.

#### Client-side events

1. Open the deployed app in Chrome.
2. Open DevTools > **Network** tab.
3. Filter by `posthog.com` (or `i.posthog.com`).
4. Navigate through the app and perform actions.
5. You should see POST requests to `https://us.i.posthog.com/e/` (event endpoint) or `https://us.i.posthog.com/batch/`.
6. Click on a request and inspect the **Payload** tab. You will see the event name and properties.
7. For Firebase, filter by `google-analytics.com`. You should see requests to `https://www.google-analytics.com/g/collect`.

#### Server-side events

1. In PostHog, go to **Activity** > **Live Events**.
2. Filter by `$lib = posthog-node`.
3. Perform a server action in the app (submit prediction, create group, etc.).
4. The event should appear in Live Events within a few seconds.

#### Debugging: Event not appearing

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No client events at all | `NEXT_PUBLIC_POSTHOG_KEY` is unset or invalid | Check `.env.local` or Vercel env vars |
| Client events missing intermittently | Ad blocker | Test in incognito without extensions |
| No server events | `NEXT_PUBLIC_POSTHOG_KEY` is unset on the server | Confirm the variable is set in Vercel for the correct environment |
| Firebase events missing | One or more `NEXT_PUBLIC_FIREBASE_*` vars are unset | All 5 are required for Firebase to initialize |
| Events appear in PostHog but not Firebase | Firebase may not be supported in the browser (e.g., SSR or old browser) | Check browser console for Firebase init errors |
| `error_boundary_caught` events missing | The error did not actually trigger an error boundary (it was caught in a try/catch) | This is expected. Error boundaries only catch render-time errors. |

### 4.3 PostHog Event Volume Management

PostHog's free tier allows 1M events per month. During IPL season, high traffic could approach this limit.

#### Check current usage

1. In PostHog, click the **gear icon** (bottom-left) > **Organization & billing**.
2. Under **Usage**, you will see the current month's event count and your limit.

#### If you are approaching the limit

1. **Identify high-volume events**: Go to **Data Management** > **Events**. Sort by volume. The highest-volume event is almost always `$pageview`.

2. **Consider client-side sampling**: In the PostHog initialization (in `web-app/src/lib/posthog/client.ts` or via the unified analytics layer), you can add a sampling rate:

```typescript
// In the PostHog init config:
posthog.init(key, {
  // ... existing config
  // Sample 50% of sessions (each session is fully tracked or fully skipped)
  session_recording: { sample_rate: 0.5 },
});
```

Note: This only applies to session recording, not events. For event sampling, implement it in the unified analytics layer:

```typescript
// In trackPageView, skip 50% of page views to reduce volume:
if (Math.random() > 0.5) return; // Sample at 50%
```

3. **Reduce noisy events**: If `prediction_pick_changed` fires on every keystroke, consider debouncing it. The current implementation already fires per-pick (not per-keystroke), but verify.

4. **Use PostHog's ingestion controls**: In PostHog **Settings** > **Project settings**, you can set up **property filters** to drop events that match certain conditions before they count against your quota.

#### Volume estimation

| Event | Estimated frequency | Monthly estimate (1000 DAU) |
|-------|--------------------|-----------------------------|
| `$pageview` | ~10 per session | ~300,000 |
| `$pageleave` | ~10 per session | ~300,000 |
| `prediction_submitted` | ~3 per user per match day | ~90,000 |
| `prediction_pick_changed` | ~5 per prediction session | ~150,000 |
| Other custom events | ~2 per session | ~60,000 |
| **Total** | | **~900,000** |

With 1000 DAU, the free tier is sufficient but tight. Monitor weekly.

---

## Appendix A: Complete Environment Variable Reference

All analytics-related environment variables in one place.

### PostHog Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | No (app works without it) | PostHog project API key | `phc_abc123...` |
| `NEXT_PUBLIC_POSTHOG_HOST` | No (defaults to `https://us.i.posthog.com`) | PostHog API host | `https://us.i.posthog.com` |

### Firebase Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | No (app works without it) | Firebase project API key | `AIzaSyB...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain | `bragg-production.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No | Firebase project ID | `bragg-production` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | No | Firebase web app ID | `1:123...:web:abc...` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Firebase measurement ID (for GA4) | `G-XXXXXXXXXX` |

### Other Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ENABLE_DEBUG_LOGS` | No (defaults to `false`) | Enable console output from the structured logger | `true` |

### Environment Isolation Matrix

| Variable | Local Dev | Vercel Preview | Vercel Production |
|----------|----------|----------------|-------------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Dev project key | Dev project key | Production project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | `https://us.i.posthog.com` | `https://us.i.posthog.com` |
| Firebase vars | Dev Firebase project | Dev Firebase project | Production Firebase project |
| `ENABLE_DEBUG_LOGS` | `true` | `false` | `false` |

---

## Appendix B: Quick Reference -- Event Names

The full event catalog from `web-app/src/lib/posthog/events.ts`:

| Event Name | Category | Tracked From |
|-----------|----------|-------------|
| `auth_magic_link_requested` | Auth | Server action |
| `auth_callback_success` | Auth | API route |
| `auth_callback_failed` | Auth | API route |
| `auth_onboarding_completed` | Auth | Server action |
| `auth_signed_out` | Auth | Server action |
| `group_created` | Group | Server action |
| `group_join_requested` | Group | Server action |
| `group_invite_copied` | Group | Client component |
| `group_invite_shared` | Group | Client component |
| `group_member_approved` | Group | Server action |
| `group_member_rejected` | Group | Server action |
| `group_member_promoted` | Group | Server action |
| `group_member_demoted` | Group | Server action |
| `group_member_removed` | Group | Server action |
| `prediction_submitted` | Predictions | Server action |
| `prediction_pick_changed` | Predictions | Client component |
| `scenario_custom_created` | Scenarios | Server action |
| `scenario_custom_created_by_admin` | Scenarios | Server action |
| `scenario_approved` | Scenarios | Server action |
| `scenario_rejected` | Scenarios | Server action |
| `scenario_removed` | Scenarios | Server action |
| `scenario_published` | Scenarios | Server action |
| `admin_results_entered` | Admin | Server action |
| `admin_settings_updated` | Admin | Server action |
| `notification_bell_opened` | Notifications | Client component |
| `notification_marked_read` | Notifications | Server action |
| `notification_all_cleared` | Notifications | Server action |
| `error_boundary_caught` | Errors | Client error boundary |
| `error_logged` | Errors | Logger transport |
| `web_vitals_lcp` | Performance | Client (web-vitals) |
| `web_vitals_inp` | Performance | Client (web-vitals) |
| `web_vitals_cls` | Performance | Client (web-vitals) |
| `page_load_time` | Performance | Client (Navigation Timing) |
| `server_action_duration` | Performance | Server action wrapper |
| `unhandled_error` | Errors | Global error handler |
| `predict_page_viewed` | Behavior | Client component |
| `predict_page_revisited` | Behavior | Client component |
