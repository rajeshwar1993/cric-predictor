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
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      {/* Stadium floodlight glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-[20%] -top-[30%] h-[50vh] w-[40vw] rounded-full bg-[var(--cta-from)]/[0.05] blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[15%] h-[40vh] w-[35vw] rounded-full bg-[var(--cta-from)]/[0.03] blur-[140px]" />
      </div>

      {/* Grain overlay */}
      <div
        className="grain pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[440px] space-y-8">
        {/* Logo */}
        <div className="animate-fade-in-up text-center">
          <Image
            src="/logo.png"
            alt="Bragg"
            width={64}
            height={64}
            className="mx-auto mb-3 rounded-xl"
            placeholder="empty"
          />
          <h1 className="font-display text-4xl font-bold text-gradient">
            Bragg
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            One last step before you&apos;re in
          </p>
        </div>

        {/* Card */}
        <div
          className="animate-fade-in-up rounded-2xl border border-[var(--ghost-border)] bg-[var(--bg-card)] p-8"
          style={{ animationDelay: "150ms" }}
        >
          <h2 className="mb-6 text-center font-display text-lg font-semibold text-[var(--text-primary)]">
            Complete your profile
          </h2>
          <OnboardingForm />
        </div>

        {/* Disclaimer */}
        <p
          className="animate-fade-in-up text-center text-xs text-[var(--text-muted)]"
          style={{ animationDelay: "300ms" }}
        >
          Not affiliated with BCCI, IPL, or any franchise.
        </p>
      </div>
    </main>
  );
}
