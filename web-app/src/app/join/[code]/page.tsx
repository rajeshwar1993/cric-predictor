import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import { APP_URL, ROUTES } from "@/lib/constants";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JoinGroupClient } from "@/components/group/join-group-client";
import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
  const { code } = await params;
  const group = await groupsDal.getGroupByInviteCode(code);

  if (!group) {
    return { title: "Expired Invite" };
  }

  return {
    title: `Join ${group.name}`,
    description: `You've been invited to join ${group.name} on Bragg — the social cricket prediction game.`,
    openGraph: {
      title: `Join ${group.name} on Bragg`,
      description: "Think you know cricket? Prove it. Predict IPL match outcomes with friends.",
      type: "website",
      url: `${APP_URL}/join/${code}`,
      siteName: "Bragg",
    },
  };
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const group = await groupsDal.getGroupByInviteCode(code);

  if (!group) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If authenticated, check existing membership
  if (user) {
    const membership = await membersDal.getMembershipStatus(group.id, user.id);

    if (membership?.status === "approved") {
      redirect(ROUTES.GROUP(group.id));
    }

    return (
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-[400px] space-y-8 text-center">
            <InviteHeader groupName={group.name} />
            <JoinGroupClient
              groupId={group.id}
              groupName={group.name}
              inviteCode={code}
              currentStatus={membership?.status || null}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated — show login form with redirect back
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-[400px] space-y-8">
          <InviteHeader groupName={group.name} />
          <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8">
            <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
              Sign in to join the squad
            </p>
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function InviteHeader({ groupName }: { groupName: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-gradient">Bragg</h1>
      <p className="mt-4 text-lg text-[var(--text-primary)]">
        You&apos;ve been called up to
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-[var(--cyan)]">
        {groupName}
      </p>
    </div>
  );
}
