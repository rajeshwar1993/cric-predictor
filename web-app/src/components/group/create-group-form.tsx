"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroup } from "@/lib/actions/groups";
import { ROUTES } from "@/lib/constants";
import { Plus, Loader2 } from "lucide-react";

export function CreateGroupForm() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !name.trim()) return;

    setLoading(true);
    setError("");

    const result = await createGroup(name.trim());
    if (result.success && result.data) {
      startTransition(() => { router.push(ROUTES.GROUP(result.data!.id)); });
    } else {
      setError(result.error || "Couldn't create your squad — try again");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="groupName"
          className="text-sm text-[var(--text-secondary)]"
        >
          Squad Name
        </Label>
        <Input
          id="groupName"
          type="text"
          placeholder="e.g., Office XI, The Dugout, Hostel Legends"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          minLength={3}
          maxLength={50}
          required
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full font-display font-semibold text-sm bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] text-[var(--bg-deep)] hover:opacity-90 btn-glow"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Create Squad
      </Button>
    </form>
  );
}
