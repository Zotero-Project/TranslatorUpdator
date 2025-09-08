var LightThemeTweaks;

LightThemeTweaks = {
  id: null,
  rootURI: null,
  initialized: false,
  _styleId: 'tu-light-theme-tweaks',

  init({ id, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.rootURI = rootURI;
    this.initialized = true;
    try { this._installReaderHook(); } catch (e) { try { Zotero.debug('LightThemeTweaks hook error: ' + e); } catch {} }
  },

  log(msg) { try { Zotero.debug('LightThemeTweaks: ' + msg); } catch {} },

  _injectStyle(doc) {
    try {
      if (!doc || doc.getElementById(this._styleId)) return;
      const style = doc.createElementNS('http://www.w3.org/1999/xhtml', 'style');
      style.id = this._styleId;
      style.textContent = `
        /* Increase separation and contrast in light theme without breaking design */
        @media (prefers-color-scheme: light) {
          /* Global: nudge divider/separator variables a bit darker */
          :root {
            /* Default: #dadada → a notch darker for clearer pane borders */
            --color-panedivider: #c6c6c6;
            /* Default: #0000001a (~10%) → ~14% for subtle lines like splitters */
            --fill-quarternary: rgba(0, 0, 0, 0.14);
          }

          /* Zebra + separators for virtualized lists (items, collections, notes, etc.) */
          #zotero-items-tree .virtualized-table .row:not(.selected),
          #zotero-collections-tree .virtualized-table .row:not(.selected),
          .virtualized-table .row.annotation-row:not(.selected) {
            box-shadow: inset 0 -1px 0 rgba(0,0,0,0.20);
          }
          #zotero-items-tree .virtualized-table .row.odd:not(.selected),
          #zotero-collections-tree .virtualized-table .row.odd:not(.selected) {
            background-color: rgba(0, 0, 0, 0.1) !important;
          }
          #zotero-items-tree .virtualized-table .row.even:not(.selected),
          #zotero-collections-tree .virtualized-table .row.even:not(.selected) {
            background-color: #ffffff !important;
          }

          /* Pane dividers a touch stronger for clarity */
          #zotero-collections-pane { border-inline-end: 2px solid rgba(0, 0, 0, 0.66); }
          #zotero-item-pane       { border-inline-start: 2px solid rgba(0, 0, 0, 0.66); }

          /* Reader lists (thumbnails/outline) get clearer lanes */
          #thumbnailView .thumbnail { box-shadow: inset 0 -1px 0 rgba(0,0,0,0.20); }

          /* Metadata table (item pane): clearer lanes (works with RTL, too) */
          #info-table .meta-row:not([hidden]) { box-shadow: inset 0 -1px 0 rgba(0,0,0,0.20); }
          #info-table .meta-row:nth-child(odd):not([hidden]) { background-color: rgba(0, 0, 0, 0.1); }
          #info-table .meta-row:nth-child(even):not([hidden]) { background-color: #fff; }

          /* Reader toolbar/buttons slightly higher contrast */
          #toolbarContainer, .toolbar, .secondaryToolbar { box-shadow: inset 0 -1px 0 rgba(0,0,0,0.18); }
          .toolbarButton, .secondaryToolbarButton, .dropdownToolbarButton, .splitToolbarButtonButton {
            color: rgba(15,23,42,0.90) !important; /* slightly stronger */
          }
          .toolbarButton:hover, .secondaryToolbarButton:hover, .dropdownToolbarButton:hover, .splitToolbarButtonButton:hover {
            background: rgba(0,0,0,0.08) !important;
            color: rgba(15,23,42,1) !important;
          }
        }
      `;
      doc.documentElement.appendChild(style);
    } catch (e) {
      this.log('_injectStyle error: ' + e);
    }
  },

  _injectIntoFrames(doc) {
    try {
      const frames = doc?.querySelectorAll('iframe, frame, browser') || [];
      for (let f of frames) {
        try { const cd = f.contentDocument; if (cd) this._injectStyle(cd); } catch {}
      }
      setTimeout(() => {
        try {
          const frames2 = doc?.querySelectorAll('iframe, frame, browser') || [];
          for (let f of frames2) { try { const cd = f.contentDocument; if (cd) this._injectStyle(cd); } catch {} }
        } catch {}
      }, 400);
    } catch {}
  },

  addToWindow(window) {
    try {
      const doc = window.document;
      this._injectStyle(doc);
      this._injectIntoFrames(doc);
      const onLoad = (ev) => {
        const t = ev.target;
        try {
          if (t && (t.localName === 'iframe' || t.localName === 'browser')) {
            const cd = t.contentDocument; if (cd) { this._injectStyle(cd); this._injectIntoFrames(cd); }
          }
        } catch {}
      };
      doc.addEventListener('load', onLoad, true);
      doc._tu_ltt_onload = onLoad;
    } catch (e) { this.log('addToWindow error: ' + e); }
  },

  removeFromWindow(window) {
    try {
      const doc = window.document;
      const el = doc.getElementById(this._styleId); if (el) el.remove();
      if (doc._tu_ltt_onload) { try { doc.removeEventListener('load', doc._tu_ltt_onload, true); } catch {} }
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
      const inject = (event) => { try { this._injectStyle(event.doc || event.reader?._iframeWindow?.document); this._injectIntoFrames(event.doc || event.reader?._iframeWindow?.document); } catch {} };
      Zotero.Reader.registerEventListener('renderToolbar', inject, this.id);
      Zotero.Reader.registerEventListener('createViewContextMenu', inject, this.id);
      Zotero.Reader.registerEventListener('renderTextSelectionPopup', inject, this.id);
    } catch (e) { this.log('_installReaderHook error: ' + e); }
  },
};
