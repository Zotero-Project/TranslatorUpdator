var AttachmentLocker;

AttachmentLocker = {
  id: null,
  rootURI: null,
  initialized: false,
  _prefKey: 'extensions.tu.lockmap',
  _menuID: null,

  init({ id, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.rootURI = rootURI;
    this.initialized = true;
    this._installGlobalHooks();
    this._registerMenus();
  },

  log(msg) { try { Zotero.debug('AttachmentLocker: ' + msg); } catch {} },

  isPersianLocale() {
    try {
      const locale = Zotero.locale || 'en-US';
      return String(locale).toLowerCase().startsWith('fa');
    } catch (e) {
      return false;
    }
  },

  localize(faText, enText) {
    return this.isPersianLocale() ? faText : (enText !== undefined ? enText : faText);
  },

  // ---------- Storage ----------
  _loadMap() {
    try {
      let s = Zotero.Prefs.get(this._prefKey, true);
      if (!s) return {};
      return JSON.parse(s);
    } catch { return {}; }
  },
  _saveMap(map) {
    try { Zotero.Prefs.set(this._prefKey, JSON.stringify(map), true); } catch {}
  },
  _makeSalt() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  },
  _hash(str) {
    try { return Zotero.Utilities.Internal.md5(str, false); } catch { return str; }
  },
  isLocked(item) {
    try { const map = this._loadMap(); return !!map[item.key]; } catch { return false; }
  },
  setLock(item, password) {
    let map = this._loadMap();
    let salt = this._makeSalt();
    map[item.key] = { salt, hash: this._hash(salt + '|' + password) };
    this._saveMap(map);
    try { this._refreshAttachmentInfoVisibility(Zotero.getMainWindow()); } catch {}
  },
  clearLock(item) {
    let map = this._loadMap(); delete map[item.key]; this._saveMap(map);
    try { this._refreshAttachmentInfoVisibility(Zotero.getMainWindow()); } catch {}
  },
  async _checkPassword(item, windowHint) {
    const map = this._loadMap();
    const rec = map[item.key];
    if (!rec) return true;
    let win = windowHint || Zotero.getMainWindow();
    let ps = Services.prompt;
    const promptTitle = this.localize('ورود به فایل', 'Attachment Password');
    const promptText = this.localize('برای دسترسی به فایل، رمز را وارد کنید:', 'Enter the attachment password to continue:');
    const errorTitle = this.localize('خطا', 'Error');
    const errorMsg = this.localize('رمز نادرست است.', 'Incorrect password.');
    let passObj = { value: '' };
    let ok = ps.promptPassword(win, promptTitle, promptText, passObj, null, {});
    if (!ok) return false;
    let good = this._hash(rec.salt + '|' + passObj.value) === rec.hash;
    if (!good) { ps.alert(win, errorTitle, errorMsg); }
    return good;
  },

  async _promptSetPassword(win) {
    win = win || Zotero.getMainWindow();
    const errorTitle = this.localize('خطا', 'Error');
    const invalidMsg = this.localize('رمز باید بین ۶ تا ۲۲ کاراکتر باشد.', 'Password must be 6–22 characters long.');
    const mismatchMsg = this.localize('تکرار رمز با مقدار اصلی یکسان نیست.', 'Passwords do not match.');
    while (true) {
      const result = await this._showPasswordPanel(win);
      if (!result || !result.ok) return null;
      const pw = result.password || '';
      const rep = result.repeat || '';
      if (!this._validatePassword(pw)) {
        Services.prompt.alert(win, errorTitle, invalidMsg);
        continue;
      }
      if (pw !== rep) {
        Services.prompt.alert(win, errorTitle, mismatchMsg);
        continue;
      }
      return pw;
    }
  },

  _validatePassword(pw) {
    // Rule: any combination of letters/numbers/symbols, length 6..22
    return !!pw && pw.length >= 6 && pw.length <= 22;
  },

  _ensurePasswordPanel(win) {
    const doc = win.document;
    let panel = doc.getElementById('tu-pw-panel');
    if (panel) return panel;
    panel = doc.createXULElement('panel');
    panel.id = 'tu-pw-panel';
    panel.setAttribute('animate', 'false');
    panel.style.padding = '12px';
    panel.style.width = '360px';
    panel.style.maxWidth = '360px';
    panel.style.borderRadius = '8px';

    const xhtml = 'http://www.w3.org/1999/xhtml';
    const wrap = doc.createElementNS(xhtml, 'div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';

    const rules = doc.createElementNS(xhtml, 'div');
    rules.textContent = this.localize('رمز باید بین ۶ تا ۲۲ کاراکتر باشد.', 'Password must be 6–22 characters long.');
    rules.style.fontSize = '12px';
    rules.style.color = '#555';

    const row1 = doc.createElementNS(xhtml, 'div');
    row1.style.display = 'flex';
    row1.style.flexDirection = 'column';
    row1.style.gap = '4px';
    const lbl1 = doc.createElementNS(xhtml, 'label');
    lbl1.textContent = this.localize('رمز:', 'Password:');
    const inp1 = doc.createElementNS(xhtml, 'input');
    inp1.type = 'password';
    inp1.id = 'tu-pw-input';
    inp1.style.padding = '6px 8px';
    row1.appendChild(lbl1);
    row1.appendChild(inp1);

    const row2 = doc.createElementNS(xhtml, 'div');
    row2.style.display = 'flex';
    row2.style.flexDirection = 'column';
    row2.style.gap = '4px';
    const lbl2 = doc.createElementNS(xhtml, 'label');
    lbl2.textContent = this.localize('تکرار رمز:', 'Repeat password:');
    const inp2 = doc.createElementNS(xhtml, 'input');
    inp2.type = 'password';
    inp2.id = 'tu-pw-repeat';
    inp2.style.padding = '6px 8px';
    row2.appendChild(lbl2);
    row2.appendChild(inp2);

    const btns = doc.createElementNS(xhtml, 'div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '8px';
    const cancel = doc.createElementNS(xhtml, 'button');
    cancel.type = 'button';
    cancel.textContent = this.localize('انصراف', 'Cancel');
    const ok = doc.createElementNS(xhtml, 'button');
    ok.type = 'button';
    ok.textContent = this.localize('تأیید', 'Confirm');
    btns.appendChild(cancel);
    btns.appendChild(ok);

    wrap.appendChild(rules);
    wrap.appendChild(row1);
    wrap.appendChild(row2);
    wrap.appendChild(btns);
    panel.appendChild(wrap);

    doc.documentElement.appendChild(panel);

    panel.__tu_getValues = () => ({ password: inp1.value, repeat: inp2.value });
    panel.__tu_reset = () => { inp1.value = ''; inp2.value = ''; };
    panel.__tu_focus = () => inp1.focus();
    panel.__tu_buttons = { ok, cancel };
    return panel;
  },

  _showPasswordPanel(win) {
    return new Promise((resolve) => {
      try {
        const panel = this._ensurePasswordPanel(win);
        const { ok, cancel } = panel.__tu_buttons;
        const reset = panel.__tu_reset || (() => {});

        const cleanup = () => {
          panel.hidePopup();
          ok.removeEventListener('click', onOk);
          cancel.removeEventListener('click', onCancel);
          win.removeEventListener('keydown', onKey);
          reset();
        };
        const onOk = () => { const v = panel.__tu_getValues(); cleanup(); resolve({ ok: true, ...v }); };
        const onCancel = () => { cleanup(); resolve({ ok: false }); };
        const onKey = (ev) => { if (ev.key === 'Escape') onCancel(); if (ev.key === 'Enter') onOk(); };
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
        win.addEventListener('keydown', onKey);

        // Center on screen
        const x = win.screenX + Math.max(0, (win.outerWidth - 380) / 2);
        const y = win.screenY + Math.max(0, (win.outerHeight - 220) / 2);
        reset();
        panel.openPopupAtScreen(x, y, true);
        panel.__tu_focus();
      } catch (e) { this.log('_showPasswordPanel error: ' + e); resolve({ ok: false }); }
    });
  },

  // ---------- Menu ----------
  _registerMenus() {
    try {
      this._menuID = Zotero.MenuManager.registerMenu({
        menuID: this.id + ':lock-menu',
        pluginID: this.id,
        target: 'main/library/item',
        menus: [
          {
            menuType: 'menuitem',
            // Avoid l10n for dynamic label; we set label in hooks
            onShowing: async (ev, ctx) => {
              try {
                let items = ctx.items || [];
                // Only for single attachment
                let enabled = items.length === 1 && items[0].isAttachment();
                if (!ctx.menuElem) return;
                if (!enabled) {
                  ctx.menuElem.hidden = true;
                  return;
                }
                ctx.menuElem.hidden = false;
                let item = items[0];
                let label = this.isLocked(item) ? this.localize('برداشتن رمز فایل', 'Remove Password') : this.localize('رمزگذاری', 'Lock Attachment');
                ctx.menuElem.setAttribute('label', label);
                ctx.setEnabled(true);
              } catch {}
            },
            onShown: async (ev, ctx) => {
              // Ensure label/state is correct even on first open
              try {
                let items = ctx.items || [];
                if (!ctx.menuElem) return;
                let enabled = items.length === 1 && items[0].isAttachment();
                ctx.menuElem.hidden = !enabled;
                if (!enabled) return;
                let item = items[0];
                let label = this.isLocked(item) ? this.localize('برداشتن رمز فایل', 'Remove Password') : this.localize('رمزگذاری', 'Lock Attachment');
                ctx.menuElem.setAttribute('label', label);
                ctx.setEnabled(true);
              } catch {}
            },
            onCommand: async (ev, ctx) => {
              let items = ctx.items || [];
              if (!items.length || !items[0].isAttachment()) return;
              let item = items[0];
              let win = Zotero.getMainWindow();
              if (this.isLocked(item)) {
                if (await this._checkPassword(item, win)) {
                  this.clearLock(item);
                  Services.prompt.alert(win, this.localize('موفق', 'Success'), this.localize('رمز فایل حذف شد.', 'Attachment unlocked.'));
                }
              } else {
                let pw = await this._promptSetPassword(win);
                if (pw) {
                  this.setLock(item, pw);
                  Services.prompt.alert(win, this.localize('موفق', 'Success'), this.localize('فایل رمزگذاری شد.', 'Attachment locked.'));
                }
              }
            }
          }
        ]
      });
    } catch (e) { this.log('_registerMenus error: ' + e); }
  },

  // ---------- Hooks / Gating ----------
  _installGlobalHooks() {
    try {
      // Gate opening attachments
      if (!Zotero.FileHandlers.__tu_open_patched) {
        const origOpen = Zotero.FileHandlers.open.bind(Zotero.FileHandlers);
        Zotero.FileHandlers.open = async (item, params) => {
          try {
            let att = item;
            if (!att.isAttachment()) att = null;
            if (att && this.isLocked(att)) {
              let ok = await this._checkPassword(att);
              if (!ok) return false;
            }
          } catch {}
          return origOpen(item, params);
        };
        Zotero.FileHandlers.__tu_open_patched = true;
      }

      // Gate rename
      if (!Zotero.Item.prototype.__tu_rename_patched) {
        const origRename = Zotero.Item.prototype.renameAttachmentFile;
        Zotero.Item.prototype.renameAttachmentFile = async function (...args) {
          try {
            if (this.isAttachment && this.isAttachment() && AttachmentLocker.isLocked(this)) {
              let ok = await AttachmentLocker._checkPassword(this);
              if (!ok) return false;
            }
          } catch {}
          return origRename.apply(this, args);
        };
        Zotero.Item.prototype.__tu_rename_patched = true;
      }

      // Gate Reader.open as well (in case some paths bypass FileHandlers)
      if (Zotero.Reader && !Zotero.Reader.__tu_open_patched) {
        const origReaderOpen = Zotero.Reader.open.bind(Zotero.Reader);
        Zotero.Reader.open = async (itemID, location, options) => {
          try {
            const item = await Zotero.Items.getAsync(itemID);
            if (item?.isAttachment() && this.isLocked(item)) {
              let ok = await this._checkPassword(item);
              if (!ok) return null;
            }
          } catch {}
          return origReaderOpen(itemID, location, options);
        };
        Zotero.Reader.__tu_open_patched = true;
      }
    } catch (e) { this.log('_installGlobalHooks error: ' + e); }
  },

  addToWindow(window) {
    try {
      // Gate reveal/show in filesystem
      const zp = window.ZoteroPane;
      if (zp && !zp.__tu_show_patched) {
        const origShow = zp.showAttachmentInFilesystem.bind(zp);
        zp.showAttachmentInFilesystem = async (itemID, noLocateOnMissing) => {
          try {
            const item = await Zotero.Items.getAsync(itemID);
            if (item?.isAttachment() && this.isLocked(item)) {
              let ok = await this._checkPassword(item, window);
              if (!ok) return false;
            }
          } catch {}
          return origShow(itemID, noLocateOnMissing);
        };
        zp.__tu_show_patched = true;
      }

      // Fallback DOM-based menu injection to ensure visibility
      const doc = window.document;
      if (!doc.__tu_lock_menu_patched) {
        const popup = doc.getElementById('zotero-itemmenu');
        const ensureMenuItem = () => {
          const id = 'tu-locker-menuitem';
          let mi = doc.getElementById(id);
          if (!mi) {
            mi = doc.createXULElement('menuitem');
            mi.id = id;
            mi.classList.add('menuitem-iconic');
            mi.addEventListener('command', async () => {
              try {
                let items = window.ZoteroPane.getSelectedItems();
                if (!items.length || !items[0].isAttachment()) return;
                let item = items[0];
                if (AttachmentLocker.isLocked(item)) {
                  if (await AttachmentLocker._checkPassword(item, window)) {
                    AttachmentLocker.clearLock(item);
                    Services.prompt.alert(window, AttachmentLocker.localize('موفق', 'Success'), AttachmentLocker.localize('رمز فایل حذف شد.', 'Attachment unlocked.'));
                  }
                } else {
                  let pw = await AttachmentLocker._promptSetPassword(window);
                  if (pw) {
                    AttachmentLocker.setLock(item, pw);
                    Services.prompt.alert(window, AttachmentLocker.localize('موفق', 'Success'), AttachmentLocker.localize('فایل رمزگذاری شد.', 'Attachment locked.'));
                  }
                }
              } catch (e) { AttachmentLocker.log('command error: ' + e); }
            });
            popup.appendChild(mi);
          }
          // Update visibility/label based on selection
          try {
            let items = window.ZoteroPane.getSelectedItems();
            let show = items.length === 1 && items[0].isAttachment();
            mi.hidden = !show;
            if (show) {
              mi.setAttribute('label', AttachmentLocker.isLocked(items[0]) ? AttachmentLocker.localize('برداشتن رمز فایل', 'Remove Password') : AttachmentLocker.localize('رمزگذاری', 'Lock Attachment'));
            }
          } catch {}
        };
        if (popup) {
          popup.addEventListener('popupshowing', (ev) => {
            if (ev.target === popup) ensureMenuItem();
          });
          doc.__tu_lock_menu_patched = true;
        }

        // Wrap selection to refresh visibility of attachment info
        if (zp && !zp.__tu_select_patched) {
          const origSelItem = zp.selectItem.bind(zp);
          zp.selectItem = async (...args) => {
            let r = await origSelItem(...args);
            try { AttachmentLocker._refreshAttachmentInfoVisibility(window); } catch {}
            return r;
          };
          const origSelItems = zp.selectItems.bind(zp);
          zp.selectItems = async (...args) => {
            let r = await origSelItems(...args);
            try { AttachmentLocker._refreshAttachmentInfoVisibility(window); } catch {}
            return r;
          };
          zp.__tu_select_patched = true;
        }

        // Initial refresh
        this._refreshAttachmentInfoVisibility(window);
      }

      // Patch item-details.render to re-apply visibility rules after every render
      const tryPatchDetails = () => {
        try {
          const details = window.ZoteroPane?.itemPane?._itemDetails;
          if (!details || details.__tu_render_patched) return !!details;
          const origRender = details.render?.bind(details);
          if (typeof origRender !== 'function') return false;
          details.render = function (...args) {
            const r = origRender(...args);
            try { AttachmentLocker._refreshAttachmentInfoVisibility(window); } catch {}
            return r;
          };
          details.__tu_render_patched = true;
          // Also refresh once now
          try { AttachmentLocker._refreshAttachmentInfoVisibility(window); } catch {}
          return true;
        } catch (e) { AttachmentLocker.log('tryPatchDetails error: ' + e); return false; }
      };
      // Attempt immediately and with a few retries (in case elements aren't ready yet)
      if (!tryPatchDetails()) {
        let attempts = 0;
        const timer = () => {
          attempts++;
          if (tryPatchDetails() || attempts > 10) return;
          window.setTimeout(timer, 200);
        };
        window.setTimeout(timer, 200);
      }
    } catch (e) { this.log('addToWindow error: ' + e); }
  },

  removeFromWindow(window) {},
  addToAllWindows() { try { for (let win of Zotero.getMainWindows()) this.addToWindow(win); } catch {} },
  removeFromAllWindows() {},
};

// Helpers to control visibility of Attachment Info pane
AttachmentLocker._refreshAttachmentInfoVisibility = function (win) {
  try {
    const zp = win?.ZoteroPane; if (!zp) return;
    const items = zp.getSelectedItems();
    const hasOne = items && items.length === 1 && items[0].isAttachment();
    const isLocked = hasOne && AttachmentLocker.isLocked(items[0]);

    const details = zp.itemPane?._itemDetails;
    let pane = details?.getPane?.('attachment-info');
    if (!pane) {
      // Fallback by query
      pane = win.document.querySelector('[data-pane="attachment-info"]');
    }
    if (!pane) return;

    const sidenav = details?.sidenav;
    if (isLocked) {
      // Hide section and remove the sidenav button completely
      pane.setAttribute('hidden', 'true');
      pane.dataset.tuLockedHide = '1';
      try { sidenav?.removePane?.('attachment-info'); } catch {}
    } else {
      if (pane.dataset.tuLockedHide === '1') {
        pane.removeAttribute('hidden');
        delete pane.dataset.tuLockedHide;
      }
      // Add sidenav button back if missing
      try {
        let btn = sidenav?.querySelector?.('.btn[data-pane="attachment-info"]');
        if (!btn) {
          let order = sidenav?.getPersistedOrder ? sidenav.getPersistedOrder() : null;
          sidenav?.addPane?.('attachment-info', order);
        }
      } catch {}
    }
    // Update sidenav state
    try { sidenav?.updatePaneStatus?.('attachment-info'); } catch {}
  } catch (e) { AttachmentLocker.log('_refreshAttachmentInfoVisibility error: ' + e); }
};
