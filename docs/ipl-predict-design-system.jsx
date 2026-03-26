import { useState } from "react";

// ============================================================
// IPL PREDICT — DESIGN SYSTEM
// "Stadium Nightscape" — Dark sports energy, floodlight accents
// ============================================================

const tokens = {
  // CORE PALETTE
  colors: {
    // Surfaces — layered dark with subtle blue undertone (like a night sky over a stadium)
    bg: {
      deep: "#06080F",        // Deepest background — app shell
      primary: "#0B0F1A",     // Primary surface — page background
      card: "#111827",        // Card surfaces
      elevated: "#1A2236",    // Elevated elements — modals, dropdowns
      hover: "#1F2A40",       // Hover states on cards
      input: "#0F1525",       // Input field backgrounds
    },
    // Accent — Electric Cyan (the floodlight glow)
    accent: {
      primary: "#00E5FF",     // Primary accent — CTAs, active states, links
      soft: "#00E5FF1A",      // 10% opacity — subtle backgrounds
      medium: "#00E5FF33",    // 20% opacity — hover backgrounds
      glow: "0 0 20px #00E5FF40, 0 0 60px #00E5FF15", // Glow effect for key elements
    },
    // Secondary Accent — Amber Gold (trophy, achievement, warmth)
    gold: {
      primary: "#FFB800",     // Secondary accent — points, ranks, achievements
      soft: "#FFB80015",      // Subtle gold background
    },
    // Semantic Colors
    success: "#34D399",       // Correct predictions — emerald green
    danger: "#F87171",        // Wrong predictions — soft red
    warning: "#FBBF24",       // Caution, "in danger" — amber
    onTrack: "#00E5FF",       // "On track" — uses primary accent
    pending: "#64748B",       // Unresolved — slate grey
    // Text Hierarchy
    text: {
      primary: "#F1F5F9",     // Headlines, primary content
      secondary: "#94A3B8",   // Body text, descriptions
      muted: "#475569",       // Disabled, tertiary info
      inverse: "#0B0F1A",     // Text on light/accent backgrounds
    },
    // Borders
    border: {
      subtle: "#FFFFFF08",    // 3% white — barely visible structure
      light: "#FFFFFF12",     // 7% white — card borders
      medium: "#FFFFFF20",    // 12% white — input borders
      focus: "#00E5FF50",     // Focus ring
    },
    // Team Colors (used for match cards and team badges)
    teams: {
      CSK: "#F9CD05", MI: "#004BA0", RCB: "#EC1C24", KKR: "#3B215D",
      DC: "#004C93", SRH: "#F26522", RR: "#EA1A85", PBKS: "#ED1B24",
      GT: "#1C1C2B", LSG: "#A72056",
    },
  },
  // TYPOGRAPHY
  fonts: {
    display: "'Chakra Petch', sans-serif",   // Headlines — geometric, sporty, techy
    body: "'DM Sans', sans-serif",           // Body — clean, modern, highly readable
    mono: "'JetBrains Mono', monospace",     // Numbers, scores, stats
  },
  // SPACING (8px grid)
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 },
  // RADII
  radius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
};

// ============================================================
// COMPONENT LIBRARY PREVIEW
// ============================================================

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 48 }}>
    <h2 style={{
      fontFamily: tokens.fonts.display,
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: tokens.colors.accent.primary,
      marginBottom: 20,
      paddingBottom: 8,
      borderBottom: `1px solid ${tokens.colors.border.light}`,
    }}>{title}</h2>
    {children}
  </div>
);

