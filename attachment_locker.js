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
  },
  clearLock(item) {
    let map = this._loadMap(); delete map[item.key]; this._saveMap(map);
  },
  async _checkPassword(item, windowHint) {
    const map = this._loadMap();
    const rec = map[item.key];
    if (!rec) return true;
    let win = windowHint || Zotero.getMainWindow();
    let ps = Services.prompt;
    let text = 'برای دسترسی به فایل، رمز را وارد کنید:';
    let passObj = { value: '' };
    let ok = ps.promptPassword(win, 'ورود به فایل', text, passObj, null, {});
    if (!ok) return false;
    let good = this._hash(rec.salt + '|' + passObj.value) === rec.hash;
    if (!good) { ps.alert(win, 'خطا', 'رمز نادرست است.'); }
    return good;
  },

  async _promptSetPassword(win) {
    const ps = Services.prompt;
    const rules = 'رمز بین ۶ تا ۲۲ کاراکتر و شامل حروف انگلیسی، اعداد و سمبل‌ها باشد.';
    while (true) {
      let p1 = { value: '' };
      let ok1 = ps.promptPassword(win, 'رمزگذاری فایل', rules + '\n\nرمز را وارد کنید:', p1, null, {});
      if (!ok1) return null;
      let p2 = { value: '' };
      let ok2 = ps.promptPassword(win, 'تایید رمز', 'رمز را دوباره وارد کنید:', p2, null, {});
      if (!ok2) return null;
      let valid = this._validatePassword(p1.value);
      if (!valid) { ps.alert(win, 'رمز نامعتبر', 'قوانین رمز را رعایت کنید.'); continue; }
      if (p1.value !== p2.value) { ps.alert(win, 'عدم تطابق', 'تکرار رمز با رمز یکسان نیست.'); continue; }
      return p1.value;
    }
  },
  _validatePassword(pw) {
    if (!pw || pw.length < 6 || pw.length > 22) return false;
    let hasLetter = /[A-Za-z]/.test(pw);
    let hasDigit = /\d/.test(pw);
    let hasSymbol = /[^A-Za-z0-9]/.test(pw);
    return hasLetter && hasDigit && hasSymbol;
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
                let label = this.isLocked(item) ? 'برداشتن رمز فایل' : 'رمزگذاری';
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
                let label = this.isLocked(item) ? 'برداشتن رمز فایل' : 'رمزگذاری';
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
                  Services.prompt.alert(win, 'موفق', 'رمز فایل حذف شد.');
                }
              } else {
                let pw = await this._promptSetPassword(win);
                if (pw) {
                  this.setLock(item, pw);
                  Services.prompt.alert(win, 'موفق', 'فایل رمزگذاری شد.');
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
                    Services.prompt.alert(window, 'موفق', 'رمز فایل حذف شد.');
                  }
                } else {
                  let pw = await AttachmentLocker._promptSetPassword(window);
                  if (pw) {
                    AttachmentLocker.setLock(item, pw);
                    Services.prompt.alert(window, 'موفق', 'فایل رمزگذاری شد.');
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
              mi.setAttribute('label', AttachmentLocker.isLocked(items[0]) ? 'برداشتن رمز فایل' : 'رمزگذاری');
            }
          } catch {}
        };
        if (popup) {
          popup.addEventListener('popupshowing', (ev) => {
            if (ev.target === popup) ensureMenuItem();
          });
          doc.__tu_lock_menu_patched = true;
        }
      }
    } catch (e) { this.log('addToWindow error: ' + e); }
  },

  removeFromWindow(window) {},
  addToAllWindows() { try { for (let win of Zotero.getMainWindows()) this.addToWindow(win); } catch {} },
  removeFromAllWindows() {},
};
