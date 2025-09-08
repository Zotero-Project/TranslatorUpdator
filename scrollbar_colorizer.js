var ScrollbarColorizer;

ScrollbarColorizer = {
  id: null,
  rootURI: null,
  initialized: false,
  _styleId: 'tu-scrollbar-color-style',

  init({ id, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.rootURI = rootURI;
    this.initialized = true;
    try { this._installReaderHook(); } catch (e) { try { Zotero.debug('ScrollbarColorizer hook error: ' + e); } catch {} }
  },

  log(msg) { try { Zotero.debug('ScrollbarColorizer: ' + msg); } catch {} },

  _injectStyle(doc) {
    try {
      if (!doc || doc.getElementById(this._styleId)) return;
      const style = doc.createElementNS('http://www.w3.org/1999/xhtml', 'style');
      style.id = this._styleId;
      // Red thumb on hover + thicker on hover (auto). Track remains subtle.
      // NOTE: We scope to :hover so رنگ و ضخامت فقط هنگام Hover فعال شود.
      style.textContent = `
        /* Stronger hover color and contrast (about +20%) */
        *:hover { scrollbar-color: #dc2626 rgba(0,0,0,0.28) !important; scrollbar-width: auto !important; }
      `;
      doc.documentElement.appendChild(style);
    } catch (e) {
      this.log('_injectStyle error: ' + e);
    }
  },

  addToWindow(window) {
    try {
      const doc = window.document;
      this._injectStyle(doc);
      // Watch loads of inner frames (e.g., reader iframes) and inject
      const onLoad = (ev) => {
        try {
          const t = ev.target;
          if (t && (t.localName === 'iframe' || t.localName === 'browser')) {
            const cd = t.contentDocument;
            if (cd) { this._injectStyle(cd); this._injectIntoChildFrames(cd); }
          }
        } catch {}
      };
      doc.addEventListener('load', onLoad, true);
      // Keep a reference per-window to allow cleanup if needed later
      doc._tu_scrollbar_onload = onLoad;
    } catch (e) { this.log('addToWindow error: ' + e); }
  },

  removeFromWindow(window) {
    try {
      const doc = window.document;
      const el = doc.getElementById(this._styleId); if (el) el.remove();
      if (doc._tu_scrollbar_onload) { try { doc.removeEventListener('load', doc._tu_scrollbar_onload, true); } catch {} }
    } catch (e) { this.log('removeFromWindow error: ' + e); }
  },

  addToAllWindows() {
    try { for (let win of Zotero.getMainWindows()) this.addToWindow(win); } catch (e) { this.log('addToAllWindows error: ' + e); }
  },

  removeFromAllWindows() {
    try { for (let win of Zotero.getMainWindows()) this.removeFromWindow(win); } catch (e) { this.log('removeFromAllWindows error: ' + e); }
  },

  _installReaderHook() {
    try {
      if (!Zotero || !Zotero.Reader) return;
      // Ensure injection when reader DOM is available
      Zotero.Reader.registerEventListener('renderToolbar', (event) => {
        try { this._injectStyle(event.doc); this._injectIntoChildFrames(event.doc); } catch (e) { this.log('reader inject error: ' + e); }
      }, this.id);
      // Fallback injection points as views initialize
      const inject = (event) => { try { this._injectStyle(event.reader?._iframeWindow?.document); this._injectIntoChildFrames(event.reader?._iframeWindow?.document); } catch {} };
      Zotero.Reader.registerEventListener('createViewContextMenu', inject, this.id);
      Zotero.Reader.registerEventListener('renderTextSelectionPopup', inject, this.id);
    } catch (e) {
      this.log('_installReaderHook error: ' + e);
    }
  },

  _injectIntoChildFrames(doc) {
    try {
      if (!doc) return;
      const frames = doc.querySelectorAll('iframe, frame, browser');
      for (let f of frames) {
        try { const cd = f.contentDocument || f.ownerDocument; if (cd) this._injectStyle(cd); } catch {}
      }
      // Re-run shortly in case pdf.js populates later
      setTimeout(() => {
        try {
          const frames2 = doc.querySelectorAll('iframe, frame, browser');
          for (let f of frames2) { try { const cd = f.contentDocument; if (cd) this._injectStyle(cd); } catch {} }
        } catch {}
      }, 400);
    } catch {}
  },
};
