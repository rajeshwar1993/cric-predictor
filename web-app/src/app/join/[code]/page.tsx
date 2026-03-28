import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import { APP_URL, ROUTES, LIMITS } from "@/lib/constants";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JoinGroupClient } from "@/components/group/join-group-client";
import { StoreInviteCode } from "@/components/group/store-invite-code";
import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";
import Image from "next/image";

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
    description: `You've been called up to ${group.name} on Bragg — the IPL prediction game built for bragging rights.`,
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
    const [membership, members] = await Promise.all([
      membersDal.getMembershipStatus(group.id, user.id),
      membersDal.getMembers(group.id),
    ]);

    if (membership?.status === "approved") {
      redirect(ROUTES.GROUP(group.id));
    }

    const isFull = members.length >= LIMITS.MAX_MEMBERS_PER_GROUP;

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
              isFull={isFull}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated — store invite code in localStorage, show login form
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <StoreInviteCode code={code} groupName={group.name} />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-[400px] space-y-8">
          <InviteHeader groupName={group.name} />
          <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8">
            <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
              Sign in to join the squad
            </p>
            <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-10 rounded-[10px] bg-[var(--bg-elevated)]" /><div className="h-10 rounded-[10px] bg-[var(--bg-elevated)]" /></div>}>
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
      <Image src="/logo.png" alt="Bragg" width={56} height={56} className="mb-3 rounded-lg" placeholder="empty" />
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
