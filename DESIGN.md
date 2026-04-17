# DESIGN.md — Stitch-style UI Design System

> Design reference for building an app with a UI inspired by Google Stitch.  
> **Aesthetic direction:** Refined minimalism × editorial calm × generative-tool seriousness.  
> The product should feel quiet, confident, and tool-like — not flashy, not playful. The canvas is dark, the typography does the talking, and color is used like punctuation.

---

## 1. Design Principles

1. **Darkness as canvas, not as theme.** The background is near-black so generated artifacts (previews, code, images) can sit on top with no visual competition. Avoid "dark mode" stereotypes (neon, glow, glassmorphism). This is *editorial dark*, closer to a cinema or a museum wall than a gaming UI.
2. **One object at a time.** Center-stage composition. The user's attention is pulled to a single hero element (welcome headline + input card). Everything else recedes: sidebar is low-contrast, chrome is nearly invisible.
3. **Typography over ornament.** There are no decorative borders, no drop shadows, no gradients in the base UI. Hierarchy is established by **size, weight, and color temperature** alone.
4. **Negative space is a feature.** Expect 40–60% of the viewport to be empty. Do not fill it.
5. **Accent color is a scalpel.** A single warm/cool accent (mint-green) appears only on the user avatar, active states, and the send action. Never on text blocks, never on backgrounds.
6. **Shapes are soft, edges are sharp.** Generous border-radius on interactive surfaces (12–24px), but hairline 1px borders — never thick strokes.

---

## 2. Color Tokens

Use CSS custom properties. All values below are the source of truth.

```css
:root {
  /* ── Surfaces ─────────────────────────────── */
  --surface-0:        #0F0F10;  /* Page background — the "void" */
  --surface-1:        #17181A;  /* Sidebar, subtle panels */
  --surface-2:        #1E2022;  /* Input card, elevated containers */
  --surface-3:        #2A2C2F;  /* Hover, active chip background */
  --surface-inverse:  #F5F5F4;  /* Rare — for light-mode islands */

  /* ── Text ─────────────────────────────────── */
  --text-primary:     #F2F2F0;  /* Headlines, main copy */
  --text-secondary:   #A8A8A5;  /* Labels, section headers in sidebar */
  --text-tertiary:    #6B6C6A;  /* Timestamps, meta, placeholder */
  --text-disabled:    #48494A;

  /* ── Accent ───────────────────────────────── */
  --accent:           #3DDC97;  /* Mint — avatar, send button, focus ring */
  --accent-hover:     #5AE5A8;
  --accent-muted:     #1F3D30;  /* For subtle backgrounds behind accent icons */

  /* ── Borders & Dividers ───────────────────── */
  --border-subtle:    rgba(255, 255, 255, 0.06);  /* Hairline panel edges */
  --border-default:   rgba(255, 255, 255, 0.10);  /* Input card outline */
  --border-strong:    rgba(255, 255, 255, 0.18);  /* Focused input */

  /* ── Suggestion / Chip fills ──────────────── */
  --chip-bg:          #1E2022;
  --chip-bg-active:   #2F3134;
  --chip-border:      rgba(255, 255, 255, 0.08);

  /* ── Status ───────────────────────────────── */
  --status-beta-bg:   #24262A;
  --status-beta-text: #C8C9C6;
}
```

**Rules of use**
- Body background: `--surface-0`. Never pure `#000`.
- Cards and input containers: `--surface-2` with a 1px `--border-default` outline. No shadows.
- Text on `--surface-0`: use `--text-primary` for headlines only; `--text-secondary` for everything utilitarian.
- Accent color appears at most **3 times per screen**. If it's on the send button, don't also use it on a link.

---

## 3. Typography

Stitch uses Google Sans Display (not publicly licensed). The closest open equivalents that preserve the feel:

```css
/* Load in <head> */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Geist', 'Google Sans Display', system-ui, sans-serif;
  --font-body:    'Geist', 'Inter', system-ui, sans-serif;
  --font-mono:    'Geist Mono', 'JetBrains Mono', monospace;
}
```

