import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { AcceptTermsForm } from '@/components/auth/accept-terms-form'

export default async function AcceptTermsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-[var(--sp-5)]">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="space-y-3 text-center">
          <Logo size="md" />
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">
            Updated Terms & Privacy
          </h1>
        </div>

        <AcceptTermsForm />
      </div>
    </div>
  )
}
