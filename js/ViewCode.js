const VC_STYLE = /* css */ `
  :host { display: inline-block; }

  .wrapper {
    padding: 1rem;
    box-sizing: border-box;
  }

  .view {
    border: 2px solid var(--dark, #333);
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    user-select: none;
    width: max-content;
    box-shadow: 5px 5px 5px #999;
    box-sizing: border-box;
    background-color: var(--view-bg, #f8f8f8);
  }

  .title {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: var(--title-font-size, 1rem);
    font-weight: bold;
    cursor: pointer;
    max-width: 100%;
    margin-bottom: 8px;
    line-height: 1.2;
    overflow-wrap: break-word;
    white-space: normal;
    color: var(--dark, #333);
    background-color: var(--title-bg, transparent);
    padding: 0.125rem 0.5rem;
  }

  .code { display: block; flex: 0 0 auto; }

  #pre-internal { display: block; }
  slot[name="code"]::slotted(*) { display: none !important; }

  :host([highlight="prism"]) #pre-internal { display: none; }
  :host([highlight="prism"]) slot[name="code"]::slotted(pre),
  :host([highlight="prism"]) slot[name="code"]::slotted(code) {
    display: block !important;
    cursor: pointer;
  }

  #pre-internal {
    margin: 0;
    padding: var(--code-padding, 0.75rem 1rem);
    background-color: var(--code-bg, #f8f8f8);
    color: var(--code-fg, #333);
    border-radius: 0 0 2px 2px;
    line-height: 1.4;
    white-space: pre;
    overflow-y: auto;
    overflow-x: var(--code-overflow-x, auto);
    width: 100%;
    height: var(--code-height, auto);
    box-sizing: border-box;
    cursor: pointer;
    text-align: left;
  }

  #code-internal {
    display: block;
    margin: 0;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    text-align: left;
  }
`;

const VC_TEMPLATE = /* html */ `
  <style>${VC_STYLE}</style>
  <div class="wrapper">
    <div class="view" part="view">
      <div class="title" part="title"><slot></slot></div>
      <div class="code">
        <pre id="pre-internal"><code id="code-internal"></code></pre>
        <slot name="code" id="code-slot"></slot>
      </div>
    </div>
  </div>
`;