> **Alternative pairings** if you want more character: `Instrument Sans` for display + `Geist` for body. Do **not** use Space Grotesk, Inter alone, or Roboto — those read as generic.

### Type scale

| Role                     | Size    | Weight | Line-height | Tracking  | Example            |
|--------------------------|---------|--------|-------------|-----------|--------------------|
| Display / Welcome        | 56–72px | 400    | 1.05        | -0.02em   | "Welcome to…"      |
| H1                       | 40px    | 500    | 1.1         | -0.015em  | Page titles        |
| H2                       | 28px    | 500    | 1.2         | -0.01em   | Section headers    |
| H3                       | 20px    | 500    | 1.3         | -0.005em  | Card titles        |
| Body                     | 15px    | 400    | 1.55        | 0         | Default paragraph  |
| Body-sm                  | 13px    | 400    | 1.5         | 0         | Helpers, meta      |
| Label / Sidebar section  | 12px    | 500    | 1.4         | 0.02em    | "Recent", "Today"  |
| Caption                  | 11px    | 400    | 1.4         | 0.04em    | Timestamps         |

**Display treatment.** The welcome headline (`"Welcome to <Product>.."`) uses weight **400**, not bold. The lightness is the whole point — it signals a tool that takes itself seriously without shouting. Ending punctuation `..` (two dots) is a deliberate stylistic choice; keep it or drop it consistently per product voice.

---

## 4. Layout

### Global structure

```
┌──────────────────────────────────────────────────────────┐
│  TOPBAR  (56px, transparent, no border)                  │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ SIDEBAR  │              MAIN CANVAS                      │
│ 240px    │     (centered content, max-width 820px)       │
│          │                                               │
│          │     [Welcome headline]                        │
│          │     [Suggestion pill]                         │
│          │     [Input card — 720px wide, centered]       │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

### Spacing scale (4px base)

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  24px;
--space-6:  32px;
--space-8:  48px;
--space-10: 72px;
--space-12: 96px;
```

- Distance from topbar to welcome headline: `var(--space-12)` minimum.
- Headline → suggestion pill: `var(--space-5)`.
- Suggestion pill → input card: `var(--space-4)`.
- Sidebar inner padding: `var(--space-5)`.
- Sidebar section spacing (Recent / Yesterday / etc.): `var(--space-8)` between groups.

### Radius scale

```css
--radius-sm:  8px;   /* Small chips, badges */
--radius-md:  12px;  /* Buttons, pills */
--radius-lg:  16px;  /* Input card, major containers */
--radius-xl:  24px;  /* Hero cards, modals */
--radius-full: 999px; /* Circular: avatar, send button, segmented chips */
```

---

## 5. Component Specs

### 5.1 Topbar

- Height 56px, horizontal padding 20px, background fully transparent.
- Left: wordmark (18px, weight 500) + `BETA` badge.
  - Badge: `--status-beta-bg`, text `--status-beta-text`, 10px uppercase, letter-spacing 0.06em, padding 2px 8px, `--radius-full`.
- Right: icon buttons (32×32, `--text-secondary`, hover → `--text-primary`), then `Docs` text link, then circular avatar (32×32, `--accent` background, single-letter initial, weight 600, `--surface-0` text color).
- No border-bottom. Separation from content is done with whitespace, not a line.

### 5.2 Sidebar

- Width 240px, background `--surface-1` OR transparent (design can go either way — Stitch uses transparent with slight tonal shift).
- Top tabs: two-up segmented control ("My Projects" / "Shared with me"). Active tab uses `--surface-3` background + `--radius-full`. Inactive is transparent with `--text-secondary`.
- Below: time-grouped sections. Section headers are `--text-secondary`, 12px, weight 500, no uppercase, padding-top `var(--space-8)`.
  - Sections: **Recent**, **Yesterday**, **Past 30 days**, **This year**, **Last year**.
