var LibrariesCollectionsAllTypes;

LibrariesCollectionsAllTypes = {
  id: null,
  rootURI: null,
  initialized: false,

  init({ id, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.rootURI = rootURI;
    this.initialized = true;
  },

  log(msg) { try { Zotero.debug('LCAllTypes: ' + msg); } catch {} },

  _patchWindow(win) {
    try {
      if (!win || win.__tu_lc_alltypes_patched) return;

      const tryPatch = () => {
        try {
          const Ctor = win.customElements && win.customElements.get('libraries-collections-box');
          if (!Ctor) {
            // Not loaded yet; try again shortly
            win.setTimeout(tryPatch, 200);
            return;
          }

          const proto = Ctor.prototype;
          if (proto.__tu_item_setter_patched) return;

          const desc = Object.getOwnPropertyDescriptor(proto, 'item');
          if (!desc || typeof desc.set !== 'function' || typeof desc.get !== 'function') return;

          const origSet = desc.set.bind(proto);
          const origGet = desc.get.bind(proto);

          Object.defineProperty(proto, 'item', {
            configurable: true,
            enumerable: true,
            get: function () { return origGet.call(this); },
            set: function (item) {
              try {
                // Keep hidden for feed items, otherwise show for all types
                if (item && !item.isFeedItem) {
                  let effective = item;
                  try {
                    if (!(item.isRegularItem && item.isRegularItem())) {
                      // Child attachment: show parent's libraries/collections
                      if (item.isAttachment && item.isAttachment() && !item.isTopLevelItem()) {
                        effective = item.parentItem || (item.parentItemID ? Zotero.Items.get(item.parentItemID) : null) || item;
                      }
                    }
                  } catch {}

                  // Unhide and assign effective item; mirror base setter minimal behavior
                  this.hidden = false;
                  this._item = effective;
                  this._linkedItems = [];
                  if (typeof this._handleItemChange === 'function') {
                    try { this._handleItemChange(); } catch {}
                  }
                  // Trigger refresh if already open
                  try { if (this.open && typeof this._forceRenderAll === 'function') this._forceRenderAll(); } catch {}
                  return;
                }
              } catch {}
              // Fallback to original behavior
              try { origSet.call(this, item); } catch {}
            }
          });

          proto.__tu_item_setter_patched = true;
          win.__tu_lc_alltypes_patched = true;
          try { Zotero.debug('LCAllTypes: libraries-collections-box patched'); } catch {}
        } catch (e) {
          try { Zotero.debug('LCAllTypes patch error: ' + e); } catch {}
        }
      };

      tryPatch();
    } catch (e) { this.log('_patchWindow error: ' + e); }
  },

  addToWindow(window) {
    try { this._patchWindow(window); } catch (e) { this.log('addToWindow error: ' + e); }
  },

  removeFromWindow(window) {
    // No-op: patch is harmless to keep for window lifetime
  },

  addToAllWindows() {
    try { for (let win of Zotero.getMainWindows()) this.addToWindow(win); } catch (e) { this.log('addToAllWindows error: ' + e); }
  },

  removeFromAllWindows() {
    // No-op
  },
};
