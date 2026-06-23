# Codex Relay Design System

## 1. Atmosphere & Identity

Codex Relay feels like a compact remote command surface: dark, dense, and quiet,
with enough chrome to make phone-sized work feel controlled instead of cramped.
The signature is practical instrument-panel layering: dark surfaces, subtle
translucent controls, and monospace URL/code details.

## 2. Color

### Palette

| Role                | Token                            | Light     | Dark      | Usage                               |
| ------------------- | -------------------------------- | --------- | --------- | ----------------------------------- |
| Surface/primary     | `Colors.dark.background`         | `#191919` | `#191919` | Main app background                 |
| Surface/secondary   | `Colors.dark.backgroundElement`  | `#2A2A2A` | `#2A2A2A` | Panels, inputs, preview frames      |
| Surface/selected    | `Colors.dark.backgroundSelected` | `#383838` | `#383838` | Selected rows and active controls   |
| Surface/translucent | `rgba(255, 255, 255, 0.04-0.12)` | same      | same      | Toolbars, soft action wells         |
| Text/primary        | `Colors.dark.text`               | `#F2F2F2` | `#F2F2F2` | Body, labels, button text           |
| Text/secondary      | `Colors.dark.textSecondary`      | `#9A9A9A` | `#9A9A9A` | Metadata, inactive controls, hints  |
| Border/subtle       | `rgba(132, 145, 165, 0.22-0.24)` | same      | same      | Preview frames and compact toolbars |
| Status/success      | `rgba(44, 163, 111, 0.12-0.16)`  | same      | same      | Successful operational states       |
| Status/error        | `rgba(216, 79, 79, 0.08-0.16)`   | same      | same      | Destructive/error states            |

### Rules

- Prefer existing `Colors`, `Fonts`, and `Spacing` constants in React Native code.
- Keep preview/tool surfaces dark and low-contrast; use borders for containment.
- Use raw `rgba(...)` only for existing translucency patterns not represented in
  `Colors`.

## 3. Typography

### Scale

| Level      | Size | Weight | Line Height | Tracking | Usage                             |
| ---------- | ---- | ------ | ----------- | -------- | --------------------------------- |
| Title      | 48px | 600    | 52px        | 0        | Large screen titles               |
| Subtitle   | 32px | 600    | 44px        | 0        | Section-level titles              |
| Body       | 16px | 500    | 24px        | 0        | Default readable text             |
| Small      | 14px | 500    | 20px        | 0        | Labels, supporting copy           |
| Small/bold | 14px | 700    | 20px        | 0        | Compact emphasis                  |
| Code       | 12px | 400    | natural     | 0        | URLs, paths, terminal/status text |

### Font Stack

- Primary: `Fonts.sans`, `Fonts.sansMedium`, `Fonts.sansSemiBold`, `Fonts.sansBold`
- Mono: `Fonts.mono`, `Fonts.monoMedium`
- Serif: available but not part of the core app surface.

### Rules

- URLs, paths, and protocol/status text use mono.
- Buttons use sans bold or the shared `Button` text context.

## 4. Spacing & Layout

### Base Unit

All spacing derives from the existing `Spacing` constants.

| Token           | Value | Usage                       |
| --------------- | ----- | --------------------------- |
| `Spacing.half`  | 2px   | Hairline offsets            |
| `Spacing.one`   | 4px   | Tight icon/toolbar gaps     |
| `Spacing.two`   | 8px   | Compact control gaps        |
| `Spacing.three` | 16px  | Standard horizontal padding |
| `Spacing.four`  | 24px  | Panel padding               |
| `Spacing.five`  | 32px  | Larger section spacing      |
| `Spacing.six`   | 64px  | Screen-level spacing        |

### Grid

- Mobile-first stacked layouts.
- Repeated tool controls should have stable dimensions (`36-44px`) to avoid
  layout shift.
- Preview frames use 8px radius unless an existing primitive dictates otherwise.

### Rules

- Keep control bars compact and single-row when possible.
- Text inside compact buttons must fit without truncating the primary action.

## 5. Components

### Compact Control Button

- **Structure**: shared `Button` with `size="icon"` or short text plus `Icon`.
- **Variants**: enabled, disabled, pressed, loading.
- **Spacing**: `Spacing.one` to `Spacing.two` gaps, stable 36-40px height.
- **States**: disabled uses reduced opacity and secondary text/icon color.
- **Accessibility**: always include `accessibilityLabel`.

### Preview Frame

- **Structure**: bordered dark container with embedded WebView/editor/terminal.
- **Spacing**: adjacent controls separated by `Spacing.two`.
- **States**: loading, error overlay, retry action, navigation controls.
- **Accessibility**: error action labels describe the result, not the visual.

## 6. Motion & Interaction

### Timing

| Type     | Duration  | Easing      | Usage                     |
| -------- | --------- | ----------- | ------------------------- |
| Micro    | 100-150ms | ease-out    | Press/haptic feedback     |
| Standard | 200-300ms | ease-in-out | Panel and tab transitions |

### Rules

- Prefer haptic selection on explicit toolbar actions.
- Keep new preview actions synchronous-looking: loading state, then either URL
  switch or inline error.

## 7. Depth & Surface

### Strategy

Mixed, but restrained: dark tonal surfaces with subtle borders; no decorative
shadows in preview/tool surfaces.

| Type           | Value                           | Usage                          |
| -------------- | ------------------------------- | ------------------------------ |
| Preview border | `1px rgba(132, 145, 165, 0.22)` | WebView/editor frames          |
| Soft toolbar   | `rgba(255, 255, 255, 0.055)`    | Bottom/control strips          |
| Soft action    | `rgba(255, 255, 255, 0.08)`     | Icon wells and compact actions |