- Project entries: single line, 14px, `--text-primary`, truncate with ellipsis. Hover: background `rgba(255,255,255,0.04)`, `--radius-md`, full-width inside a 8px inset.
- **No icons next to project names.** The calm of the sidebar depends on this restraint.

### 5.3 Welcome Headline

- Font: `--font-display`, 64px desktop / 40px mobile, weight 400, `--text-primary`.
- Wraps to 2 lines deliberately (`max-width: 520px`). The line break is part of the composition.
- Appears only on the empty/home state.

### 5.4 Suggestion Pill (above input)

- A single floating pill presenting a rotating prompt suggestion.
- Background `--chip-bg`, border 1px `--chip-border`, `--radius-full`, padding `8px 16px`, text 13px `--text-secondary`.
- Truncates with `…` after ~40 chars.
- On click: populates the input below. On hover: background → `--chip-bg-active`, cursor pointer.
- Cycles every 6s with a 200ms crossfade (opacity only, no slide).

### 5.5 Input Card (the hero)

This is the single most important component. It's the product's signature.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   Describe what you want to build…                       │  ← textarea, 3 lines min
│                                                          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [+]  [📱 App | 🖥 Web]              [💬] [✨ 3.1 Pro ▾] [↑] │  ← action bar
└──────────────────────────────────────────────────────────┘
```

- Container: `--surface-2`, 1px `--border-default`, `--radius-lg`, width 720px (max 92vw), min-height 180px.
- Internal padding: 20px top/sides, 12px bottom row.
- Textarea: transparent, no border, placeholder `--text-tertiary`, `--text-primary` on input, font-size 15px, line-height 1.55. Auto-grows up to 8 lines then scrolls internally.
- Divider between textarea and action row: `1px solid --border-subtle`, full width (no inset).
- **Left action cluster:**
  - `+` attach button: 32×32, transparent, rounded-full, `--text-secondary`, hover → `--surface-3`.
  - Segmented mode toggle (`App` / `Web`): two pills sharing a single rounded-full container `--surface-3`. Active pill gets `--surface-2` fill, inactive is transparent. Icons 14px, text 13px weight 500.
- **Right action cluster:**
  - Comment/chat icon (32×32 ghost button).
  - Model picker: pill-shaped button, `--surface-3` bg, 13px `--text-primary`, sparkle icon at left (`--accent`), chevron at right. On click: dropdown anchored to the button.
  - Send button: 36×36 circular, `--accent` background, `--surface-0` arrow icon. Disabled state: `--surface-3` bg, `--text-disabled` icon. On hover (enabled): `--accent-hover`.
- **Focus state** on the whole card: `--border-default` → `--border-strong`. **No glow, no accent ring.** The border darkening is the signal.

### 5.6 Buttons

| Variant   | BG                | Text/Icon          | Border            | Use                      |
|-----------|-------------------|--------------------|-------------------|--------------------------|
| Primary   | `--accent`        | `--surface-0`      | none              | Send, Create, Submit     |
| Secondary | `--surface-2`     | `--text-primary`   | 1px `--border-default` | Cancel, secondary CTA |
| Ghost     | transparent       | `--text-secondary` | none              | Icon buttons, nav        |
| Chip      | `--chip-bg`       | `--text-secondary` | 1px `--chip-border` | Suggestions, tags      |

All buttons use `--radius-md` by default, `--radius-full` for circular or pill shapes. Height: 36px default, 32px compact, 44px large. Transition `background 160ms ease, border-color 160ms ease`.

### 5.7 Icons

- Use [Lucide](https://lucide.dev) — clean, consistent, 1.5px stroke. Matches Stitch's reduced aesthetic.
- Default size 16px, with 18px for primary actions and 14px for dense chips.
- Stroke color inherits from `currentColor`; set on the parent.
- **Never** mix icon libraries. **Never** use filled variants alongside outline.

---

## 6. Motion

Restraint is the rule. Stitch does not dance.

```css
--ease-standard:  cubic-bezier(0.2, 0, 0, 1);     /* Material-standard */
--ease-emphasized: cubic-bezier(0.3, 0, 0, 1);    /* Entry */
--ease-exit:      cubic-bezier(0.4, 0, 1, 1);     /* Exit */

