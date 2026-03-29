"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/constants";
import { Link as LinkIcon, Check, Share2 } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

interface InviteLinkProps {
  inviteCode: string;
  groupName: string;
  inviterName: string;
}

export function InviteLink({ inviteCode, groupName, inviterName }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const link = `${APP_URL}/join/${inviteCode}`;
  const shareMessage = `${inviterName} is calling you up to ${groupName} on Bragg — the IPL prediction game built for bragging rights.\n\nSquad Code: ${inviteCode}`;

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      trackEvent(ANALYTICS_EVENTS.GROUP_INVITE_COPIED, {
        invite_code: inviteCode,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }

  async function copyFullMessage() {
    try {
      await navigator.clipboard.writeText(`${shareMessage}\n\n${link}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      window.prompt("Copy this message:", `${shareMessage}\n\n${link}`);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on Bragg`,
          text: shareMessage,
          url: link,
        });
        trackEvent(ANALYTICS_EVENTS.GROUP_INVITE_SHARED, {
          invite_code: inviteCode,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        await copyFullMessage();
      }
    } else {
      await copyFullMessage();
    }
  }

  const buttonClass =
    "border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] font-body text-sm gap-2";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      {!isMobile && (
        <Button variant="outline" onClick={handleCopy} className={buttonClass}>
          {copied ? (
            <>
              <Check className="h-4 w-4 text-[var(--success)]" />
              <span className="text-[var(--success)]">Copied!</span>
            </>
          ) : (
            <>
              <LinkIcon className="h-4 w-4" />
              Copy Link
            </>
          )}
        </Button>
      )}
      <Button
        variant="outline"
        onClick={handleShare}
        className={`${buttonClass} border-[var(--cyan)]/40 hover:border-[var(--cyan)]`}
      >
        {shared ? (
          <>
            <Check className="h-4 w-4 text-[var(--success)]" />
            <span className="text-[var(--success)]">Message copied!</span>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            Send Invite
          </>
        )}
      </Button>
    </div>
  );
}
