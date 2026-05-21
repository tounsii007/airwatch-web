# UI primitives quick-reference

This is the leaf-level component library. Every page-level component
should compose from these instead of hand-rolling CSS. The primitives
share the brand's neon-glass aviation language so the UI feels coherent
across pages.

## Layout / chrome

| Primitive | When to use |
|-----------|-------------|
| `GlassPanel` | Bare surface — the glass-morphism material. No padding, no header. Use when you need the chrome but want to own the layout. |
| `Card` | Surface + opinionated layout (header / body / footer). Default first choice for any "panel of content". Pass `bare` to skip body padding when the content already paints its own padding. |
| `EmptyState` | Centred icon + title + body + action. Use whenever a list / grid is empty so the user sees an intentional placeholder, not a blank rectangle. |
| `Dialog` | Modal confirmation / form. Has scroll-lock, focus trap, Esc close. |
| `PageContainer` | Outer page-level wrapper — max-width + padding + optional title/subtitle. |

## Inputs

| Primitive | Use for |
|-----------|---------|
| `Button` | Solid call-to-action. Variants: `primary`, `secondary`, `ghost`, `danger`. |
| `IconButton` | Icon-only button. **Required**: `aria-label`. **Optional**: `tone` for active-state colour (`primary` / `info` / `accent` / `success` / `warning` / `error`). Hit area auto-expands to 44×44 px via `::after` even on `size="sm"`. |
| `Input` | Glass-styled text input with `leadingIcon` / `trailingIcon` / `clearable`. |
| `Switch` | On/off toggle. Replaces the deprecated local `Toggle`. |
| `SegmentedControl` | Mutually-exclusive picker (theme, units, schedule tabs). Replaces ChipGroup for typed string enums. |
| `Tabs` | Same idea, larger surface — use for top-of-page section switching. |

## Display

| Primitive | Use for |
|-----------|---------|
| `Tag` | Inline pill (status, count, code chip). Variants: `default`, `success`, `warning`, `error`, `info`, `muted`. Add `dot` for a leading status indicator. |
| `Avatar` | Logo / initials fallback. Pass `src`, `name`, `alt`. |
| `StatCard` | Big numeric tile with optional icon halo, delta pill, sparkline, holographic sheen. Use for dashboard / stats. |
| `StatusBadge` | Domain-typed flight status (`en-route`, `landed`, `delayed`, etc.). |
| `KeyValueRow` | "Label · value" pair row inside a Card. Optional `hint` and `copyable`. |
| `Sparkline` | Inline trend chart (e.g. inside a StatCard). |
| `NeonText` | Brand wordmark with neon glow + animated pulse. |
| `Kbd` | Keyboard shortcut hint chip (`⌘ K`). |

## Feedback

| Primitive | Use for |
|-----------|---------|
| `LoadingRadar` | Signature loader for heavy routes (map / globe / replay). Locale-aware defaults. |
| `Spinner` | Small inline spinner for buttons / inline waits. Prefer Skeleton for long waits. |
| `Skeleton` | Layout-stable placeholder while data loads. |
| `Tooltip` | Hover / focus reveal. |
| `toast` + `ToastContainer` | Imperative toast notifications (`toast.success`, `toast.warning`, etc.). |
| `LiveTicker` | Marquee strip of recent live events (live search page). |
| `ProgressBar` | Determinate (0–100) or indeterminate progress. |

## Motion

| Primitive | Use for |
|-----------|---------|
| `FadeIn`, `FadeUp`, `ScaleIn`, `Stagger` | Mount-in animations for sections. All animate-in once; respect `prefers-reduced-motion`. |
| `CountUp` | Animated numeric counter (StatCard uses it under the hood). |
| `TickingValue` | DOM-stable numeric value that flashes on change (used in flight details). |

## Conventions

- **Every interactive primitive has a localised `aria-label` via `t(...)`** — never hardcode an English label.
- **Decorative animations pause when the tab is hidden** — see `globals.css` `[data-page-visible="false"]` rule.
- **Touch targets meet WCAG 2.5.5 / 2.5.8** — `IconButton sm/md` extends its hit region via `::after`.
- **Reduced-motion respected** — `@media (prefers-reduced-motion: reduce)` neutralises all `animate-*` classes.
- **Brand palette via CSS variables** — never hardcode hex; use `var(--primary)`, `var(--accent)`, `var(--success)`, etc.

## Don't reach for

These existed historically but should not be used in new code:

- `Toggle` (in `app/(public)/settings/SettingPrimitives.tsx`) — **deleted**. Use `Switch`.
- Raw `<button>` for icon-only actions — use `IconButton`.
- `<span className="badge">` — use `Tag`.
- `<input>` for plain text fields — use `Input`.
