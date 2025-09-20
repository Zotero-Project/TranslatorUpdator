var PluginAdmin;

PluginAdmin = {
  id: null,
  version: null,
  rootURI: null,
  initialized: false,
  addedElementIDs: [],

  init({ id, version, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.initialized = true;
    this.log(`PluginAdmin initialized: ${id} v${version}`);
  },

  log(msg) {
    try { Zotero.debug("PluginAdmin: " + msg); } catch {}
  },

  storeAddedElement(elem) {
    try {
      if (!elem || !elem.id) return;
      this.addedElementIDs.push(elem.id);
    } catch {}
  },

  addToAllWindows() {
    try {
      for (let win of Zotero.getMainWindows()) {
        if (!win.ZoteroPane) continue;
        this.addToWindow(win);
      }
    } catch (e) { this.log('addToAllWindows error: ' + e); }
  },

  removeFromAllWindows() {
    try {
      for (let win of Zotero.getMainWindows()) {
        if (!win.ZoteroPane) continue;
        this.removeFromWindow(win);
      }
    } catch (e) { this.log('removeFromAllWindows error: ' + e); }
  },

  addToWindow(window) {
    try {
      const doc = window.document;
      // Ensure base plugin menu exists
      let baseMenu = doc.getElementById('tu-plugin-menu');
      if (!baseMenu) {
        try { if (typeof TranslatorUpdator !== 'undefined' && TranslatorUpdator.addTopPluginMenu) TranslatorUpdator.addTopPluginMenu(window); } catch {}
        baseMenu = doc.getElementById('tu-plugin-menu');
      }
      if (!baseMenu) {
        this.log('Base plugin menu not found');
        return;
      }

      if (doc.getElementById('tu-plugin-settings-menu')) return; // Already added

      let popup = baseMenu.querySelector('menupopup');
      if (!popup) {
        popup = doc.createXULElement('menupopup');
        baseMenu.appendChild(popup);
      }

      const settingsMenu = doc.createXULElement('menu');
      settingsMenu.id = 'tu-plugin-settings-menu';
      settingsMenu.setAttribute('label', 'تنظیمات پلاگین');

      const settingsPopup = doc.createXULElement('menupopup');

      const updateFromFileItem = doc.createXULElement('menuitem');
      updateFromFileItem.id = 'tu-plugin-update-from-file';
      updateFromFileItem.setAttribute('label', 'آپدیت پلاگین با فایل');
      updateFromFileItem.addEventListener('command', () => this.updatePluginFromFile(window));

      const removePluginItem = doc.createXULElement('menuitem');
      removePluginItem.id = 'tu-plugin-remove-self';
      removePluginItem.setAttribute('label', 'حذف پلاگین');
      removePluginItem.addEventListener('command', () => this.uninstallThisPlugin(window));

      settingsPopup.appendChild(updateFromFileItem);
      settingsPopup.appendChild(removePluginItem);
      settingsMenu.appendChild(settingsPopup);

      const helpItem = doc.getElementById('tu-plugin-menu-help');
      if (helpItem && helpItem.parentNode === popup) {
        popup.insertBefore(settingsMenu, helpItem);
      } else {
        popup.appendChild(settingsMenu);
      }

      this.storeAddedElement(settingsMenu);
      this.storeAddedElement(updateFromFileItem);
      this.storeAddedElement(removePluginItem);
    } catch (e) { this.log('addToWindow error: ' + e); }
  },

  removeFromWindow(window) {
    try {
      const doc = window.document;
      for (let id of this.addedElementIDs) {
        let el = doc.getElementById(id);
        if (el) el.remove();
      }
    } catch (e) { this.log('removeFromWindow error: ' + e); }
  },

  _confirm(window, title, text) {
    try { return Services.prompt.confirm(window || null, title, text); }
    catch (e) { this.log('Confirm error: ' + e); return false; }
  },

  async updatePluginFromFile(window) {
    try {
      const title = 'تایید | Confirm';
      const text = 'آیا می‌خواهید فایل افزونه را انتخاب کرده و نصب/بروزرسانی کنید؟\nAre you sure you want to install/update the plugin from a file?';
      if (!this._confirm(window, title, text)) return;

      const { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');
      const fp = new FilePicker();
      fp.init(window, 'انتخاب فایل افزونه | Choose Plugin File', fp.modeOpen);
      try { fp.appendFilter('Zotero Plugin (*.xpi, *.zip)', '*.xpi; *.zip'); } catch {}
      try { fp.appendFilters(fp.filterAll); } catch {}
      const rv = await fp.show();
      if (rv !== fp.returnOK) return;

      const path = fp.file;
      const { FileUtils } = ChromeUtils.importESModule('resource://gre/modules/FileUtils.sys.mjs');
      const nsFile = new FileUtils.File(path);
      const fileURL = Services.io.newFileURI(nsFile).spec;

      const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
      let install = null;
      try {
        if (AddonManager && typeof AddonManager.createInstall === 'function') {
          install = await AddonManager.createInstall({ url: fileURL });
        }
      } catch {}
      if (!install) {
        try { if (AddonManager && typeof AddonManager.getInstallForFile === 'function') install = await AddonManager.getInstallForFile(nsFile); } catch {}
      }
      if (!install) {
        try {
          if (AddonManager && typeof AddonManager.getInstallForURL === 'function') {
            const maybe = AddonManager.getInstallForURL(fileURL, null, 'application/x-xpinstall');
            install = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
          }
        } catch {}
      }
      if (!install || typeof install.install !== 'function') {
        throw new Error('No suitable AddonManager installer method available');
      }
      await install.install();
      try { Services.prompt.alert(window || null, 'نصب/بروزرسانی افزونه', 'عملیات با موفقیت انجام شد.\nInstallation/Update completed.'); } catch {}
    } catch (e) {
      try {
        this.log('updatePluginFromFile error: ' + e);
        Services.prompt.alert(window || null, 'خطا | Error', 'امکان نصب/بروزرسانی وجود ندارد.\nCould not install/update.\n' + e);
      } catch {}
    }
  },

  async uninstallThisPlugin(window) {
    try {
      const title = 'حذف پلاگین | Remove Plugin';
      const text = 'آیا مطمئن هستید که می‌خواهید این پلاگین و متعلقات آن را حذف کنید؟\nAre you sure you want to uninstall this plugin?';
      if (!this._confirm(window, title, text)) return;

      const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
      const addon = await AddonManager.getAddonByID(this.id.replace(/:admin$/, ''))
        || await AddonManager.getAddonByID(this.id);
      if (!addon) {
        try { Services.prompt.alert(window || null, 'حذف پلاگین', 'افزونه یافت نشد.\nAddon not found.'); } catch {}
        return;
      }
      await addon.uninstall();
      try { Services.prompt.alert(window || null, 'حذف پلاگین', 'افزونه حذف شد.\nThe plugin has been uninstalled.'); } catch {}
    } catch (e) {
      try {
        this.log('uninstallThisPlugin error: ' + e);
        Services.prompt.alert(window || null, 'خطا | Error', 'امکان حذف وجود ندارد.\nCould not uninstall.\n' + e);
      } catch {}
    }
  },
};

