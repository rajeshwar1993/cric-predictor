# DSN-004: Share Card

**Phase:** 2 — Design System Components
**Dependencies:** DSN-001, DSN-002
**Estimated scope:** Screenshot-worthy result card for social sharing

---

## Description

Build the ShareCard component — a signature Electric Street component designed to be screenshot-worthy. Users share these in group chats to show off their rank and results. The card is rendered as a 1:1 square optimized for social sharing, with an option to export as an image.

---

## Acceptance Criteria

### ShareCard (`src/components/ui/share-card.tsx`)
- [ ] Background: linear gradient from `#111111` to `#1A1A1A`
- [ ] Border: `3px solid #C8E64A`
- [ ] Border-radius: 16px (card style)
- [ ] Aspect ratio: 1:1 (square, optimized for social sharing)
- [ ] Layout:
  - Large rank number (e.g., "#1") — Display style, Space Grotesk 700, very prominent
  - User display name — H2 style, uppercase
  - Stats row: correct count, points, match context (e.g., "MI vs CSK"), match number
  - Each stat in caption style with value above label
  - "BRAGG . IPL 2026" watermark text at bottom
- [ ] Bragg logo watermark: bottom-right, 20% opacity
- [ ] Props: `rank`, `displayName`, `correctCount`, `totalScenarios`, `points`, `matchTitle`, `matchNumber`, `seasonName`
- [ ] Export functionality: "Share Result" button generates a PNG via `html2canvas` or similar
- [ ] Mobile share: uses `navigator.share()` with the generated image as a file
- [ ] Desktop fallback: copies image to clipboard or downloads it

### Design Specs (from Electric Street)
- [ ] The card should look like a poster — bold, graphic, high-contrast
- [ ] Rank #1 gets extra flair (larger number, yellow accent `#FFD93D`)
- [ ] Other ranks use lime accent `#C8E64A`
- [ ] Dark gradient background makes the lime border and text pop
- [ ] Numbers use `tabular-nums` and Space Grotesk 700

---

## Files to Create

```
web-app/src/components/ui/
├── share-card.tsx
├── share-card.stories.tsx
```

---

## Technical Notes

### Implementation
```tsx
interface ShareCardProps {
  rank: number
  displayName: string
  correctCount: number
  totalScenarios: number
  points: number
  matchTitle: string       // e.g., "MI vs CSK"
  matchNumber: number      // e.g., 42
  seasonName: string       // e.g., "IPL 2026"
}

export function ShareCard({ rank, displayName, correctCount, totalScenarios, points, matchTitle, matchNumber, seasonName }: ShareCardProps) {
  return (
    <div className="aspect-square w-full max-w-[320px] relative overflow-hidden rounded-lg border-[3px] border-bragg-lime bg-gradient-to-b from-concrete-black to-dark-concrete p-6 flex flex-col justify-between">
      {/* Rank */}
      <div>
        <span className={cn(
          'font-display font-bold text-[72px] leading-none',
          rank === 1 ? 'text-sunburst-yellow' : 'text-bragg-lime'
        )}>
          #{rank}
        </span>
        <p className="font-display font-bold text-xl uppercase tracking-tight text-text-primary mt-2">
          {displayName}
        </p>
      </div>

      {/* Stats */}
      <div>
        <div className="flex gap-4 mb-4">
          <div>
            <span className="font-display font-bold text-lg text-bragg-lime tabular-nums">{correctCount}/{totalScenarios}</span>
            <p className="text-caption text-text-muted">Correct</p>
          </div>
          <div>
            <span className="font-display font-bold text-lg text-text-primary tabular-nums">{points}</span>
            <p className="text-caption text-text-muted">Points</p>
          </div>
          <div>
            <span className="font-display font-bold text-lg text-text-secondary">{matchTitle}</span>
            <p className="text-caption text-text-muted">Match {matchNumber}</p>
          </div>
        </div>
        <p className="text-caption text-text-muted">BRAGG . {seasonName}</p>
      </div>

      {/* Logo watermark */}
      <div className="absolute bottom-4 right-4 opacity-20 font-display font-bold text-[48px] text-text-primary leading-none">
        B
      </div>
    </div>
  )
}
```

### Image Export
Use `html2canvas` to render the card to a canvas, then convert to blob for sharing:
```typescript
import html2canvas from 'html2canvas'

async function exportShareCard(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#111111',
    scale: 2, // 2x for retina quality
  })
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'))
}
```

### Share Flow
```typescript
async function handleShare(cardRef: HTMLElement) {
  const blob = await exportShareCard(cardRef)
  const file = new File([blob], 'bragg-result.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'My Bragg Result' })
  } else {
    // Fallback: download the image
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bragg-result.png'
    a.click()
    URL.revokeObjectURL(url)
  }
}
```

### Dependencies
```bash
npm install html2canvas
```

### Where ShareCard Is Used
- Match leaderboard page (LDB-001) — "Share Result" button for each user's row (especially when user is #1)
- Can be triggered from match leaderboard or after match resolution

---

## Design System Reference

- `Screenshot 2026-04-08 at 22.38.56.png` — ShareCard visual reference showing rank #1, display name, stats, match context, and watermark

---

## Storybook Requirements

### ShareCard Stories
- `Rank1` — gold/yellow rank styling, top position
- `Rank2` — lime rank styling
- `Rank5` — regular rank
- `PerfectScore` — 19/19 correct
- `LowScore` — 5/19 correct
- `LongName` — truncation handling
- `ExportPreview` — shows what the exported PNG looks like
