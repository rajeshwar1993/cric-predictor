"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enterResults } from "@/lib/actions/admin";
import { Loader2, Check, Trophy } from "lucide-react";

interface ResultEntryFormProps {
  groupId: string;
  matchId: number;
  teamA: string;
  teamB: string;
}

export function ResultEntryForm({ groupId, matchId, teamA, teamB }: ResultEntryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    matchWinner: "",
    tossWinner: "",
    topScorer: "",
    topScorerRuns: "",
    topWicketTaker: "",
    topWicketTakerWickets: "",
    playerOfMatch: "",
    firstInningsScore: "",
    firstInningsWickets: "",
    totalMatchRuns: "",
    totalMatchWickets: "",
    totalMatchSixes: "",
    powerplayScore: "",
    powerplayWickets: "",
    hadSuperOver: "false",
    mostSixesPlayer: "",
    firstWicketOver: "",
    batsmanScoredFifty: "false",
    bowlerTookThree: "false",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.matchWinner || !form.tossWinner) {
      setError("Match Winner and Toss Winner are required");
      return;
    }

    setLoading(true);
    setError("");

    const results: Record<string, unknown> = {
      matchWinner: form.matchWinner,
      tossWinner: form.tossWinner,
      topScorer: form.topScorer || undefined,
      topScorerRuns: form.topScorerRuns ? Number(form.topScorerRuns) : undefined,
      topWicketTaker: form.topWicketTaker || undefined,
      topWicketTakerWickets: form.topWicketTakerWickets ? Number(form.topWicketTakerWickets) : undefined,
      playerOfMatch: form.playerOfMatch || undefined,
      firstInningsScore: form.firstInningsScore ? Number(form.firstInningsScore) : undefined,
      firstInningsWickets: form.firstInningsWickets ? Number(form.firstInningsWickets) : undefined,
      totalMatchRuns: form.totalMatchRuns ? Number(form.totalMatchRuns) : undefined,
      totalMatchWickets: form.totalMatchWickets ? Number(form.totalMatchWickets) : undefined,
      totalMatchSixes: form.totalMatchSixes ? Number(form.totalMatchSixes) : undefined,
      powerplayScore: form.powerplayScore ? Number(form.powerplayScore) : undefined,
      powerplayWickets: form.powerplayWickets ? Number(form.powerplayWickets) : undefined,
      hadSuperOver: form.hadSuperOver === "true",
      mostSixesPlayer: form.mostSixesPlayer || undefined,
      firstWicketOver: form.firstWicketOver ? Number(form.firstWicketOver) : undefined,
      batsmanScoredFifty: form.batsmanScoredFifty === "true",
      bowlerTookThree: form.bowlerTookThree === "true",
    };

    const result = await enterResults(groupId, matchId, results);

    if (result.success) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "Failed to enter results");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-[14px] border border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-6 text-center space-y-3">
        <Check className="h-8 w-8 text-[var(--success)] mx-auto" />
        <p className="font-display text-sm font-semibold text-[var(--success)]">
          Results entered and predictions resolved!
        </p>
      </div>
    );
  }

  const teams = [teamA, teamB];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-[var(--gold)]" />
        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Enter Match Results
        </h3>
      </div>

      {/* Required fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-[var(--text-secondary)]">Match Winner *</Label>
          <select
            value={form.matchWinner}
            onChange={(e) => updateField("matchWinner", e.target.value)}
            className="w-full rounded-[10px] border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
            required
          >
            <option value="">Select</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-[var(--text-secondary)]">Toss Winner *</Label>
          <select
            value={form.tossWinner}
            onChange={(e) => updateField("tossWinner", e.target.value)}
            className="w-full rounded-[10px] border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
            required
          >
            <option value="">Select</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Player fields */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "topScorer", label: "Top Scorer" },
          { key: "topScorerRuns", label: "Top Scorer Runs", type: "number" },
          { key: "topWicketTaker", label: "Top Wicket-Taker" },
          { key: "topWicketTakerWickets", label: "Wickets", type: "number" },
          { key: "playerOfMatch", label: "Player of Match" },
          { key: "mostSixesPlayer", label: "Most Sixes Player" },
        ].map(({ key, label, type }) => (
          <div key={key} className="space-y-2">
            <Label className="text-sm text-[var(--text-secondary)]">{label}</Label>
            <Input
              type={type || "text"}
              value={form[key as keyof typeof form]}
              onChange={(e) => updateField(key, e.target.value)}
              className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)]"
            />
          </div>
        ))}
      </div>

      {/* Score fields */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "firstInningsScore", label: "1st Innings Score" },
          { key: "firstInningsWickets", label: "1st Inn. Wickets" },
          { key: "totalMatchRuns", label: "Total Match Runs" },
          { key: "totalMatchWickets", label: "Total Wickets" },
          { key: "totalMatchSixes", label: "Total Sixes" },
          { key: "powerplayScore", label: "Powerplay Score" },
          { key: "powerplayWickets", label: "PP Wickets" },
          { key: "firstWicketOver", label: "1st Wicket Over" },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label className="text-sm text-[var(--text-secondary)]">{label}</Label>
            <Input
              type="number"
              value={form[key as keyof typeof form]}
              onChange={(e) => updateField(key, e.target.value)}
              className="bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-primary)]"
            />
          </div>
        ))}
      </div>

      {/* Boolean fields */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "hadSuperOver", label: "Super Over?" },
          { key: "batsmanScoredFifty", label: "Batsman 50+?" },
          { key: "bowlerTookThree", label: "Bowler 3+ Wkt?" },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label className="text-sm text-[var(--text-secondary)]">{label}</Label>
            <select
              value={form[key as keyof typeof form]}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full rounded-[10px] border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full font-display font-semibold text-sm bg-gradient-to-br from-[var(--gold)] to-[color-mix(in_srgb,var(--gold),#000_20%)] text-[var(--bg-deep)] hover:opacity-90"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Enter Results & Resolve Predictions
      </Button>
    </form>
  );
}
