# Antigravity Prompt — Deep UI/UX Audit: Hex Titanium Bolt System

> Copy everything below the line into Antigravity. Attach/open the repo root.

---

## ROLE

You are a **senior product designer + frontend engineer** specializing in
**field-use, low-literacy, non-technical operator interfaces** on cheap Android
phones and shared shop desktops. You have deep knowledge of Fitts's Law, the
thumb-zone model, WCAG 2.2 AA, Nielsen's 10 heuristics, Hick's Law, and
mobile-first responsive design.

You are auditing a **real production tool used by real workshop staff**, not a
portfolio piece. Optimize for **speed, clarity, and zero-training usability** —
not visual novelty.

## PRODUCT CONTEXT

- **Product:** Hex Titanium — local web-based bolt specification & pick-list
  system for a motorcycle workshop in Bantul, Yogyakarta.
- **Stack:** Vue 3 (`<script setup>`), Vue Router, Pinia, Tailwind CSS 3,
  Lucide icons. Vite dev server. Backend Express + PostgreSQL on the shop LAN.
- **UI language:** Indonesian. Keep it Indonesian, plain, and non-technical.
- **Routes:** `/login`, `/pick-list`, `/pick-list/:sessionId`, `/dashboard`,
  `/motorcycles`, `/bolt-specs`, `/packages`, `/admin/import`,
  `/help/manual`.
- **Key files:** `client/src/App.vue`, `client/src/components/Sidebar.vue`,
  `client/src/components/ThemeToggle.vue`,
  `client/src/components/PhotoGalleryModal.vue`, all of
  `client/src/views/*.vue`, `client/src/style.css`,
  `client/tailwind.config.js`, `client/index.html`.
- **Constraints:** offline LAN, no cloud, no new paid services, no native app.
  Do not add dependencies without asking. Do not change business logic,
  API contracts, or database schema. Do not remove features.

## THE REAL USERS (design for these people, not for developers)

1. **Mas Dimas — Staff / picker, 19–28.** Primary user. Mid-range Android
   (360–430 px wide), one hand, standing, often **wearing gloves**, bright
   workshop glare, spotty Wi-Fi. Needs to go from "customer asks for part" to
   "printed/checked pick-list" in under a minute. Reads Indonesian, not
   English jargon. Will not read a manual before first use.
2. **Pak Joko — Owner / Admin, 45–60.** Desktop or laptop, low tech comfort,
   uses reading glasses. Manages motorcycles, bolt specs, imports CSV, checks
   dashboard. Needs obvious labels, forgiving forms, and confirmation before
   anything destructive.
3. **New hire — Day 1, zero training.** Must be able to complete the core
   pick-list flow **without being told anything**, using only what is on
   screen. This is the harshest test: if a screen needs explanation, it fails.
4. **Admin data-entry staff.** Enters many rows repeatedly. Needs density,
   keyboard efficiency, inline validation, and no accidental data loss.

## MISSION

Perform a **heavy, evidence-based UI/UX audit** of the entire client app, then
propose and (where safe) implement concrete improvements. Do not give generic
advice. Every finding must cite a **file and line**, a **measured value**, and
a **specific fix**.

## PART 1 — QUANTITATIVE MEASUREMENT (do the math, don't guess)

For every interactive element and every primary flow, measure and report:

### A. Movement distance & motor effort (Fitts's Law)
- Compute **Index of Difficulty** `ID = log2(2D / W)` for primary actions:
  distance `D` from the natural thumb rest / cursor rest position to the
  target, and target width/height `W`.
- Map the **thumb zone** on 360×800 and 412×915 viewports: mark each control
  as easy / stretch / hard reach. Flag any primary action in the top corners
  or bottom-far edge.
- Flag **long-travel patterns**: primary CTA far from the content it acts on;
  destructive actions adjacent to frequent ones; repeated back-and-forth
  between top filters and bottom lists; modals whose confirm button is far
  from the trigger.
- Count **taps/clicks per task** and **total pointer travel** for:
  login → pick motorcycle → generate pick-list → check items → print.
  Compare against a proposed reduced count.

### B. Touch targets & spacing
- Every tappable element must be **≥ 44×44 px** (WCAG 2.2 AA / Material 48 dp
  recommended). List every violation with its computed size.
- Check spacing between adjacent targets (≥ 8 px) to prevent mis-taps,
  especially in dense tables, icon buttons, and checklist rows.
- Check that glove-friendly targets are not relying on hover or precision.

### C. Responsive & device compatibility
- Test at **320, 360, 390, 412, 430, 768, 1024, 1280, 1440 px** widths.
- Report: horizontal overflow/scroll, clipped text, tables that break, modals
  taller than viewport, sticky headers overlapping content, iOS safe-area
  insets, `100vh` mobile browser-bar bugs, landscape orientation, and
  touch-vs-hover behavior.
- Verify the mobile drawer: open/close, backdrop, scroll lock, focus trap,
  back-button behavior, and that it closes on navigation.
- Verify desktop layout: sidebar stickiness, max-width, footer, and that the
  app does not look like a stretched phone UI.
- Check dark mode and light mode at both sizes; check contrast in both.

### D. Readability & accessibility
- Font sizes: flag body text < 14 px and any critical label < 12 px on mobile.
- Contrast ratios for text, icons, borders, disabled states, and status dots
  (target ≥ 4.5:1 text, ≥ 3:1 UI). Compute actual hex ratios.
- Keyboard: tab order, visible focus rings, Enter/Escape behavior, focus
  return after modal close.
- Screen reader: labels on icon-only buttons, `aria-*` on dialogs, form
  labels tied to inputs, live regions for async results/errors.
- Color is never the only signal (e.g. online/offline dot must have text).

