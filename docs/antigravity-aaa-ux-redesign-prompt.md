# Antigravity Prompt — AAA Game-Grade UX Redesign: Hex Titanium

> This is a **redesign**, not a patch. Do not "fix" the current tables.
> Replace the information architecture. Copy everything below the line.

---

## THE BRIEF

Redesign the Hex Titanium client so its **data presentation and interaction
model** feel like a AAA game menu (Genshin Impact / Honkai / Persona), while
staying a fast, offline, Indonesian-language workshop tool.

**Not the art style.** No anime art, no fantasy fonts, no particle effects.
What we want is the *UX grammar*:

- **Object-first, not form-first.** The user picks a motorcycle from a visual
  roster, not a `<select>`.
- **Master–detail.** A persistent selected object with an inspect panel.
- **Progressive disclosure.** Summary → detail → raw data. Never dump
  everything at once.
- **Loadout metaphor.** Bolt positions are equipment slots; packages are
  preset loadouts.
- **Quest metaphor.** A pick session is a tracked quest with progress.
- **One dominant action per screen**, always in the thumb zone.
- **Juice.** Hover lift, selection ring, count-up numbers, animated progress,
  skeleton loading, toasts. 60 fps, no layout shift.

## THE DOMAIN MAPPING (use this language internally)

| Workshop object | Game concept | UI treatment |
|---|---|---|
| Motorcycle type | Character | Roster card with portrait, name, year, stat pills |
| Brand | Faction / element | Filter chips with counts |
| Bolt position | Equipment slot | Slot card with icon, bolt count, side |
| Bolt spec | Weapon / artifact | Item card with rarity color, code, size, qty |
| Package | Loadout preset | Preset cards: Lengkap / Mesin / Pengereman |
| Pick session | Quest / expedition | Quest tracker with progress bar and reward (print) |
| Dashboard | Adventurer's handbook | Progress rings, recent quests, completeness |
| Admin tools | Guild workshop | Master–detail editor, not raw tables |

## HARD ANTI-PATTERNS (do not ship these)

1. ❌ A 7-column `<table>` as the primary mobile view.
2. ❌ A `<select>` dropdown as the only way to choose a motorcycle.
3. ❌ Metrics cards + tabs + table all visible at once.
4. ❌ Raw DB enums (`COMPLETED`, `NONE`, `LEFT`, `RBAC`) in the UI.
5. ❌ `window.alert()` / `window.confirm()`.
6. ❌ A screen with no single obvious primary action.
7. ❌ Blank white screen while loading.
8. ❌ Destructive action one mis-tap from a frequent action.
9. ❌ More than 3 levels of nesting before the user can act.
10. ❌ New dependencies without asking.

## SCREEN BLUEPRINTS

### A. `/pick-list` — Roster (the new home)

```
┌──────────────────────────────────────────────────────────────┐
│ HEX TITANIUM      [🔍 Cari motor...]      [Riwayat] [Profil] │
├──────────────────────────────────────────────────────────────┤
│ [Semua 20] [Honda 8] [Yamaha 7] [Suzuki 3] [Kawasaki 2]      │
│                                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│ │  foto   │ │  foto   │ │  foto   │ │  foto   │             │
│ │ NMAX    │ │ Vario   │ │ Beat    │ │ Aerox   │             │
│ │ 155     │ │ 160     │ │ 110     │ │ 155     │             │
│ │ 24 baut │ │ 18 baut │ │ 12 baut │ │ 20 baut │             │
│ │ [Pilih] │ │ [Pilih] │ │ [Pilih] │ │ [Pilih] │             │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
└──────────────────────────────────────────────────────────────┘
```

Rules:
- Cards are the primary navigation. Grid: 2 cols mobile, 3–4 desktop.
- Card = image (or branded placeholder), display name, year, `N baut`,
  completeness dot. Hover: lift 2px + border accent. Selected: 2px ring.
- Search filters live (debounced 150 ms). Brand chips show counts.
- Empty state: "Belum ada motor yang cocok. Coba kata kunci lain."
- Skeleton cards while loading, never a blank screen.
- Tapping a card opens the **Inspect panel** (B), not a new page.

### B. Inspect panel — Motorcycle detail

Desktop: right-side panel (420–480 px) sliding in, roster stays visible.
Mobile: bottom sheet at 92dvh, drag handle, scrollable body, sticky footer.

```
┌──────────────────────────────────────────────┐
│  NMAX 155 Connected (2020–2024)         [X]  │
│  ┌────────┐  Ringkasan | Titik | Paket       │
│  │  foto  │  ┌────────────────────────────┐  │
│  │        │  │ 24 baut · 8 ukuran · 5–10m │  │
│  └────────┘  │ ◔ kelengkapan 100%         │  │
│              └────────────────────────────┘  │
│  Titik Pasang (8)                            │
│  ┌──────────────┐ ┌──────────────┐           │
│  │ Cover CVT    │ │ Kaliper Depan│           │
│  │ 6 baut · Kiri│ │ 2 baut · Depan│          │
│  └──────────────┘ └──────────────┘           │
│  Paket: [Lengkap ✓] [Mesin] [Pengereman]     │
│                                              │
│  [ Buka Daftar Ambil Baut → ]   ← sticky     │
└──────────────────────────────────────────────┘
```

