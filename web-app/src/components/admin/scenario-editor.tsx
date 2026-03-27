"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publishScenarios, addCustomScenarioAsAdmin, removeScenario } from "@/lib/actions/scenarios";
import { CUSTOM_SCENARIO_POINTS } from "@/lib/constants";
import { Loader2, X, Plus, Lock, Check } from "lucide-react";
import type { Scenario } from "@/types";

interface ScenarioEditorProps {
  groupId: string;
  matchId: number;
  initialScenarios: Scenario[];
  isPublished: boolean;
  isLocked: boolean; // true if any member has predicted
}

export function ScenarioEditor({ groupId, matchId, initialScenarios, isPublished, isLocked }: ScenarioEditorProps) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  // Custom scenario form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [newPoints, setNewPoints] = useState(10);
  const [adding, setAdding] = useState(false);

  async function handleRemove(scenarioId: string) {
    const result = await removeScenario(groupId, scenarioId);
    if (result.success) {
      setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    } else {
      setError(result.error || "Failed to remove");
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError("");
    const result = await publishScenarios(groupId, matchId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Failed to publish");
    }
    setPublishing(false);
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    const validOptions = newOptions.filter(o => o.trim());
    if (validOptions.length < 2) { setError("At least 2 options"); return; }

    setAdding(true);
    setError("");
    const result = await addCustomScenarioAsAdmin(groupId, matchId, newTitle.trim(), validOptions.map(o => o.trim()), newPoints);
    if (result.success && result.data) {
      setScenarios(prev => [...prev, result.data!]);
      setNewTitle("");
      setNewOptions(["", ""]);
      setNewPoints(10);
      setShowAddForm(false);
    } else {
      setError(result.error || "Failed to add");
    }
    setAdding(false);
  }

  // Locked state
  if (isLocked) {
    return (
      <div className="space-y-4">
        <div className="rounded-[14px] border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-5 flex items-center gap-3">
          <Lock className="h-5 w-5 text-[var(--warning)] shrink-0" />
          <div>
            <p className="font-display text-sm font-semibold text-[var(--warning)]">Scenarios Locked</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Members have already submitted predictions. Scenarios cannot be edited.</p>
          </div>
        </div>
        <div className="space-y-2">
          {scenarios.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-3">
              <span className="text-sm text-[var(--text-primary)]">{s.title}</span>
              <span className="font-stats text-xs text-[var(--text-muted)]">{s.points} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Count */}
      <p className="text-sm text-[var(--text-secondary)]">
        <span className="font-stats font-semibold text-[var(--cyan)]">{scenarios.length}</span>/20 scenarios
      </p>

      {/* Published badge */}
      {isPublished && (
        <div className="flex items-center gap-2 text-xs text-[var(--success)]">
          <Check className="h-3.5 w-3.5" /> Published — members can now predict
        </div>
      )}

      {/* Scenario list */}
      <div className="space-y-2">
        {scenarios.map(s => (
          <div key={s.id} className="flex items-center justify-between rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-3">
            <div>
              <span className="text-sm text-[var(--text-primary)]">{s.title}</span>
              <span className="ml-2 text-[10px] font-display text-[var(--text-muted)] uppercase">
                {s.type === "system" ? "System" : "Custom"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-stats text-xs text-[var(--text-muted)]">{s.points} pts</span>
              <button onClick={() => handleRemove(s.id)} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add custom scenario */}
      {scenarios.length < 20 && !showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="w-full rounded-[10px] border border-dashed border-[var(--border-medium)] py-3 text-sm text-[var(--text-muted)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add Custom Scenario
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddCustom} className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">New Scenario</h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-[var(--text-muted)]" aria-label="Close form"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[var(--text-secondary)]">Question</Label>
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Will Kohli score a century?" className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] text-sm" minLength={5} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[var(--text-secondary)]">Options ({newOptions.length}/6)</Label>
            {newOptions.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input value={opt} onChange={e => { const opts = [...newOptions]; opts[i] = e.target.value; setNewOptions(opts); }} placeholder={`Option ${i + 1}`} className="flex-1 bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)] text-sm" maxLength={50} />
                {newOptions.length > 2 && <button type="button" onClick={() => setNewOptions(newOptions.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--danger)]" aria-label={`Remove option ${i + 1}`}><X className="h-4 w-4" /></button>}
              </div>
            ))}
            {newOptions.length < 6 && <button type="button" onClick={() => setNewOptions([...newOptions, ""])} className="text-xs text-[var(--cyan)]">+ Add option</button>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-[var(--text-secondary)]">Points</Label>
            <div className="flex gap-2">
              {CUSTOM_SCENARIO_POINTS.map(p => (
                <button key={p} type="button" onClick={() => setNewPoints(p)} className={`rounded-[8px] border px-3 py-1.5 font-stats text-xs font-medium transition-all ${newPoints === p ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan)]" : "border-[var(--border-medium)] text-[var(--text-muted)]"}`}>{p}</button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={adding || !newTitle.trim()} className="w-full font-display font-semibold text-xs bg-gradient-to-br from-[var(--cyan)] to-[color-mix(in_srgb,var(--cyan),#000_20%)] text-[var(--bg-deep)]">
            {adding ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null} Add Scenario
          </Button>
        </form>
      )}

      {/* Error */}
      {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}

      {/* Publish button */}
      {!isPublished && scenarios.length > 0 && (
        <div className="space-y-2">
          <Button onClick={handlePublish} disabled={publishing} className="w-full font-display font-semibold text-sm bg-gradient-to-br from-[var(--gold)] to-[color-mix(in_srgb,var(--gold),#000_20%)] text-[var(--bg-deep)] hover:opacity-90">
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Publish Scenarios
          </Button>
          <p className="text-center text-xs text-[var(--text-muted)]">Once members predict, scenarios cannot be edited.</p>
        </div>
      )}
    </div>
  );
}
