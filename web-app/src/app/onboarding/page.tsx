import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Authoritative DB check — if already onboarded, skip
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-[440px] space-y-8">
        <div className="text-center">
          <Image src="/logo.png" alt="Bragg" width={64} height={64} className="mx-auto mb-3 rounded-lg" />
          <h1 className="font-display text-4xl font-bold text-gradient">
            Bragg
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            One last step before you&apos;re in
          </p>
        </div>

        <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 shadow-lg">
          <h2 className="mb-6 text-center font-display text-lg font-semibold text-[var(--text-primary)]">
            Complete your profile
          </h2>
          <OnboardingForm />
        </div>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Not affiliated with BCCI, IPL, or any franchise.
        </p>
      </div>
    </main>
  );
}