Rules:
- Tabs: **Ringkasan** (stats + completeness), **Titik Pasang** (slot cards),
  **Paket** (preset cards). Only one tab's content at a time.
- Package selection updates the summary live (total pcs, sizes, time).
- Primary CTA pinned to the bottom, `min-h-[52px]`, full width on mobile.
- `Esc` closes; focus returns to the roster card.

### C. `/pick-list` result — Quest board / inventory

After "Buka Daftar Ambil", replace the table with **item cards**.

```
┌──────────────────────────────────────────────────────────────┐
│ ← NMAX 155 · Lengkap Satu Motor       [Cetak] [Mulai →]      │
│ 24 baut · 8 ukuran · estimasi 5–10 menit                     │
├──────────────────────────────────────────────────────────────┤
│ [Per Rak (8)] [Per Titik (12)]          [🔍 Cari ukuran...]  │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [foto]  HEX-M6-25-FL          M6 × 25 mm      [ 8 pcs ]  │ │
│ │         Flange · Titanium     Cover CVT, Bak CVT         │ │
│ │         ▸ 3 titik pasang                                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [foto]  HEX-M8-30-FL          M8 × 30 mm      [ 2 pcs ]  │ │
│ │         Flange · Titanium     Kaliper Depan              │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ 8 ukuran · 24 pcs          [ Cetak ] [ Mulai Checklist → ]   │
└──────────────────────────────────────────────────────────────┘
```

Rules:
- Item card: image/icon, code, size, head/finish, quantity badge (large,
  right-aligned), position tags. Tap card → detail sheet with photo + specs.
- Quantity badge is the visual anchor: `text-2xl font-mono font-bold`.
- Rarity color by bolt diameter (M6 / M8 / M10 / M12) — consistent, subtle,
  never the only signal (always show the text).
- Segmented control switches **Per Rak** (consolidated) ↔ **Per Titik**
  (position breakdown). Animate the content swap 150 ms.
- Sticky bottom action bar: total summary + Cetak + Mulai Checklist.
- Print view stays a clean table (print is the one place a table is correct).

### D. `/pick-list/:sessionId` — Quest tracker

```
┌──────────────────────────────────────────────────────────────┐
│ ← Sesi #42 · NMAX 155                     [Cetak]            │
│ ████████████████░░░░░░░░  12/24 diambil (50%)                │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [✓] [foto] HEX-M6-25-FL  M6×25  8 pcs  Cover CVT         │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [ ] [foto] HEX-M8-30-FL  M8×30  2 pcs  Kaliper Depan     │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ 12/24 selesai              [ Selesaikan Pengambilan ]        │
└──────────────────────────────────────────────────────────────┘
```

Rules:
- Progress bar animates on every check; percentage counts up.
- Checked row: green tint, strikethrough code, check icon pops (scale 1→1.15→1).
- Optimistic toggle with rollback on failure + toast.
- "Selesaikan" disabled until 100%, or opens a confirm dialog explaining
  what is still unchecked.
- Completion state: celebratory but restrained — progress ring fills,
  summary card, "Cetak" + "Kembali ke Roster".

### E. `/dashboard` — Adventurer's handbook