class ViewCode extends HTMLElement {
  static get observedAttributes() {
    return [
      'bg-color', 'title-bg-color', 'background-color', 'color',
      'width', 'height', 'overflow-x', 'font-family', 'font-size', 'code-padding',
      'highlight', 'language',
      'trim', 'normalize-indent',
      'step-px', 'min-width'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = VC_TEMPLATE;

    this._els = {
      title: this.shadowRoot.querySelector('.title'),
      view:  this.shadowRoot.querySelector('.view'),
      pre:   this.shadowRoot.querySelector('#pre-internal'),
      code:  this.shadowRoot.querySelector('#code-internal'),
      slot:  this.shadowRoot.querySelector('#code-slot'),
    };

    this._originWidthPx   = null;
    this._stepsFromOrigin = 0;
    this._displayEl       = this._els.pre;

    this._onBodyClick  = () => this._bumpWidth(+1);
    this._onTitleClick = () => this._bumpWidth(-1);
    this._onSlotChange = () => this._updateAll({ maybeResetWidth: true, normalizeBox: true });
  }

  connectedCallback() {
    this._updateAll({ resetWidth: true, normalizeBox: true });
    this._els.slot.addEventListener('slotchange', this._onSlotChange);
    this._bindDisplayListeners();
    this._els.title.addEventListener('click', this._onTitleClick);
  }

  disconnectedCallback() {
    this._unbindDisplayListeners();
    this._els.title.removeEventListener('click', this._onTitleClick);
    this._els.slot.removeEventListener('slotchange', this._onSlotChange);
  }

  attributeChangedCallback() {
    this._updateAll({ maybeResetWidth: true, normalizeBox: true });
  }

  _updateAll({ resetWidth = false, maybeResetWidth = false, normalizeBox = false } = {}) {
    this._applyBoxColors();
    this._renderDefault();
    this._maybeSetupPrism();
    const changed = this._resolveDisplayEl(normalizeBox);
    if (resetWidth || (maybeResetWidth && changed)) this._resetWidth();
    this._applySizing();
    this._applyTypography();
  }

  _bindDisplayListeners() {
    this._displayEl?.addEventListener('click', this._onBodyClick);
  }

  _unbindDisplayListeners() {
    this._displayEl?.removeEventListener('click', this._onBodyClick);
  }

  _swapBodyListener(next) {
    if (next === this._displayEl) return;
    this._unbindDisplayListeners();
    this._displayEl = next;
    this._bindDisplayListeners();
  }

  _resetWidth() {
    this._originWidthPx   = null;
    this._stepsFromOrigin = 0;
  }

  _bumpWidth(dir) {
    const el = this._displayEl;
    if (!el) return;
    if (this._originWidthPx == null) {
      const rect = this._els.view.getBoundingClientRect();
      this._originWidthPx   = rect.width > 0 ? rect.width : 480;
      this._stepsFromOrigin = 0;
    }
    const stepPx = parseFloat(this.getAttribute('step-px')) || 40;
    const minPx  = parseFloat(this.getAttribute('min-width')) || 240;
    let steps  = this._stepsFromOrigin + dir;
    let target = this._originWidthPx + steps * stepPx;
    if (target < minPx) { target = minPx; steps = Math.ceil((target - this._originWidthPx) / stepPx); }
    this._stepsFromOrigin = steps;
    this._els.view.style.width = `${Math.round(target)}px`;
  }

  _renderDefault() {
    if (this.getAttribute('highlight') === 'prism') return;
    const nodes = this._els.slot.assignedNodes({ flatten: true });
    let raw = '';
    for (const n of nodes) {
      if (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'TEMPLATE') raw += n.innerHTML ?? '';
      else if (n.nodeType === Node.ELEMENT_NODE) raw += n.outerHTML ?? '';
      else raw += n.textContent ?? '';
    }
    if (this.hasAttribute('trim'))             raw = raw.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    if (this.hasAttribute('normalize-indent')) raw = this._stripCommonIndent(raw);
    this._els.code.textContent = raw;
  }

  _maybeSetupPrism() {
    if (this.getAttribute('highlight') !== 'prism') return;
    const lang     = (this.getAttribute('language') || '').trim();
    const assigned = this._els.slot.assignedElements({ flatten: true });
    if (!assigned.length) return;

    let preEl  = assigned.find(n => n.tagName === 'PRE');
    let codeEl = assigned.find(n => n.tagName === 'CODE');

    if (!preEl && codeEl) {
      preEl = document.createElement('pre');
      codeEl.parentNode.replaceChild(preEl, codeEl);
      preEl.appendChild(codeEl);
    } else if (preEl && !preEl.querySelector('code')) {
      const wrap = document.createElement('code');
      while (preEl.firstChild) wrap.appendChild(preEl.firstChild);
      preEl.appendChild(wrap);
      codeEl = wrap;
    } else if (preEl) {
      codeEl = preEl.querySelector('code') || codeEl;
    }

    if (codeEl) {
      let txt = codeEl.textContent ?? '';
      if (this.hasAttribute('trim'))             txt = txt.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
      if (this.hasAttribute('normalize-indent')) txt = this._stripCommonIndent(txt);
      codeEl.textContent = txt;
    }

    if (lang) {
      const cls = `language-${lang}`;
      if (preEl  && !preEl.classList.contains(cls))  preEl.classList.add(cls);
      if (codeEl && !codeEl.classList.contains(cls)) codeEl.classList.add(cls);
    }

    if (window.Prism) {
      const codes = [];
      assigned.forEach(el => {
        if (el.tagName === 'CODE') codes.push(el);
        codes.push(...el.querySelectorAll('code'));
      });
      if (codes.length === 0 && preEl) window.Prism.highlightElement(preEl);
      else codes.forEach(c => window.Prism.highlightElement(c));
    }
  }

  _resolveDisplayEl(normalize = false) {
    let next = this._els.pre;
    if (this.getAttribute('highlight') === 'prism') {
      const assigned = this._els.slot.assignedElements({ flatten: true });
      const pre = assigned.find(n => n.tagName === 'PRE');
      next = pre || assigned[0] || this._els.pre;
    }
    const changed = next !== this._displayEl;
    this._swapBodyListener(next);
    if (normalize) this._harmonizeBox(next);
    return changed;
  }

  _harmonizeBox(el) {
    if (!el) return;
    const pad = (this.getAttribute('code-padding') || '0.75rem 1rem').trim();
    el.style.boxSizing  = 'border-box';
    el.style.width      = '100%';
    el.style.margin     = '0';
    el.style.padding    = pad;
    el.style.lineHeight = '1.4';
    el.style.display    = 'block';
    el.style.cursor     = 'pointer';
    el.style.textAlign  = 'left';
    const inner = el.querySelector?.('code');
    if (inner) { inner.style.display = 'block'; inner.style.textAlign = 'left'; inner.style.margin = '0'; }
  }

  _applyBoxColors() {
    const viewBg  = this.getAttribute('bg-color')         || 'var(--light, #f8f8f8)';
    const titleBg = this.getAttribute('title-bg-color')   || '#aaa';
    const codeBg  = this.getAttribute('background-color') || 'var(--light, #f8f8f8)';
    const codeFg  = this.getAttribute('color')            || 'var(--dark, #333)';
    const pad     = this.getAttribute('code-padding')     || '0.75rem 1rem';
    this.style.setProperty('--view-bg',      viewBg);
    this.style.setProperty('--title-bg',     titleBg);
    this.style.setProperty('--code-bg',      codeBg);
    this.style.setProperty('--code-fg',      codeFg);
    this.style.setProperty('--code-padding', pad);
  }

  _applySizing() {
    const width  = this.getAttribute('width');
    const height = this.getAttribute('height') || null;
    const ox     = (this.getAttribute('overflow-x') || 'auto').trim();
    this.style.setProperty('--code-height',     height || 'auto');
    this.style.setProperty('--code-overflow-x', ox);
    this._els.view.style.width = width || '';
    const el = this._displayEl;
    if (!el) return;
    el.style.height    = height || '';
    el.style.overflowX = ox;
  }

  _applyTypography() {
    const fam = this.getAttribute('font-family');
    const fsz = this.getAttribute('font-size');
    const el  = this._displayEl;
    if (!el) return;
    const pre  = el.tagName === 'PRE' ? el : el.closest?.('pre') || null;
    const code = el.querySelector?.('code') || (el.tagName === 'CODE' ? el : null);
    const targets = new Set([el]);
    if (pre)  targets.add(pre);
    if (code) targets.add(code);
    targets.forEach(t => {
      if (fam?.trim()) t.style.fontFamily = fam; else t.style.removeProperty('font-family');
      if (fsz?.trim()) t.style.fontSize   = fsz; else t.style.removeProperty('font-size');
    });
  }

  _stripCommonIndent(text) {
    const lines    = text.split('\n');
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (!nonEmpty.length) return text;
    const minIndent = Math.min(...nonEmpty.map(l => l.match(/^[ \t]*/)[0].length));
    if (minIndent === 0) return text;
    const re = new RegExp(`^[ \\t]{0,${minIndent}}`);
    return lines.map(l => l.replace(re, '')).join('\n');
  }
}

customElements.define('view-code', ViewCode);
