"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomScenario } from "@/lib/actions/scenarios";
import { CUSTOM_SCENARIO_POINTS } from "@/lib/constants";
import { Plus, Loader2, Check, X } from "lucide-react";

interface CustomScenarioFormProps {
  groupId: string;
  matchId: number;
}

export function CustomScenarioForm({ groupId, matchId }: CustomScenarioFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [points, setPoints] = useState(10);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function addOption() {
    if (options.length < 6) setOptions([...options, ""]);
  }

  function removeOption(index: number) {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    setOptions(options.map((o, i) => (i === index ? value : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setError("Need at least 2 options");
      return;
    }

    setLoading(true);
    setError("");

    const result = await createCustomScenario(
      groupId,
      matchId,
      title.trim(),
      validOptions.map((o) => o.trim()),
      points
    );

    if (result.success) {
      setSuccess(true);
      setTitle("");
      setOptions(["", ""]);
      setPoints(10);
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } else {
      setError(result.error || "Couldn't submit — try again");
    }
    setLoading(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-[14px] border border-dashed border-[var(--border-medium)] bg-[var(--bg-card)]/50 p-5 text-center hover:border-[var(--cyan)] hover:bg-[var(--cyan-soft)] transition-all group"
      >
        <Plus className="mx-auto h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--cyan)]" />
        <p className="mt-2 font-display text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--cyan)]">
          Drop a Wild Card
        </p>
      </button>
    );
  }

  if (success) {
    return (
      <div className="rounded-[14px] border border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-5 text-center space-y-2">
        <Check className="mx-auto h-6 w-6 text-[var(--success)]" />
        <p className="text-sm font-medium text-[var(--success)]">Wild card dropped!</p>
        <p className="text-xs text-[var(--text-muted)]">Admin will review it shortly.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">
          Drop a Wild Card
        </h4>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-[var(--text-secondary)]">Question</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Kohli century? CSK 200+? First ball six?"
          className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] text-sm"
          minLength={5}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-[var(--text-secondary)]">
          Options ({options.length}/6)
        </Label>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] text-sm"
              maxLength={50}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button
            type="button"
            onClick={addOption}
            className="text-xs text-[var(--cyan)] hover:opacity-80"
          >
            + Add another
          </button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-[var(--text-secondary)]">Points</Label>
        <div className="flex gap-2">
          {CUSTOM_SCENARIO_POINTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPoints(p)}
              className={`rounded-[8px] border px-3 py-1.5 font-stats text-xs font-medium transition-all ${
                points === p
                  ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan)]"
                  : "border-[var(--border-medium)] text-[var(--text-muted)] hover:border-[var(--border-light)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-[var(--danger)]" role="alert">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading || !title.trim()}
        className="w-full font-display font-semibold text-xs bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] text-[var(--bg-deep)] hover:opacity-90"
      >
        {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
        Submit Wild Card
      </Button>
    </form>
  );
}