- Top row: 3 progress rings (Kelengkapan Data, Sesi Hari Ini, Motor Aktif).
- "Lanjutkan Sesi Terakhir" hero card if an in-progress session exists.
- Recent sessions as quest cards, not a table.
- Completeness warnings as actionable cards ("3 motor belum punya data baut
  → Lengkapi").

### F. Admin — Guild workshop

- Keep tables for bulk data entry (admins need density), but wrap them in a
  master–detail layout: list on the left, edit form on the right.
- Inline validation, sticky save bar, unsaved-changes guard.
- Replace all `alert`/`confirm` with `Toast` + `ConfirmDialog`.

## COMPONENT LIBRARY (build these first)

Create in `client/src/components/ui/`:

| Component | Purpose |
|---|---|
| `AppShell.vue` | Top bar + content + optional action bar |
| `RosterCard.vue` | Motorcycle card (image, name, stats, selected ring) |
| `ItemCard.vue` | Bolt card (image, code, size, qty badge, tags) |
| `SlotCard.vue` | Position card (name, side, bolt count) |
| `PresetCard.vue` | Package card (name, type, item count, selected) |
| `StatPill.vue` | Small metric (icon + value + label) |
| `ProgressRing.vue` | SVG ring with animated stroke |
| `ProgressBar.vue` | Animated horizontal bar |
| `SegmentedControl.vue` | Animated tab switcher |
| `DetailSheet.vue` | Right panel / bottom sheet with focus trap + Esc |
| `ActionBar.vue` | Sticky bottom bar with summary + primary CTA |
| `SearchInput.vue` | Debounced search with clear button |
| `FilterChip.vue` | Brand/category chip with count |
| `EmptyState.vue` | Icon + title + hint + action |
| `SkeletonCard.vue` | Shimmer placeholder |
| `Toast.vue` + `useToast.js` | Success/error notifications |
| `ConfirmDialog.vue` | Accessible confirm with danger variant |

## DESIGN TOKENS

Add to `tailwind.config.js` / `style.css`:

- **Spacing:** 4, 8, 12, 16, 24, 32, 48.
- **Radius:** `xl` 12, `2xl` 16, `3xl` 24.
- **Type:** 12 / 14 / 16 / 20 / 24 / 32; body ≥ 14 px on mobile.
- **Motion:** 150 ms (micro), 200 ms (panel), 300 ms (progress), ease-out.
- **Elevation:** 0 flat, 1 card, 2 sheet.
- **Color:** neutral zinc base + one titanium/amber accent + semantic
  emerald/rose/amber. Rarity tints for M6/M8/M10/M12.
- **Focus:** 2 px visible ring, never `outline-none` without replacement.

## INTERACTION RULES

- Every card is a `<button>`; hover lift 2 px; active scale 0.98.
- Selection ring 2 px accent + subtle glow.
- Detail sheet slides 200 ms; backdrop fades 150 ms; focus trapped.
- Numbers count up 400 ms on first render (respect `prefers-reduced-motion`).
- Progress bar/ring animates 300 ms.
- Skeleton on every async load; no blank screens.
- Success → toast; failure → inline banner with "Coba Lagi".
- Keyboard: arrows move roster focus, Enter opens, Esc closes, Tab trapped
  in sheets.
- `prefers-reduced-motion`: disable transforms/count-ups, keep opacity.

## DATA CONTRACTS (do not change the API)

- `GET /api/motorcycles` → `{ id, displayName, brand, model, variant,
  yearStart, yearEnd, images[], _count: { requirements, packages } }`
- `GET /api/motorcycles/:id` → adds `requirements[]` and `packages[]`.
- `POST /api/pick-lists/generate` → `{ motorcycle, package, summary,
  consolidatedTotals[], positionBreakdown[] }`
- `POST /api/pick-lists/sessions` → session with `items[]`.
- `GET /api/pick-lists/sessions/:id` → session with `items[]`,
  `progressPercent`, `checkedItems`, `totalItems`.
- `GET /api/packages` → packages with `items[].boltSpec`.

If a field is missing, derive it client-side. Do not invent endpoints.

## IMPLEMENTATION ORDER

1. **Foundation:** tokens, `ui/` primitives, `useToast`, `ConfirmDialog`.
2. **Flagship:** rebuild `/pick-list` as Roster + Inspect + Quest board.
3. **Quest:** rebuild `/pick-list/:sessionId` as tracker.
4. **Handbook:** rebuild `/dashboard`.
5. **Admin:** master–detail wrappers, replace alert/confirm.
6. **Polish:** motion, skeletons, empty states, keyboard, reduced motion.

Ship each phase as a separate commit. Do not attempt all six in one pass.

## ACCEPTANCE CRITERIA (game-feel checklist)

- [ ] Core flow ≤ **4 taps**: pick motor → inspect → open list → start.
- [ ] No `<table>` is the primary view on mobile (print excepted).
- [ ] Every screen has exactly **one dominant CTA** in the thumb zone.
- [ ] Every data object has **3 layers**: summary → detail → raw.
- [ ] Roster cards show image, name, year, bolt count, completeness.
- [ ] Inspect panel has Ringkasan / Titik Pasang / Paket tabs.
- [ ] Item cards show code, size, qty badge, position tags.
- [ ] Session has animated progress + completion state.
- [ ] All async states have skeleton / empty / error variants.
- [ ] All modals/sheets: `role="dialog"`, `aria-modal`, Esc, focus trap.
- [ ] All touch targets ≥ 44×44 px; no horizontal overflow at 320 px.
- [ ] `prefers-reduced-motion` respected.
- [ ] `npm run build` passes; no new dependencies.
- [ ] Indonesian copy only; no DB enums or English jargon.

## RULES

- **Redesign, don't reskin.** If a screen still reads as a form + table,
  it is not done.
- **Preserve functionality.** No API/schema/auth/business-logic changes.
- **Preserve the brand.** Zinc/neutral, rounded, dark mode, Indonesian.
- **Mobile-first.** Verify at 360 px before desktop.
- **One concern per commit.** Report diffs and build result.
- **Ask before adding dependencies or restructuring the router.**
