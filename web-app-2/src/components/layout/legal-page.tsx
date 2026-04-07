import { GlobalFooter } from '@/components/layout/global-footer'

interface LegalPageProps {
  children: React.ReactNode
}

/**
 * Shared layout for legal pages (Privacy Policy, Terms & Conditions).
 * Readable typography, max-width for text readability, footer included.
 */
export function LegalPage({ children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-[680px] flex-1 px-[var(--sp-5)] py-[var(--sp-12)]">
        <article className="prose-bragg space-y-6 text-[var(--text-secondary)] [&_h1]:font-heading [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-[var(--text-primary)] [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_h2]:pt-4 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-[var(--text-primary)] [&_p]:text-base [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_li]:text-base [&_a]:text-[var(--brand)] [&_a]:underline-offset-4 hover:[&_a]:underline [&_strong]:text-[var(--text-primary)]">
          {children}
        </article>
      </main>
      <GlobalFooter />
    </div>
  )
}
