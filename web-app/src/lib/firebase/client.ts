/**
 * Firebase Analytics lazy singleton. Client-side only.
 *
 * Returns null gracefully when:
 * - Running on the server (SSR)
 * - Firebase env vars are missing
 * - The browser does not support Firebase Analytics
 * - Initialization fails for any reason
 *
 * PII prevention: Google Signals and ad personalization are explicitly
 * disabled. Manual page views are used for consistency with PostHog.
 */
import { type FirebaseApp, initializeApp } from "firebase/app";
import {
  type Analytics,
  initializeAnalytics,
  isSupported,
} from "firebase/analytics";

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let initAttempted = false;

/**
 * Returns the Firebase Analytics instance, or null if unconfigured/unsupported.
 * Lazy-initializes on first call. Client-side only.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (initAttempted) return analytics;
  initAttempted = true;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (!apiKey || !projectId || !appId || !measurementId) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    app = initializeApp({
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId,
      measurementId,
    });

    // Use initializeAnalytics (not getAnalytics) to pass config that
    // disables Google Signals demographic data and ad personalization.
    // send_page_view is false because we send page views manually via
    // the unified analytics layer for consistency with PostHog.
    analytics = initializeAnalytics(app, {
      config: {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        send_page_view: false,
      },
    });

    return analytics;
  } catch {
    // Firebase init failed -- silently no-op
    return null;
  }
}
