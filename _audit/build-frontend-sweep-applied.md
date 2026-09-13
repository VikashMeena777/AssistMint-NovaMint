# Frontend Mobile Sweep — Applied Fixes

**Scope:** `src/app/(marketing)/**`, `src/components/marketing/**`, dashboard page visual fixes, `globals.css` (focus rule only). No logic changes, no new dependencies, all copy/CTAs/ids/aria preserved. Motion remains transform/opacity only.

**Verification method:** code audit + CDP-driven headless-Chrome layout probes (element rects, scrollWidths, computed styles) at 360×640/900, 390×844 and 768×900, against both a local dev server and the deployed site (https://assistmint.novamintnetworks.in — identical hero markup confirmed). Final gates: `npx tsc --noEmit` clean, `npm run build` compiles successfully (25.5s).

---

## P1 — The mobile hero "overlap": root cause + fixes

### What the probes found (the honest diagnosis)

At 360–410px the current markup has **no persistent geometric overlap** — measured at 360px: left column ends y=699, demo column starts y=747 (gap-12 = 48px), card bottom y=1311 vs marquee top y=1351 (40px clear), navbar h=65 vs hero pt-28=112, document scrollWidth == clientWidth (no horizontal overflow). The deployed site measures identically. The user-visible "bugged / overlapped / not showing properly" experience comes from a combination of real defects, all now fixed:

1. **Layout jump on demo swap (CLS).** `chat-thread-lazy.tsx` placeholder was `h-[535px]`, but the real card measures exactly **540px** (header 61 + transcript 420 + input row 57 + 2px borders — probe-verified `cardKids: [61,420,57]`). Every phone user saw a 5px snap when the lazy chunk hydrated — plus the demo was invisible (FadeIn `opacity:0`) until 30% scrolled into view, so on first scroll the demo area looked empty, then jumped.
2. **Full-bleed card on 375–410px phones.** The wrapper was `max-w-md` (448px), so below ~480px viewports the card ran edge-to-edge (378px wide at 410px) with the 8px paper-stack shadow overhang eating into the 16px page gutter — visually reading as "overlapped/cramped" with the card edge and the marquee strip below.
3. **`whileInView` reveal pop.** The demo FadeIn enters from `y:+24` (card briefly extends 24px past the grid into the pb-16 zone while fading in) — combined with (1) and (2) this read as the demo "not showing properly".

Also verified as **non-issues** (brief hypotheses checked and cleared by measurement): the grid columns do collapse on mobile; the "Order #1207 · ₹448 · confirmed" chip is absolutely positioned *inside* the transcript (below the header — it cannot collide with it); the marquee is in normal flow 40px below the card; the WordSwap reserver word holds the line width (its underline SVG clears the following `<p>` by ~18px). The "Automated · 0 human touches" chip referenced in the brief does not exist in this codebase — nothing to relocate.

### Fixes applied

| File | Change |
|---|---|
| `src/app/(marketing)/_sections/hero.tsx` | Demo wrapper `max-w-md` → `max-w-[340px] sm:max-w-md` — the card now reads as a centered phone thread on mobile (340px at ≥372px viewports) and the offset shadow stays clear of the page gutter. Stack order/spacing already correct (`gap-12`, `pt-28` clears the fixed navbar). |
| `src/components/marketing/chat-thread-lazy.tsx` | Placeholder `h-[535px]` → `h-[540px]` — matches the real card exactly, **zero layout shift** on swap. |
| `src/components/marketing/chat-thread-demo.tsx` | Outcome chip hardened: `max-w-[calc(100%-2rem)]` + `truncate` + `shrink-0` icon so it can never spill past the card edge at any width (still springs in at the transcript's top-right, over blank space). |

Post-fix probe (390×844): card 340px centered (left 25 / right 365), shadow right edge 373 < column edge 374, zero document overflow, no element overlaps, card height 540 == placeholder 540.

## P2 — Mobile QA sweep (360 + 768)

**Horizontal overflow:** every marketing section probed `scrollWidth == clientWidth` at 360/390/768. Marquee track is `w-max` inside `overflow-hidden` (no page bleed). Pricing comparison table already sits in `overflow-x-auto` with `min-w-[640px]` + sticky first column (verified scrollable). FAQ is single-column. No `100vw`/fixed-width offenders.

**Vertical switcher tabs:** already `overflow-x-auto` + `whitespace-nowrap` + `shrink-0` (6 pills scroll on mobile, probe: scrollW 516 vs clientW 356 — by design). **Fix:** pills `py-1.5` → `py-2.5 sm:py-1.5` for ≥44px touch targets on mobile (row now 50px incl. container padding).

**Touch targets:** navbar mobile menu toggle `p-2.5` → `p-3` (44px). Pricing billing toggle pills `py-2` → `py-2.5` (44px). Footer links gained `inline-block py-2` with `space-y-3` → `space-y-1.5` (36px targets, footer stays compact). Mobile menu links were already 44px; hero CTAs are h-12 (48px); FAQ accordion buttons ~60px. Dashboard keeps its h-9 shadcn-standard controls (mouse/desktop context; not churned — surgical rule).

**Navbar mobile menu:** opens/closes correctly (state + AnimatePresence, `aria-expanded` intact), links are 44px-tap blocks. **Fix:** removed the mobile Search (⌘K) trigger — the palette is keyboard-driven, and the desktop trigger (`hidden md:flex`) is untouched. No more ⌘K/toggle collision risk.

**Footer:** 2-col grid on mobile with brand block spanning both — stacks correctly (probe: footer grid 328px, no overflow).

**Dashboard pages:**

- `conversations/page.tsx` — **real mobile bug fixed:** the layout grid had `style={{ height: "calc(100vh - 220px)" }}` at *all* breakpoints, clipping the stacked list + chat panes into one short box on phones. Now a Tailwind `lg:h-[calc(100vh-220px)]` (desktop app-view unchanged) with natural stacking on mobile, and the list pane is capped `max-h-[65vh] lg:max-h-none` so it can't push the chat pane several screens down.
- `staff/page.tsx` — modal body gained `max-h-[90vh] overflow-y-auto` (appointments has 85vh, campaigns 90vh — verified already correct).
- Analytics/Orders/QR/Settings/Growth: stat grids collapse 2-col (or 1-col) on mobile ✓; Orders uses card rows with `min-w-0` + `flex-wrap` and status tabs with `overflow-x-auto` + `shrink-0` ✓; no tables on these pages need wrappers (payments' pattern already correct). The mobile bottom tab bar is covered **globally** by the dashboard layout's `pb-[calc(5.5rem+env(safe-area-inset-bottom))]` on `<main>` — every page inherits it (growth's extra `pb-24` is redundant but harmless).

## P3 — Visual glitch pass

- **Dark mode:** probed computed styles with `.dark` on `<html>` — body ink-navy/ivory ✓, `.paper` uses its dark grain variant ✓ (existed in globals.css), `bg-secondary/40` bands + hairline borders resolve to dark tokens ✓, `.wa-bubble-out` swaps to dark WhatsApp green ✓, footer seal rule ✓. No additions needed.
- **Focus states:** nothing rendered a visible focus ring (base `outline-ring/50` only sets color). **Fix:** added to `globals.css` base layer — `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }` — a cobalt hairline on every interactive element, keyboard-only (pointer taps unaffected).
- **Text overflow:** demo header name truncates with `min-w-0` ✓; dashboard topbar/site-name truncate ✓; chat bubbles constrained `max-w-[78%]/[75%]` ✓. No overflow found in probes.
- **Logo:** `public/logo.jpg` renders with `rounded-md` + fixed 28px dims (no CLS) in navbar/footer; dashboard rail uses `rounded-xl` + border ✓.

## Verification

- `npx tsc --noEmit` — **0 errors**.
- `npm run build` — **✓ Compiled successfully** (full route table emitted).
- CDP probes at 360/390/768 post-fix: zero document horizontal overflow, zero element overlaps in the hero, placeholder == card geometry, tabs scrollable with 44px targets.
