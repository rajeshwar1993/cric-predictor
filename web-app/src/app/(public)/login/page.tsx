import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { BraggWordmark } from '@/components/ui/bragg-wordmark'
import { LEGAL_DISCLAIMER } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Sign in to Bragg with a magic link. No password needed.',
}

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo — also serves as the page heading */}
        <BraggWordmark
          as="h1"
          tone="primary"
          className="mb-8 text-center"
        />

        {/* Form card */}
        <div className="rounded-2xl border border-wire bg-dark-concrete p-6">
          <LoginForm redirectTo={redirectTo} />
        </div>

        {/* Disclaimer */}
        <p className="text-body-sm mt-6 text-center text-text-muted">
          {LEGAL_DISCLAIMER}
        </p>
      </div>
    </div>
  )
}
