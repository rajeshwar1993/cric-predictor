import { Suspense } from 'react'
import { Logo } from '@/components/ui/logo'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-[var(--sp-5)]">
      <div className="w-full max-w-[360px] space-y-8">
        <div className="space-y-3 text-center">
          <Logo size="lg" />
          <p className="text-lg font-medium text-[var(--text-secondary)]">
            Call it. Prove it. Bragg.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-[var(--text-tertiary)]">
          Bragg is a free prediction game — no real money, no gambling. Not affiliated with BCCI,
          IPL, or any franchise.
        </p>
      </div>
    </div>
  )
}
