"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

interface UserMenuProps {
  displayName: string;
  email: string;
}

export function UserMenu({ displayName, email }: UserMenuProps) {
  const [signingOut, setSigningOut] = useState(false);
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]">
        <Avatar className="h-8 w-8 border border-[var(--border-light)]">
          <AvatarFallback className="bg-[var(--bg-elevated)] text-xs font-display font-semibold text-[var(--text-secondary)]">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[var(--bg-elevated)] border-[var(--border-light)]"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {displayName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--border-light)]" />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-[var(--text-secondary)] focus:bg-[var(--bg-hover)] focus:text-[var(--text-primary)] cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {signingOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
