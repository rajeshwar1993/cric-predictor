"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/constants";
import { Copy, Check } from "lucide-react";
import { getPostHogClient } from "@/lib/posthog/client";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";

interface InviteLinkProps {
  inviteCode: string;
}

export function InviteLink({ inviteCode }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const link = `${APP_URL}/join/${inviteCode}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      getPostHogClient()?.capture(ANALYTICS_EVENTS.GROUP_INVITE_COPIED, { invite_code: inviteCode });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — show link as text for manual copy
      window.prompt("Copy this link:", link);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      className="border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] font-body text-sm gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-[var(--success)]" />
          <span className="text-[var(--success)]">Copied! Drop it in the group chat.</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Share Invite
        </>
      )}
    </Button>
  );
}
