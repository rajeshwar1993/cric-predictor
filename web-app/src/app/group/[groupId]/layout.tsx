import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/get-user-cached";
import * as groupsDal from "@/lib/dal/groups";
import * as membersDal from "@/lib/dal/members";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

interface GroupLayoutProps {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}

export default async function GroupLayout({ children, params }: GroupLayoutProps) {
  const { groupId } = await params;

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const group = await groupsDal.getGroupById(groupId);
  if (!group) notFound();

  const membership = await membersDal.getMembershipStatus(groupId, user.id);
  if (!membership || membership.status !== "approved") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-[960px] px-4 py-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
