"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/constants";
import { Copy, Check } from "lucide-react";

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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          <span className="text-[var(--success)]">Link copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy Invite Link
        </>
      )}
    </Button>
  );
}
