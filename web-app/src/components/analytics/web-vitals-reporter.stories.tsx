import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { WebVitalsReporter } from './web-vitals-reporter'

/**
 * WebVitalsReporter is an invisible analytics island — it subscribes
 * to Next.js' `useReportWebVitals` and forwards each metric
 * (LCP / INP / CLS / FCP / FID / TTFB) to PostHog via the shared
 * `trackEvent` helper. It only runs in production and returns
 * `null`, so there is nothing visual to render in Storybook.
 *
 * This story exists to satisfy the global "every UI component ships
 * with a Storybook entry" requirement and to document the props /
 * event contract. The rendered output is a documentation panel, not
 * the component itself.
 */
const meta = {
  title: 'Analytics/WebVitalsReporter',
  component: WebVitalsReporter,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Client-only subscriber that forwards Core Web Vitals ' +
          '(LCP, INP, CLS, FCP, FID, TTFB) to PostHog as the ' +
          '`web_vitals` event. Active only in `NODE_ENV=production`. ' +
          'Renders `null` — mounted inside `PHProvider` in the root layout.',
      },
    },
  },
} satisfies Meta<typeof WebVitalsReporter>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — doc-only placeholder                                      */
/* ------------------------------------------------------------------ */

/**
 * Default story — the component itself renders nothing, so we show a
 * documentation panel describing the event contract and behaviour.
 */
export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-4 rounded-2xl border border-wire bg-dark-concrete p-6 text-text-primary max-w-[480px]">
      <WebVitalsReporter />
      <h2 className="font-display text-h3 font-bold uppercase text-bragg-lime">
        WebVitalsReporter
      </h2>
      <p className="text-body-sm text-text-secondary">
        Invisible analytics island. Mounted once inside{' '}
        <code className="rounded bg-concrete-black px-1.5 py-0.5 text-text-primary">
          PHProvider
        </code>{' '}
        in the root layout. Renders{' '}
        <code className="rounded bg-concrete-black px-1.5 py-0.5 text-text-primary">
          null
        </code>
        .
      </p>

      <div className="flex flex-col gap-2">
        <p className="font-display text-body-sm font-bold uppercase text-text-primary">
          Event
        </p>
        <code className="rounded-md border border-wire bg-concrete-black p-3 text-body-sm text-text-primary">
          web_vitals
        </code>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-display text-body-sm font-bold uppercase text-text-primary">
          Properties
        </p>
        <ul className="flex flex-col gap-1 text-body-sm text-text-secondary">
          <li>
            <code className="text-text-primary">metric_name</code> —
            &quot;LCP&quot; | &quot;INP&quot; | &quot;CLS&quot; | &quot;FCP&quot; | &quot;FID&quot; |
            &quot;TTFB&quot;
          </li>
          <li>
            <code className="text-text-primary">metric_value</code> — number
          </li>
          <li>
            <code className="text-text-primary">metric_rating</code> —
            &quot;good&quot; | &quot;needs-improvement&quot; | &quot;poor&quot;
          </li>
          <li>
            <code className="text-text-primary">metric_id</code> — string
          </li>
          <li>
            <code className="text-text-primary">page</code> — string (pathname)
          </li>
        </ul>
      </div>

      <p className="text-body-sm text-text-muted">
        Gate:{' '}
        <code className="text-text-primary">
          process.env.NODE_ENV === &apos;production&apos;
        </code>
        . No-op in dev/test.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      source: {
        code:
          "// Renders null; see web-vitals-reporter.tsx for the real subscriber.\n" +
          "<WebVitalsReporter />",
      },
    },
  },
}
