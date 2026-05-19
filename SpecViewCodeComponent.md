# Spec: ViewCodeComponent

## Purpose

`<view-code>` is a W3C custom element (Shadow DOM) that displays a titled, bordered view panel inline with page content. Users click the view body to widen it and click the title to narrow it, one fixed step per click. 

The view panel is wrapped with a div with 1rem padding and no border to act like a margin 
even when floated.

The view panel is a pre block which contains a code block.  the pre block wraps the code block with no additional spacing. The code block may contain a user supplied attribute language="..." to
enable prism styling.

---

## Element Registration

```js
customElements.define('view-code', ViewCode);
```

---

## Attributes

| Attribute          | Type   | Default         | Description                                      |
|--------------------|--------|-----------------|--------------------------------------------------|
| `width`            | string | `auto`          | Initial width of the code panel (any CSS length) |
| `height`           | string | `auto`          | Initial height of the code panel                 |
| `overflow-x`       | string | `auto`          | `auto`, `scroll`, or `hidden`                    |
| `bg-color`         | string | `var(--light)`  | Background of the view box                       |
| `title-bg-color`   | string | `#aaa`          | Background of the title bar                      |
| `background-color` | string | `var(--light)`          | Background of the code panel                     |
| `color`            | string | `var(--dark)`   | Foreground (text) color of the code panel        |
| `font-family`      | string | (inherit)       | Font family applied to the code panel            |
| `font-size`        | string | (inherit)       | Font size applied to the code panel              |
| `code-padding`     | string | `0.75rem 1rem`  | Padding inside the code panel                    |
| `highlight`        | string | (none)          | Set to `prism` to enable Prism.js highlighting   |
| `language`         | string | (none)          | Prism language class, e.g. `javascript`, `cpp`   |
| `trim`             | bool   | false           | Strip leading/trailing blank lines from content  |
| `normalize-indent` | bool   | false           | Remove common leading whitespace from all lines  |
| `step-px`          | number | `40`            | Pixels per width step when clicking              |
| `min-width`        | number | `240`           | Minimum width in pixels when narrowing           |

---

## Shadow DOM Structure

```
:host (inline-block)
└── div.wrapper          ← outer padding, page-background-color
    └── div.view         ← border, box-shadow, flex column, width owner
        ├── div.title    ← slot (default), click to narrow
        └── div.code
            ├── pre#pre-internal   ← non-Prism render target (width: 100%)
            │   └── code#code-internal
            └── slot[name="code"]  ← Prism render target (width: 100% via _harmonizeBox)
```

---

## Content Slots

### Default slot (title text)

Inline content of the element becomes the title bar text.

### Named slot `code`

Accepts a `<template>`, `<pre>`, `<code>`, or plain text node as the code to display.

- Non-Prism mode: the component reads the slot and places text content into `#code-internal` (the `<code>` element inside `#pre-internal`).
- Prism mode (`highlight="prism"`): the slot's `<pre><code>` is rendered in place; Prism.js highlights it if loaded.

---

## Behavior

### Width stepping

- Click code body: widen by one step (`step-px` attribute, default 40 px).
- Click title: narrow by one step.
- Minimum width: 240 px (`min-width` attribute).
- Width is owned by `div.view`; the `<pre>` fills it at `width: 100%`.
- Baseline is captured from `div.view.getBoundingClientRect()` on first click.

### Slot change

Re-runs the full update pipeline when slot content changes dynamically.

### Attribute change

Re-runs the full update pipeline when any observed attribute changes.

---

## CSS Custom Properties (internal)

Set on `:host` during `_applyBoxColors()`:

| Property           | Controlled by attribute |
|--------------------|------------------------|
| `--view-bg`        | `bg-color`             |
| `--title-bg`       | `title-bg-color`       |
| `--code-bg`        | `background-color`     |
| `--code-fg`        | `color`                |
| `--code-padding`   | `code-padding`         |
| `--code-height`    | `height`               |
| `--code-overflow-x`| `overflow-x`           |

---

## Inline Style Notes

- `font-size` is an inherited CSS property and cascades through the shadow DOM boundary, so `style="font-size: 0.9rem"` on the host element works. The `font-size` attribute also works and applies directly to the `<pre>` and `<code>` elements.
- `height` is not inherited. Setting `style="height: ..."` on the host constrains the host box only and does not reach `#pre-internal`. Use the `height` attribute instead.
- `--title-font-size` is a CSS custom property read by the title's shadow CSS rule (`font-size: var(--title-font-size, 1rem)`). Set it on the host via `style="--title-font-size: 1.2rem"` or in page CSS to override the title font size.

---

## Dependencies

- **Prism.js** — optional; load both files below before the component script when `highlight="prism"` is used.
  - `../js/prism.js`
  - `../css/prism.css`
- No other runtime dependencies.

---

## File Layout

```
ViewCodeComponent/
  js/
    ViewCode.js           ← component definition
  css/
    ViewCode.css          ← host-page placement helpers
  ViewCodeComponent.html  ← demo / test page
```

---

## Usage Examples

### Plain text (no highlighting)

```html
<script src="ViewCodeComponent/js/ViewCode.js" defer></script>

<view-code width="40rem" bg-color="var(--light)" title-bg-color="#ccc" trim normalize-indent>
  Figure 1. HTML fragment
  <template slot="code">
    <div class="example">
      <p>Hello</p>
    </div>
  </template>
</view-code>
```

### Prism highlighting

```html
<link rel="stylesheet" href="../css/prism.css">
<script src="../js/prism.js" defer></script>
<script src="js/ViewCode.js" defer></script>

<view-code highlight="prism" language="javascript" width="50rem" trim>
  Figure 2. Module pattern
  <pre slot="code"><code class="language-javascript">
    const mod = (() => {
      let _count = 0;
      return { inc: () => ++_count };
    })();
  </code></pre>
</view-code>
```

---

## Differences from `<code-viewer>`

| Concern              | `<code-viewer>`        | `<view-code>`             |
|----------------------|------------------------|---------------------------|
| Step unit            | fixed 40 px            | configurable via `step-px` attribute (default 40) |
| Width min            | hard-coded 240 px      | configurable via `min-width` attribute             |
| Slot for title       | default slot           | default slot (same)                               |
| Slot for code        | `slot="code"`          | `slot="code"` (same)                              |
| CSS organization     | inline constant string | separate `ViewCode.css` import                    |