## PART 2 — QUALITATIVE USABILITY (heuristic + persona walkthrough)

Evaluate every screen against **Nielsen's 10 heuristics** and report concrete
violations:

1. Visibility of system status (loading, saving, success, offline, sync).
2. Match to the real world (workshop language, not DB/technical terms).
3. User control & freedom (undo, cancel, back, safe destructive actions).
4. Consistency & standards (buttons, spacing, terminology, icon meaning).
5. Error prevention (validation before submit, confirmations, disabled states).
6. Recognition over recall (show context, don't make users remember codes).
7. Flexibility & efficiency (search, filters, recent items, keyboard, bulk).
8. Aesthetic & minimalist design (one primary action per screen).
9. Help users recover from errors (plain-Indonesian messages, what to do next).
10. Help & documentation (contextual hints, empty states, in-app SOP).

Then do a **silent first-run walkthrough** as the new hire:
- Can they find where to start within 5 seconds?
- Is the next action obvious on every screen?
- Are there dead ends, ambiguous labels, or unexplained icons?
- Is the primary CTA visually dominant and within thumb reach?
- Do empty, loading, error, and offline states all exist and make sense?

Also audit:
- **Hick's Law:** count choices per screen; flag overloaded nav, filter bars,
  and action clusters. Propose grouping/progressive disclosure.
- **Cognitive load:** jargon, abbreviations, codes shown before names,
  duplicate information, and anything requiring memorization.
- **Feedback:** every action must produce visible feedback within 100 ms;
  long operations need progress and a cancel path.
- **Forms:** label placement, input types (`inputmode`, `type=tel/number`),
  autofocus, inline errors, preserving input on failure, and preventing
  double-submit.
- **Destructive actions:** delete/deactivate/restore must be clearly separated,
  confirmed in plain language, and never one mis-tap away.
- **Print/export:** verify the pick-list prints cleanly (no nav, no dark
  background, correct page breaks, readable size).

## PART 3 — PERSONA-BASED LAYOUT REVIEW

For each persona, state the **top 3 jobs-to-be-done**, then judge whether the
current layout supports them:

- **Mas Dimas (mobile, gloves, one hand):** Is the pick flow reachable and
  fast? Are checklist rows big enough? Is the print/confirm action always
  reachable? Does it survive glare and a slow connection?
- **Pak Joko (desktop, low tech):** Are admin tables readable? Are forms
  self-explanatory? Is import failure explained in plain Indonesian with the
  exact row and reason? Is anything irreversible too easy to click?
- **New hire (day 1):** Can they finish the core task with zero instruction?
  Identify every point where they would have to ask a colleague.
- **Data-entry staff:** Is repeated entry fast? Are there keyboard shortcuts,
  sensible defaults, duplicate warnings, and no data loss on navigation?

## PART 4 — DELIVERABLES (produce all of these)

1. **Executive summary** — top 10 issues ranked by user impact × frequency,
   with a one-line fix each.
2. **Scored audit table** — columns: `ID | Screen | File:line | Issue |
   Evidence/measurement | Persona affected | Severity (Critical/High/Medium/
   Low) | Recommended fix | Effort (S/M/L)`.
3. **Fitts's Law table** — primary actions with `D`, `W`, `ID`, thumb-zone
   rating, and proposed target size/position.
4. **Responsive matrix** — screens × breakpoints, pass/fail with the exact
   failure (overflow, clip, overlap).
5. **Flow comparison** — current vs proposed taps, distance, and estimated
   time for the core pick-list flow.
6. **Prioritized roadmap** — P0 (blocks a non-technical user / accessibility
   failure), P1 (causes errors or slowdowns), P2 (polish). Group into
   implementable batches.
7. **Concrete patches** — for P0/P1, show the exact Tailwind/Vue diff. Prefer
   small, reviewable changes. Keep the existing visual language and dark mode.
8. **Acceptance criteria** — measurable pass conditions per fix (e.g. "all
   touch targets ≥ 44 px at 360 px", "no horizontal scroll at 320 px",
   "core flow ≤ 5 taps", "contrast ≥ 4.5:1").
9. **Verification** — run `npm run build` in `client/`; report the result.
   If you can run the dev server, capture before/after screenshots at 360 px
   and 1280 px for each changed screen.

## RULES OF ENGAGEMENT

- **Measure, don't vibe.** No finding without a file:line and a number.
- **Do not break functionality.** No API, schema, auth, or business-logic
  changes. No new dependencies without asking.
- **Preserve the design system.** Zinc/neutral palette, rounded-xl, subtle
  borders, dark mode, Indonesian copy. Improve hierarchy and ergonomics, not
  the brand.
- **Plain Indonesian copy.** Replace technical jargon with workshop language
  (e.g. "Ambil Baut", "Tipe Motor", "Bundling"). No English UI strings.
- **Mobile-first.** Every change must be verified at 360 px before desktop.
- **Accessibility is not optional.** WCAG 2.2 AA is the floor.
- **Ask before large refactors.** If a fix requires restructuring a view,
  propose it first with a diff sketch.
- **Do not invent data or fake screenshots.** If you cannot run the app, say
  so and mark measurements as estimated from source.
- **Work in small commits.** One concern per change, with a clear message.

## OUTPUT ORDER

1. What you inspected (files, routes, viewports, tools used).
2. Executive summary (top 10).
3. Full scored audit table.
4. Fitts's Law + responsive matrices.
5. Persona walkthroughs.
6. Prioritized roadmap.
7. Patches applied (with diffs) and build result.
8. Remaining recommendations + acceptance criteria.

Start by reading the files listed above and building a screen inventory. Then
audit, then fix P0/P1, then verify. Be exhaustive and specific.
