"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]">
        <AlertTriangle className="h-8 w-8 text-[var(--danger)]" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-[var(--text-primary)]">
        Oops!
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-4 border-[var(--border-medium)] text-[var(--text-secondary)]"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