--duration-fast:  120ms;   /* Hover, focus */
--duration-base:  200ms;   /* Most transitions */
--duration-slow:  320ms;   /* Panel open, card appear */
```

**What animates**
- Hover color/background shifts: `--duration-fast`.
- Input card border on focus: `--duration-base`.
- Suggestion pill text swap: 200ms opacity crossfade.
- Sidebar project hover: background fade only.
- Page load: welcome headline fades up 8px over `--duration-slow`, input card follows with 80ms stagger.

**What does NOT animate**
- No parallax.
- No scroll-triggered reveals on long pages.
- No bouncy springs.
- No shimmering gradients.
- No loading spinners in the main UI — use a pulsing dot (opacity 0.4 ↔ 1, 1.2s).

---

## 7. Empty & Loading States

- **Empty project list sidebar:** sections render with their headers but no entries; no "No projects yet" copy. The silence is the message.
- **Generating state (after submit):** input card becomes non-editable, border dims to `--border-subtle`, a single line of `--text-secondary` appears below the card: `"Thinking…"` with a trailing pulsing dot.
- **Error state:** replaces the "Thinking" line with the error copy in `--text-primary` and a small retry chip on the right. No red, no icons, no toast. The failure reads as calm and resolvable.

---

## 8. Responsive Behavior

- **≥ 1200px:** full layout as spec'd. Sidebar 240px, canvas centered.
- **768–1199px:** sidebar collapses to 56px icon-rail; labels hidden. Input card width shrinks to `min(720px, 92vw)`.
- **< 768px:** sidebar becomes a bottom sheet triggered by a top-left menu button. Welcome headline 40px. Input card stretches to full width minus 16px gutters. Action bar wraps: segmented toggle on first row, model picker + send on second.

---

## 9. Accessibility

- All interactive elements have visible focus: 2px outline `--accent`, 2px offset, `--radius-md` matching the element. The focus ring is the *only* place `--accent` touches borders.
- Text on `--surface-0`: `--text-primary` passes AA at all sizes, `--text-secondary` passes AA for body+, AA Large for 14px+.
- Minimum hit target: 36×36. Ghost icon buttons use invisible padding to meet this.
- Respect `prefers-reduced-motion: reduce` — all transitions drop to 0ms, only opacity changes preserved.

---

## 10. Do / Don't Checklist

✅ **Do**
- Use 400-weight for display type.
- Let at least half the viewport be empty.
- Keep the accent color rare and intentional.
- Use hairline borders and soft radii together.
- Treat the input card as the product's hero.

❌ **Don't**
- Add gradients to text or backgrounds.
- Use more than one accent color.
- Stack shadows on cards.
- Render the sidebar with heavy icons or colors.
- Animate things "because you can."
- Use pure black (`#000`) or pure white (`#FFF`) anywhere.

---

## 11. Quick-start HTML skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your App</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
  <!-- tokens from §2 and §3 in :root -->
</head>
<body>
  <header class="topbar"> … </header>
  <aside class="sidebar"> … </aside>
  <main class="canvas">
    <h1 class="welcome">Welcome to<br/>Your App..</h1>
    <button class="suggestion-pill">A trip packing checklist app that sugge…</button>
    <section class="input-card">
      <textarea placeholder="Describe what you want to build…"></textarea>
      <div class="action-bar">
        <div class="left"> <button class="ghost">+</button> <div class="segmented">…</div> </div>
        <div class="right"> <button class="ghost">💬</button> <button class="model-pill">3.1 Pro</button> <button class="send">↑</button> </div>
      </div>
    </section>
  </main>
</body>
</html>
```

---

**End of DESIGN.md**  
Build slowly. Cut everything twice. The best version of this UI is the one with the fewest elements on the screen.