const ColorSwatch = ({ name, hex, size = 56 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
    <div style={{
      width: size, height: size, borderRadius: tokens.radius.md,
      backgroundColor: hex,
      border: `1px solid ${tokens.colors.border.light}`,
      boxShadow: hex === tokens.colors.accent.primary ? tokens.colors.accent.glow : "none",
    }} />
    <span style={{ fontFamily: tokens.fonts.mono, fontSize: 9, color: tokens.colors.text.muted }}>{hex}</span>
    <span style={{ fontFamily: tokens.fonts.body, fontSize: 10, color: tokens.colors.text.secondary }}>{name}</span>
  </div>
);

// ============================================================
// MAIN DESIGN SYSTEM COMPONENT
// ============================================================

export default function DesignSystem() {
  const [activeTab, setActiveTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "colors", label: "Colors" },
    { id: "typography", label: "Type" },
    { id: "components", label: "Components" },
    { id: "patterns", label: "Patterns" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: tokens.colors.bg.deep,
      color: tokens.colors.text.primary,
      fontFamily: tokens.fonts.body,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${tokens.colors.bg.deep}; }
        ::-webkit-scrollbar-thumb { background: ${tokens.colors.border.medium}; border-radius: 3px; }
      `}</style>

      {/* HEADER */}
      <header style={{
        padding: "24px 32px",
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `linear-gradient(180deg, ${tokens.colors.bg.primary} 0%, ${tokens.colors.bg.deep} 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: tokens.radius.md,
            background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, #0088AA)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: tokens.colors.bg.deep,
            fontFamily: tokens.fonts.display,
          }}>IP</div>
          <div>
            <h1 style={{
              fontFamily: tokens.fonts.display, fontSize: 18, fontWeight: 700,
              letterSpacing: "-0.02em",
            }}>IPL Predict</h1>
            <span style={{
              fontFamily: tokens.fonts.mono, fontSize: 10,
              color: tokens.colors.text.muted,
            }}>Design System v1.0</span>
          </div>
        </div>
        <span style={{
          fontFamily: tokens.fonts.display, fontSize: 11, fontWeight: 600,
          color: tokens.colors.accent.primary, letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>Stadium Nightscape</span>
      </header>

      {/* TAB NAV */}
      <nav style={{
        display: "flex", gap: 0, padding: "0 32px",
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        backgroundColor: tokens.colors.bg.primary,
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            fontFamily: tokens.fonts.display, fontSize: 12, fontWeight: 600,
            letterSpacing: "0.05em", textTransform: "uppercase",
            padding: "14px 20px", cursor: "pointer",
            background: "none", border: "none",
            color: activeTab === tab.id ? tokens.colors.accent.primary : tokens.colors.text.muted,
            borderBottom: activeTab === tab.id ? `2px solid ${tokens.colors.accent.primary}` : "2px solid transparent",
            transition: "all 0.2s ease",
          }}>{tab.label}</button>
        ))}
      </nav>

      {/* CONTENT */}
      <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>

        {/* ==================== OVERVIEW ==================== */}
        {activeTab === "overview" && (
          <div>
            <Section title="Design Philosophy">
              <div style={{
                background: `linear-gradient(135deg, ${tokens.colors.bg.card} 0%, ${tokens.colors.bg.elevated} 100%)`,
                border: `1px solid ${tokens.colors.border.light}`,
                borderRadius: tokens.radius.xl, padding: 32,
              }}>
                <h3 style={{
                  fontFamily: tokens.fonts.display, fontSize: 28, fontWeight: 700,
                  letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 16,
                }}>
                  <span style={{ color: tokens.colors.accent.primary }}>Stadium</span>{" "}
                  <span style={{ color: tokens.colors.text.primary }}>Nightscape</span>
                </h3>
                <p style={{ color: tokens.colors.text.secondary, lineHeight: 1.7, fontSize: 14, maxWidth: 600 }}>
                  Inspired by the electric energy of a T20 night match under floodlights.
                  Dark layered surfaces create depth like a stadium at dusk. Electric cyan
                  accents cut through like floodlight beams. Amber gold marks achievements
                  and points — the trophy glow. Every element is designed for the 7:30 PM
                  match-day experience when fans are glued to their screens.
                </p>
                <div style={{ display: "flex", gap: 24, marginTop: 24, flexWrap: "wrap" }}>
                  {[
                    { label: "Dark-first", desc: "Optimized for night viewing" },
                    { label: "High contrast", desc: "Scores readable at a glance" },
                    { label: "Motion-aware", desc: "Leaderboard shifts feel alive" },
                    { label: "Mobile-native", desc: "Thumb-friendly, one-hand use" },
                  ].map(p => (
                    <div key={p.label} style={{
                      flex: "1 1 180px", padding: 16,
                      backgroundColor: tokens.colors.bg.input,
                      borderRadius: tokens.radius.md,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                    }}>
                      <div style={{
                        fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600,
                        color: tokens.colors.text.primary, marginBottom: 4,
                      }}>{p.label}</div>
                      <div style={{
                        fontSize: 12, color: tokens.colors.text.muted,
                      }}>{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Target Users">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { emoji: "🏏", title: "Cricket-obsessed friends", desc: "20-35, Indian, male-dominated. Live in WhatsApp groups during IPL." },
                  { emoji: "📱", title: "Mobile-first viewers", desc: "Watching on JioHotstar, predicting on this app. Dark mode essential." },
                  { emoji: "🏆", title: "Competitive banter lovers", desc: "\"I told you MI would choke\" is the moment they live for." },
                  { emoji: "⚡", title: "Casual to mid-core gamers", desc: "Not Dream11 pros. Want fun predictions, not salary cap math." },
                ].map(u => (
                  <div key={u.title} style={{
                    flex: "1 1 200px", padding: 20,
                    backgroundColor: tokens.colors.bg.card,
                    borderRadius: tokens.radius.lg,
                    border: `1px solid ${tokens.colors.border.light}`,
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{u.emoji}</div>
                    <div style={{
                      fontFamily: tokens.fonts.display, fontSize: 14, fontWeight: 600,
                      marginBottom: 6, color: tokens.colors.text.primary,
                    }}>{u.title}</div>
                    <div style={{ fontSize: 12, color: tokens.colors.text.secondary, lineHeight: 1.5 }}>{u.desc}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ==================== COLORS ==================== */}
        {activeTab === "colors" && (
          <div>
            <Section title="Surface Layers">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(tokens.colors.bg).map(([name, hex]) => (
                  <ColorSwatch key={name} name={name} hex={hex} size={64} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: tokens.colors.text.muted, marginTop: 16 }}>
                Surfaces layer from deep → primary → card → elevated. Each step adds ~5% brightness.
                The subtle blue undertone gives depth without feeling grey.
              </p>
            </Section>

            <Section title="Accent — Electric Cyan (Floodlight)">
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  width: 100, height: 100, borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.colors.accent.primary,
                  boxShadow: tokens.colors.accent.glow,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: tokens.fonts.mono, fontSize: 12, fontWeight: 600,
                  color: tokens.colors.bg.deep,
                }}>#00E5FF</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: tokens.colors.text.secondary, lineHeight: 1.6 }}>
                    The hero color. Used for primary CTAs, active states, links, "on track" indicators,
                    and key interactive elements. The cyan glow effect (box-shadow) is used sparingly
                    on hero buttons and live match indicators to create the floodlight feel.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <ColorSwatch name="soft (10%)" hex={tokens.colors.accent.soft} />
                <ColorSwatch name="medium (20%)" hex={tokens.colors.accent.medium} />
              </div>
            </Section>

            <Section title="Secondary — Amber Gold (Trophy)">
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.colors.gold.primary,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: tokens.fonts.mono, fontSize: 12, fontWeight: 600,
                  color: tokens.colors.bg.deep,
                }}>#FFB800</div>
                <p style={{ fontSize: 13, color: tokens.colors.text.secondary, flex: 1 }}>
                  Points, ranks, achievements, season champion badge. The warmth of gold
                  contrasts the cool cyan. Used for #1 rank highlight, point displays, and trophies.
                </p>
              </div>
            </Section>

            <Section title="Semantic Colors">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <ColorSwatch name="Success" hex={tokens.colors.success} />
                <ColorSwatch name="Danger" hex={tokens.colors.danger} />
                <ColorSwatch name="Warning" hex={tokens.colors.warning} />
                <ColorSwatch name="Pending" hex={tokens.colors.pending} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {["✅ Correct", "❌ Wrong", "🟡 On Track", "🔴 In Danger", "⏳ Pending"].map((label, i) => {
                  const colors = [tokens.colors.success, tokens.colors.danger, tokens.colors.accent.primary, tokens.colors.warning, tokens.colors.pending];
                  return (
                    <span key={label} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: tokens.radius.full,
                      backgroundColor: colors[i] + "18",
                      border: `1px solid ${colors[i]}40`,
                      fontFamily: tokens.fonts.mono, fontSize: 11, fontWeight: 500,
                      color: colors[i],
                    }}>{label}</span>
                  );
                })}
              </div>
            </Section>

            <Section title="IPL Team Colors">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(tokens.colors.teams).map(([code, hex]) => (
                  <div key={code} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: tokens.radius.full,
                      backgroundColor: hex, display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: tokens.fonts.display, fontSize: 10, fontWeight: 700,
                      color: ["#F9CD05", "#EA1A85", "#ED1B24", "#F26522", "#EC1C24", "#A72056"].includes(hex) ? tokens.colors.bg.deep : "#fff",
                    }}>{code}</div>
                    <span style={{ fontFamily: tokens.fonts.mono, fontSize: 8, color: tokens.colors.text.muted }}>{hex}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ==================== TYPOGRAPHY ==================== */}
        {activeTab === "typography" && (
          <div>
            <Section title="Font Stack">
              {[
                { name: "Chakra Petch", role: "Display / Headlines", font: tokens.fonts.display, sample: "Match Winner: CSK vs MI", desc: "Geometric, sporty, techy. Used for headings, scenario titles, match cards, navbar. Has a motorsport/esports feel that fits the competitive energy." },
                { name: "DM Sans", role: "Body / UI Text", font: tokens.fonts.body, sample: "Your predictions are locked. Leaderboard updates every minute during the match.", desc: "Clean geometric sans with excellent readability at small sizes. Used for descriptions, form labels, navigation, and all body text." },
                { name: "JetBrains Mono", role: "Numbers / Stats / Scores", font: tokens.fonts.mono, sample: "185/4 (18.2) • 42 pts • Rank #2 • 67.3%", desc: "Monospaced for tabular data alignment. Used for scores, points, percentages, countdowns, and the leaderboard table. Numbers feel authoritative in mono." },
              ].map(f => (
                <div key={f.name} style={{
                  marginBottom: 24, padding: 24,
                  backgroundColor: tokens.colors.bg.card,
                  borderRadius: tokens.radius.lg,
                  border: `1px solid ${tokens.colors.border.light}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontFamily: f.font, fontSize: 14, fontWeight: 600, color: tokens.colors.accent.primary }}>{f.name}</span>
                    <span style={{ fontFamily: tokens.fonts.mono, fontSize: 10, color: tokens.colors.text.muted }}>{f.role}</span>
                  </div>
                  <div style={{ fontFamily: f.font, fontSize: 22, fontWeight: 600, marginBottom: 10, letterSpacing: "-0.01em" }}>{f.sample}</div>
                  <div style={{ fontSize: 12, color: tokens.colors.text.muted, lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </Section>

            <Section title="Type Scale">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { size: 32, weight: 700, label: "H1 — Page titles", font: tokens.fonts.display, sample: "Season Standings" },
                  { size: 24, weight: 700, label: "H2 — Section headers", font: tokens.fonts.display, sample: "CSK vs MI — Match 14" },
                  { size: 18, weight: 600, label: "H3 — Card titles", font: tokens.fonts.display, sample: "Your Predictions" },
                  { size: 14, weight: 600, label: "H4 — Scenario titles", font: tokens.fonts.display, sample: "Who will win the toss?" },
                  { size: 14, weight: 400, label: "Body", font: tokens.fonts.body, sample: "Submit your picks before 6:45 PM IST" },
                  { size: 12, weight: 400, label: "Small / Caption", font: tokens.fonts.body, sample: "Last updated 2 min ago • 12/16 scenarios predicted" },
                  { size: 13, weight: 500, label: "Mono / Stats", font: tokens.fonts.mono, sample: "172/6  •  RR: 8.60  •  Req: 11.2" },
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                    <span style={{
                      fontFamily: tokens.fonts.mono, fontSize: 10, color: tokens.colors.text.muted,
                      minWidth: 160,
                    }}>{t.label} ({t.size}px)</span>
                    <span style={{
                      fontFamily: t.font, fontSize: t.size, fontWeight: t.weight,
                      letterSpacing: t.size >= 18 ? "-0.02em" : "0",
                    }}>{t.sample}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ==================== COMPONENTS ==================== */}
        {activeTab === "components" && (
          <div>
            <Section title="Buttons">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {/* Primary */}
                <button style={{
                  fontFamily: tokens.fonts.display, fontSize: 14, fontWeight: 600,
                  letterSpacing: "0.02em",
                  padding: "12px 28px", borderRadius: tokens.radius.md,
                  background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, #00B8D4)`,
                  color: tokens.colors.bg.deep, border: "none", cursor: "pointer",
                  boxShadow: tokens.colors.accent.glow,
                }}>Submit Predictions</button>
                {/* Secondary */}
                <button style={{
                  fontFamily: tokens.fonts.display, fontSize: 14, fontWeight: 600,
                  padding: "12px 28px", borderRadius: tokens.radius.md,
                  background: "transparent",
                  color: tokens.colors.accent.primary,
                  border: `1px solid ${tokens.colors.accent.primary}50`,
                  cursor: "pointer",
                }}>View Leaderboard</button>
                {/* Ghost */}
                <button style={{
                  fontFamily: tokens.fonts.body, fontSize: 13, fontWeight: 500,
                  padding: "10px 20px", borderRadius: tokens.radius.md,
                  background: tokens.colors.bg.elevated,
                  color: tokens.colors.text.secondary,
                  border: `1px solid ${tokens.colors.border.light}`,
                  cursor: "pointer",
                }}>Cancel</button>
                {/* Icon */}
                <button style={{
                  width: 40, height: 40, borderRadius: tokens.radius.md,
                  background: tokens.colors.bg.elevated,
                  border: `1px solid ${tokens.colors.border.light}`,
                  color: tokens.colors.text.secondary,
                  cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>+</button>
              </div>
            </Section>

            <Section title="Match Card">
              <div style={{
                background: `linear-gradient(135deg, ${tokens.colors.bg.card} 0%, ${tokens.colors.bg.elevated} 100%)`,
                border: `1px solid ${tokens.colors.border.light}`,
                borderRadius: tokens.radius.xl, padding: 24,
                maxWidth: 420,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{
                    fontFamily: tokens.fonts.mono, fontSize: 10, fontWeight: 500,
                    color: tokens.colors.accent.primary,
                    backgroundColor: tokens.colors.accent.soft,
                    padding: "3px 10px", borderRadius: tokens.radius.full,
                  }}>MATCH 14 • TONIGHT 7:30 PM</span>
                  <span style={{
                    fontFamily: tokens.fonts.mono, fontSize: 10,
                    color: tokens.colors.danger,
                    backgroundColor: tokens.colors.danger + "18",
                    padding: "3px 10px", borderRadius: tokens.radius.full,
                  }}>DEADLINE 6:45 PM</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  {/* Team A */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: tokens.radius.full,
                      backgroundColor: tokens.colors.teams.CSK,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: tokens.fonts.display, fontSize: 11, fontWeight: 700,
                      color: tokens.colors.bg.deep,
                    }}>CSK</div>
                    <span style={{ fontFamily: tokens.fonts.display, fontSize: 16, fontWeight: 600 }}>Chennai</span>
                  </div>
                  <span style={{
                    fontFamily: tokens.fonts.display, fontSize: 12, fontWeight: 600,
                    color: tokens.colors.text.muted,
                  }}>VS</span>
                  {/* Team B */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: tokens.fonts.display, fontSize: 16, fontWeight: 600 }}>Mumbai</span>
                    <div style={{
                      width: 44, height: 44, borderRadius: tokens.radius.full,
                      backgroundColor: tokens.colors.teams.MI,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: tokens.fonts.display, fontSize: 11, fontWeight: 700,
                      color: "#fff",
                    }}>MI</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: tokens.colors.text.muted, textAlign: "center", marginBottom: 16 }}>
                  Wankhede Stadium, Mumbai
                </div>
                <button style={{
                  width: "100%", padding: "12px", borderRadius: tokens.radius.md,
                  background: `linear-gradient(135deg, ${tokens.colors.accent.primary}, #00B8D4)`,
                  color: tokens.colors.bg.deep, border: "none", cursor: "pointer",
                  fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600,
                  letterSpacing: "0.03em",
                }}>PREDICT NOW</button>
              </div>
            </Section>

            <Section title="Leaderboard Row">
              <div style={{ maxWidth: 480 }}>
                {[
                  { rank: 1, name: "Rohit", pts: 87, correct: 12, color: tokens.colors.gold.primary, bg: tokens.colors.gold.soft },
                  { rank: 2, name: "Priya", pts: 72, correct: 10, color: tokens.colors.accent.primary, bg: tokens.colors.accent.soft },
                  { rank: 3, name: "Arjun", pts: 65, correct: 9, color: tokens.colors.text.secondary, bg: "transparent" },
                  { rank: 4, name: "You", pts: 58, correct: 8, color: tokens.colors.accent.primary, bg: tokens.colors.accent.soft, isYou: true },
                ].map(row => (
                  <div key={row.rank} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                    backgroundColor: row.isYou ? tokens.colors.accent.soft : "transparent",
                    borderRadius: tokens.radius.md, marginBottom: 2,
                    border: row.isYou ? `1px solid ${tokens.colors.accent.primary}30` : "1px solid transparent",
                  }}>
                    <span style={{
                      fontFamily: tokens.fonts.display, fontSize: 16, fontWeight: 700,
                      color: row.color, minWidth: 28, textAlign: "center",
                    }}>#{row.rank}</span>
                    <span style={{
                      flex: 1, fontFamily: tokens.fonts.body, fontSize: 14, fontWeight: 500,
                      color: row.isYou ? tokens.colors.accent.primary : tokens.colors.text.primary,
                    }}>
                      {row.name} {row.isYou && <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>(you)</span>}
                    </span>
                    <span style={{
                      fontFamily: tokens.fonts.mono, fontSize: 11, color: tokens.colors.text.muted,
                    }}>{row.correct} correct</span>
                    <span style={{
                      fontFamily: tokens.fonts.mono, fontSize: 15, fontWeight: 600,
                      color: row.rank === 1 ? tokens.colors.gold.primary : tokens.colors.text.primary,
                      minWidth: 48, textAlign: "right",
                    }}>{row.pts} <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>pts</span></span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Scenario Pick Card">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {/* Team Pick */}
                <div style={{
                  width: 220, padding: 20,
                  backgroundColor: tokens.colors.bg.card,
                  borderRadius: tokens.radius.lg,
                  border: `1px solid ${tokens.colors.border.light}`,
                }}>
                  <div style={{ fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Match Winner</div>
                  <div style={{ fontSize: 11, color: tokens.colors.text.muted, marginBottom: 14 }}>10 pts</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{
                      flex: 1, padding: "10px", borderRadius: tokens.radius.md,
                      backgroundColor: tokens.colors.teams.CSK + "25",
                      border: `2px solid ${tokens.colors.teams.CSK}`,
                      color: tokens.colors.teams.CSK,
                      fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600,
                      cursor: "pointer",
                    }}>CSK</button>
                    <button style={{
                      flex: 1, padding: "10px", borderRadius: tokens.radius.md,
                      backgroundColor: "transparent",
                      border: `1px solid ${tokens.colors.border.medium}`,
                      color: tokens.colors.text.secondary,
                      fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600,
                      cursor: "pointer",
                    }}>MI</button>
                  </div>
                </div>
                {/* Range Bracket */}
                <div style={{
                  width: 280, padding: 20,
                  backgroundColor: tokens.colors.bg.card,
                  borderRadius: tokens.radius.lg,
                  border: `1px solid ${tokens.colors.border.light}`,
                }}>
                  <div style={{ fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Total Match Runs</div>
                  <div style={{ fontSize: 11, color: tokens.colors.text.muted, marginBottom: 14 }}>10 pts</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["<300", "300-349", "350-399", "400+"].map((b, i) => (
                      <button key={b} style={{
                        flex: 1, padding: "8px 4px", borderRadius: tokens.radius.sm,
                        backgroundColor: i === 2 ? tokens.colors.accent.soft : "transparent",
                        border: i === 2 ? `2px solid ${tokens.colors.accent.primary}` : `1px solid ${tokens.colors.border.medium}`,
                        color: i === 2 ? tokens.colors.accent.primary : tokens.colors.text.secondary,
                        fontFamily: tokens.fonts.mono, fontSize: 11, fontWeight: 500,
                        cursor: "pointer",
                      }}>{b}</button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Prediction Status Pills">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { label: "CSK ✓", status: "correct", bg: tokens.colors.success + "18", border: tokens.colors.success + "40", color: tokens.colors.success },
                  { label: "MI ✗", status: "wrong", bg: tokens.colors.danger + "18", border: tokens.colors.danger + "40", color: tokens.colors.danger },
                  { label: "CSK leading", status: "on-track", bg: tokens.colors.accent.soft, border: tokens.colors.accent.primary + "40", color: tokens.colors.accent.primary },
                  { label: "350-399", status: "in-danger", bg: tokens.colors.warning + "15", border: tokens.colors.warning + "40", color: tokens.colors.warning },
                  { label: "Awaiting...", status: "pending", bg: tokens.colors.pending + "15", border: tokens.colors.pending + "40", color: tokens.colors.pending },
                ].map(p => (
                  <div key={p.label} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: tokens.radius.full,
                    backgroundColor: p.bg, border: `1px solid ${p.border}`,
                    fontFamily: tokens.fonts.mono, fontSize: 11, fontWeight: 500, color: p.color,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", backgroundColor: p.color,
                    }} />
                    {p.label}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Input Field">
              <div style={{ maxWidth: 360 }}>
                <label style={{
                  display: "block", fontSize: 12, fontWeight: 500,
                  color: tokens.colors.text.secondary, marginBottom: 6,
                }}>Group Name</label>
                <input
                  type="text" placeholder="e.g. Office Cricket Gang"
                  style={{
                    width: "100%", padding: "12px 16px",
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.medium}`,
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.text.primary,
                    fontFamily: tokens.fonts.body, fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>
            </Section>
          </div>
        )}

        {/* ==================== PATTERNS ==================== */}
        {activeTab === "patterns" && (
          <div>
            <Section title="Live Score Ticker">
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 16, padding: "10px 20px",
                backgroundColor: tokens.colors.bg.card,
                borderRadius: tokens.radius.lg,
                border: `1px solid ${tokens.colors.border.light}`,
              }}>
                <span style={{
                  fontFamily: tokens.fonts.mono, fontSize: 9, fontWeight: 600,
                  color: tokens.colors.danger, textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    backgroundColor: tokens.colors.danger,
                    animation: "none",
                  }} />
                  LIVE
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600, color: tokens.colors.teams.CSK }}>CSK</span>
                  <span style={{ fontFamily: tokens.fonts.mono, fontSize: 16, fontWeight: 600 }}>172/4</span>
                  <span style={{ fontFamily: tokens.fonts.mono, fontSize: 11, color: tokens.colors.text.muted }}>(18.2)</span>
                </div>
                <div style={{ width: 1, height: 20, backgroundColor: tokens.colors.border.medium }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: tokens.fonts.display, fontSize: 13, fontWeight: 600, color: tokens.colors.teams.MI }}>MI</span>
                  <span style={{ fontFamily: tokens.fonts.mono, fontSize: 13, color: tokens.colors.text.muted }}>Yet to bat</span>
                </div>
              </div>
            </Section>

            <Section title="Points Badge">
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {[
                  { pts: "87", label: "Season Pts", color: tokens.colors.gold.primary, bg: tokens.colors.gold.soft },
                  { pts: "#2", label: "Rank", color: tokens.colors.accent.primary, bg: tokens.colors.accent.soft },
                  { pts: "67%", label: "Accuracy", color: tokens.colors.success, bg: tokens.colors.success + "15" },
                ].map(b => (
                  <div key={b.label} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "14px 24px", borderRadius: tokens.radius.lg,
                    backgroundColor: b.bg,
                    border: `1px solid ${b.color}25`,
                  }}>
                    <span style={{
                      fontFamily: tokens.fonts.mono, fontSize: 22, fontWeight: 700,
                      color: b.color, lineHeight: 1,
                    }}>{b.pts}</span>
                    <span style={{
                      fontFamily: tokens.fonts.body, fontSize: 10, color: tokens.colors.text.muted,
                      marginTop: 4,
                    }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Group Switcher (During Live Match)">
              <div style={{
                display: "inline-flex", gap: 0,
                backgroundColor: tokens.colors.bg.card,
                borderRadius: tokens.radius.lg,
                border: `1px solid ${tokens.colors.border.light}`,
                overflow: "hidden",
              }}>
                {[
                  { name: "Office Gang", rank: 2, active: true },
                  { name: "College Boys", rank: 1, active: false },
                  { name: "Family", rank: 4, active: false },
                ].map((g, i) => (
                  <button key={g.name} style={{
                    padding: "10px 18px", cursor: "pointer",
                    backgroundColor: g.active ? tokens.colors.accent.soft : "transparent",
                    border: "none",
                    borderRight: i < 2 ? `1px solid ${tokens.colors.border.subtle}` : "none",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{
                      fontFamily: tokens.fonts.body, fontSize: 12, fontWeight: 500,
                      color: g.active ? tokens.colors.accent.primary : tokens.colors.text.muted,
                    }}>{g.name}</span>
                    <span style={{
                      fontFamily: tokens.fonts.mono, fontSize: 10, fontWeight: 600,
                      padding: "2px 8px", borderRadius: tokens.radius.full,
                      backgroundColor: g.rank === 1 ? tokens.colors.gold.soft : tokens.colors.bg.elevated,
                      color: g.rank === 1 ? tokens.colors.gold.primary : tokens.colors.text.muted,
                    }}>#{g.rank}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Season Awards Badges">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { emoji: "🏆", label: "Season Champion" },
                  { emoji: "🎯", label: "Most Accurate" },
                  { emoji: "⚡", label: "Best Single Match" },
                  { emoji: "🎲", label: "Bold Predictor" },
                  { emoji: "📈", label: "Consistency King" },
                ].map(a => (
                  <div key={a.label} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderRadius: tokens.radius.full,
                    backgroundColor: tokens.colors.gold.soft,
                    border: `1px solid ${tokens.colors.gold.primary}30`,
                  }}>
                    <span style={{ fontSize: 14 }}>{a.emoji}</span>
                    <span style={{
                      fontFamily: tokens.fonts.display, fontSize: 11, fontWeight: 600,
                      color: tokens.colors.gold.primary,
                    }}>{a.label}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Design Tokens (CSS Variables)">
              <div style={{
                backgroundColor: tokens.colors.bg.input,
                borderRadius: tokens.radius.lg,
                border: `1px solid ${tokens.colors.border.light}`,
                padding: 20, fontFamily: tokens.fonts.mono, fontSize: 11,
                lineHeight: 2, color: tokens.colors.text.secondary,
                whiteSpace: "pre",
                overflowX: "auto",
              }}>
{`--bg-deep:       ${tokens.colors.bg.deep}
--bg-primary:    ${tokens.colors.bg.primary}
--bg-card:       ${tokens.colors.bg.card}
--bg-elevated:   ${tokens.colors.bg.elevated}
--bg-hover:      ${tokens.colors.bg.hover}
--bg-input:      ${tokens.colors.bg.input}

--accent:        ${tokens.colors.accent.primary}
--accent-soft:   ${tokens.colors.accent.soft}
--accent-glow:   ${tokens.colors.accent.glow}

--gold:          ${tokens.colors.gold.primary}
--gold-soft:     ${tokens.colors.gold.soft}

--success:       ${tokens.colors.success}
--danger:        ${tokens.colors.danger}
--warning:       ${tokens.colors.warning}
--pending:       ${tokens.colors.pending}

--text-primary:  ${tokens.colors.text.primary}
--text-secondary:${tokens.colors.text.secondary}
--text-muted:    ${tokens.colors.text.muted}

--font-display:  ${tokens.fonts.display}
--font-body:     ${tokens.fonts.body}
--font-mono:     ${tokens.fonts.mono}

--radius-sm:     ${tokens.radius.sm}px
--radius-md:     ${tokens.radius.md}px
--radius-lg:     ${tokens.radius.lg}px
--radius-xl:     ${tokens.radius.xl}px
--radius-full:   ${tokens.radius.full}px`}
              </div>
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}
