TranslatorUpdator = {
  id: null,
  version: null,
  rootURI: null,
  initialized: false,
  addedElementIDs: [],
  GITHUB_API_URL:
    "https://api.github.com/repos/Zotero-Project/ZoteroTranslators/contents/",
  RAW_BASE_URL:
    "https://raw.githubusercontent.com/Zotero-Project/ZoteroTranslators/main/",

  init({ id, version, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.initialized = true;
    this.log(`Plugin initialized with id: ${id}, version: ${version}`);
    try { this.registerHelpPanes(); } catch (e) { try { this.log('registerHelpPanes init error: ' + e); } catch {} }

  },

  // Open the tutorial/help window (HTML page bundled with plugin)
  openTutorialWindow(window) {
    try {
      const url = this.rootURI + "tutorial.html";
      const features = "chrome,dialog=no,all,resizable,centerscreen,width=900,height=650";
      let newWin = null;
      if (typeof Services !== "undefined" && Services.ww && Services.ww.openWindow) {
        newWin = Services.ww.openWindow(null, url, "_blank", features, null);
      } else if (window && window.open) {
        newWin = window.open(url, "_blank", features);
      }
      if (newWin && newWin.focus) newWin.focus();
      this.log("Opened tutorial window");
    } catch (e) {
      this.log("Error in openTutorialWindow: " + e);
    }
  },

  // Open a blank help/training window (placeholder for future content)
  openHelpWindow(window) {
    try {
      const url = this.rootURI + "help-blank.html";
      const features = "chrome,dialog=no,all,resizable,centerscreen,width=900,height=650";
      let newWin = null;
      if (typeof Services !== "undefined" && Services.ww && Services.ww.openWindow) {
        newWin = Services.ww.openWindow(null, url, "_blank", features, null);
      } else if (window && window.open) {
        newWin = window.open(url, "_blank", features);
      }
      if (newWin && newWin.focus) newWin.focus();
      this.log("Opened blank help window");
    } catch (e) {
      this.log("Error in openHelpWindow: " + e);
    }
  },

  // Register plugin preference panes for help/training and open Preferences on demand
  helpPaneIDs: [],
  async registerHelpPanes() {
    try {
      if (this.helpPaneIDs && this.helpPaneIDs.length) return;
      const paneTranslators = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-translators',
        label: this.localize('راهنمای مترجم‌ها', 'Translator Guide'),
        src: 'prefs/help_translators.xhtml'
      });
      const pane1 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-addtab',
        label: this.localize('افزودن تب', 'Add Extra Tabs'),
        src: 'prefs/help_addtab.xhtml'
      });
      const pane2 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-clipboard',
        label: this.localize('انتقال فایل از ویندوز با کلید میانبر', 'Clipboard Import Shortcuts'),
        src: 'prefs/help_clipboard.xhtml'
      });
      const pane3 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-collections-highlight',
        label: this.localize('نمایش پوشه در درخت', 'Highlight Collection in Tree'),
        src: 'prefs/help_collections_highlight.xhtml'
      });
      const pane4 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-zoom',
        label: this.localize('بزرگ‌نمایی رابط کاربری', 'UI Zoom Controls'),
        src: 'prefs/help_zoom.xhtml'
      });
      const pane5 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-plugin-settings',
        label: this.localize('تنظیمات و پشتیبانی افزونه', 'Plugin Settings & Support'),
        src: 'prefs/help_plugin_settings.xhtml'
      });
      const pane6 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-context-actions',
        label: this.localize('میانبرهای راست‌کلیک', 'Context Menu Actions'),
        src: 'prefs/help_context_actions.xhtml'
      });
      const pane7 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-encryption',
        label: this.localize('راهنمای رمزگذاری فایل', 'Attachment Encryption Guide'),
        src: 'prefs/help_encryption.xhtml'
      });
      this.helpPaneIDs = [paneTranslators, pane1, pane2, pane3, pane4, pane5, pane6, pane7];
      this.log('Registered help preference panes: ' + JSON.stringify(this.helpPaneIDs));
    } catch (e) {
      this.log('Error registering help panes: ' + e);
    }
  },

  async openHelpPreferences() {
    try {
      await this.registerHelpPanes();
      const first = this.helpPaneIDs && this.helpPaneIDs[0];
      let win;
      if (first) {
        win = Zotero.Utilities.Internal.openPreferences(first);
      } else {
        win = Zotero.Utilities.Internal.openPreferences();
      }

      // Apply "help-only" view: hide built-in panes and non-help UI
      const applyTweaks = () => {
        try {
          const doc = win && win.document;
          if (!doc) return false;

          const isFa = this.isPersianLocale();
          if (doc.documentElement && doc.documentElement.classList) {
            doc.documentElement.classList.toggle('tu-locale-fa', !!isFa);
            doc.documentElement.classList.toggle('tu-locale-en', !isFa);
          }

          const toggleLocaleBlocks = () => {
            try {
              const showSelector = isFa ? '.tu-lang-fa' : '.tu-lang-en';
              const hideSelector = isFa ? '.tu-lang-en' : '.tu-lang-fa';
              doc.querySelectorAll(hideSelector).forEach((el) => el.setAttribute('hidden', 'true'));
              doc.querySelectorAll(showSelector).forEach((el) => el.removeAttribute('hidden'));
            } catch (err) {
              try { this.log('toggleLocaleBlocks error: ' + err); } catch {}
            }
          };
          toggleLocaleBlocks();

          const nav = doc.getElementById('prefs-navigation');
          const content = doc.getElementById('prefs-content');
          if (!nav || !content) return false;

          // Inject style: hide search/help and separator (do NOT hide all items)
          if (!doc.getElementById('tu-help-only-style')) {
            const style = doc.createElementNS('http://www.w3.org/1999/xhtml', 'style');
            style.id = 'tu-help-only-style';
            style.textContent = `
              #prefs-navigation > hr { display: none !important; }
              #prefs-search-container, #prefs-help-container { display: none !important; }
            `;
            doc.documentElement.appendChild(style);
          }

          // Hide built-in panes; keep our help panes visible
          const builtInIDs = new Set([
            'zotero-prefpane-general',
            'zotero-prefpane-sync',
            'zotero-prefpane-export',
            'zotero-prefpane-cite',
            'zotero-prefpane-advanced',
            'zotero-subpane-reset-sync',
            'zotero-subpane-file-renaming',
          ]);
          const keepIDs = new Set(this.helpPaneIDs || []);
          for (let child of Array.from(nav.children)) {
            try {
              const val = child.value || child.getAttribute('value');
              if (!val) continue;
              if (builtInIDs.has(val)) {
                child.hidden = true;
                child.style.display = 'none';
              } else if (keepIDs.size && keepIDs.has(val)) {
                child.hidden = false;
                child.style.display = '';
              }
            } catch {}
          }

          // Ensure a help pane is selected
          if (win.Zotero_Preferences && keepIDs.size) {
            const cur = win.Zotero_Preferences.navigation.value;
            if (!keepIDs.has(cur)) {
              win.Zotero_Preferences.navigation.value = this.helpPaneIDs[0];
              if (win.Zotero_Preferences.navigateToPane) {
                win.Zotero_Preferences.navigateToPane(this.helpPaneIDs[0]);
              }
            }
          }

          toggleLocaleBlocks();
          return true;
        } catch (e) {
          try { this.log('Error applying help-only tweaks: ' + e); } catch {}
          toggleLocaleBlocks();
          return false;
        }
      };

      // Try immediately, then poll until preferences script finishes building UI
      if (!applyTweaks()) {
        let attempts = 0;
        const timer = win.setInterval(() => {
          attempts++;
          if (applyTweaks() || attempts > 60) {
            win.clearInterval(timer);
          }
        }, 100);
      }
    } catch (e) {
      this.log('Error opening help preferences: ' + e);
    }
  },

  log(msg) {
    Zotero.debug("TranslatorUpdator: " + msg);
  },

  UI_FONT_PREF: "fontSize",
  UI_FONT_STEPS: [
    "0.77",
    "0.85",
    "0.92",
    "1.00",
    "1.08",
    "1.15",
    "1.23",
    "1.38",
    "1.54",
    "1.85",
  ],
  UI_FONT_DEFAULT: "1.00",

  adjustUIScale(direction) {
    try {
      if (!Zotero || !Zotero.Prefs) {
        throw new Error("Zotero.Prefs unavailable");
      }
      const steps = this.UI_FONT_STEPS;
      const pref = this.UI_FONT_PREF;
      const defaultValue = this.UI_FONT_DEFAULT;
      const epsilon = 0.001;

      if (direction === "reset") {
        Zotero.Prefs.clear(pref);
      } else {
        let current = Zotero.Prefs.get(pref);
        if (!current) {
          current = defaultValue;
        }
        const currentNum = parseFloat(current);
        const safeCurrent = Number.isFinite(currentNum)
          ? currentNum
          : parseFloat(defaultValue);

        let nextStep;
        if (direction === "up") {
          nextStep = steps[steps.length - 1];
          for (const step of steps) {
            const stepNum = parseFloat(step);
            if (stepNum - safeCurrent > epsilon) {
              nextStep = step;
              break;
            }
          }
        } else if (direction === "down") {
          nextStep = steps[0];
          for (let i = steps.length - 1; i >= 0; i--) {
            const stepNum = parseFloat(steps[i]);
            if (safeCurrent - stepNum > epsilon) {
              nextStep = steps[i];
              break;
            }
          }
        } else {
          throw new Error("Unknown direction: " + direction);
        }

        if (Math.abs(parseFloat(nextStep) - safeCurrent) < epsilon) {
          return;
        }

        Zotero.Prefs.set(pref, String(nextStep));
      }

      if (Zotero.UIProperties && typeof Zotero.UIProperties.setAll === "function") {
        Zotero.UIProperties.setAll();
      }
    } catch (e) {
      try { this.log("adjustUIScale error: " + e); } catch {}
    }
  },

  increaseUIScale() {
    this.adjustUIScale("up");
  },

  decreaseUIScale() {
    this.adjustUIScale("down");
  },

  resetUIScale() {
    this.adjustUIScale("reset");
  },

  // اعتبارسنجی و اصلاح متون فارسی
  sanitizePersianText(text) {
    try {
      // تلاش برای رمزگشایی به UTF-8
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(text);
      const decoded = decoder.decode(utf8Bytes);
      return decoded;
    } catch (e) {
      this.log(`Error sanitizing text: ${e}`);
      return text; // در صورت خطا، متن اصلی رو برگردون
    }
  },

  isPersianLocale() {
    try {
      const locale = Zotero.locale || "en-US";
      return String(locale).toLowerCase().startsWith("fa");
    } catch (e) {
      try { this.log("isPersianLocale error: " + e); } catch {}
      return false;
    }
  },

  localize(faText, enText) {
    return this.isPersianLocale() ? faText : (enText !== undefined ? enText : faText);
  },



  getLocalizedString(key, params = {}) {
    const strings = {
      "menu.label": this.localize('به‌روزرسانی مترجم‌ها', 'Update Translators'),
      "progress.start": this.localize('🚀 شروع به‌روزرسانی...', '🚀 Starting update...'),
      "progress.fetching": this.localize('دریافت لیست فایل‌ها...', 'Fetching file list...'),
      "progress.downloading": ({ file }) => this.localize(`📥 دانلود ${file}...`, `📥 Downloading ${file}...`),
      "progress.saving": ({ file }) => this.localize(`💾 ذخیره ${file}...`, `💾 Saving ${file}...`),
      "progress.noMetadata": ({ file }) => this.localize(`⚠️ متادیتا برای ${file} یافت نشد`, `⚠️ No metadata for ${file}`),
      "progress.errorFetch": ({ file }) => this.localize(`❌ خطا در دانلود ${file}`, `❌ Failed to fetch ${file}`),
      "progress.completed": this.localize('✅ به‌روزرسانی با موفقیت تکمیل شد!', '✅ Update completed successfully!'),
      "progress.available": this.localize('📚 مترجم‌ها آماده‌اند؛ در صورت نیاز صفحهٔ مرورگر را تازه کنید.', '📚 Translators are ready; refresh the browser page if needed.'),
      "progress.error": ({ file }) => this.localize(`❌ خطا: ${file}`, `❌ Error: ${file}`),
      "button.close": this.localize('برای بستن کلیک کنید...', 'Click to close...'),
    };

    const value = strings[key];
    if (typeof value === 'function') {
      try {
        return value(params || {});
      } catch (err) {
        try { this.log('getLocalizedString handler error: ' + err); } catch {}
        return key;
      }
    }

    return value || key;
  },

  // Ask user to confirm an action (simple yes/no)
  _confirm(window, title, text) {
    try {
      return Services.prompt.confirm(window || null, title, text);
    } catch (e) {
      try { this.log('Confirm error: ' + e); } catch {}
      return false;
    }
  },

  // Update/install a plugin from a local file (XPI/ZIP) after confirmation
  async updatePluginFromFile(window) {
    try {
      const title = this.localize('تایید', 'Confirm');
      const text = this.localize('آیا می‌خواهید فایل افزونه را انتخاب کرده و نصب/بروزرسانی کنید؟', 'Are you sure you want to install/update the plugin from a file?');
      if (!this._confirm(window, title, text)) return;

      const { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');
      const fp = new FilePicker();
      fp.init(window, this.localize('انتخاب فایل افزونه', 'Choose Plugin File'), fp.modeOpen);
      // Common plugin package formats
      try { fp.appendFilter('Zotero Plugin (*.xpi, *.zip)', '*.xpi; *.zip'); } catch {}
      try { fp.appendFilters(fp.filterAll); } catch {}
      const rv = await fp.show();
      if (rv !== fp.returnOK) return;

      const path = fp.file; // string path
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

      // Fallbacks for platforms where createInstall() isn't available
      if (!install) {
        try {
          if (AddonManager && typeof AddonManager.getInstallForFile === 'function') {
            install = await AddonManager.getInstallForFile(nsFile);
          }
        } catch {}
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

      try {
        Services.prompt.alert(window || null, this.localize('نصب/بروزرسانی افزونه', 'Install/Update Plugin'), this.localize('عملیات با موفقیت انجام شد.', 'Installation/Update completed.'));
      } catch {}
    } catch (e) {
      try {
        this.log('Error in updatePluginFromFile: ' + e);
        Services.prompt.alert(window || null, this.localize('خطا', 'Error'), `${this.localize('امکان نصب/بروزرسانی وجود ندارد.', 'Could not install/update.')}\n${e}`);
      } catch {}
    }
  },

  // Uninstall this plugin after confirmation
  async uninstallThisPlugin(window) {
    try {
      const title = this.localize('حذف پلاگین', 'Remove Plugin');
      const text = this.localize('آیا مطمئن هستید که می‌خواهید این پلاگین و متعلقات آن را حذف کنید؟', 'Are you sure you want to uninstall this plugin?');
      if (!this._confirm(window, title, text)) return;

      const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
      const addon = await AddonManager.getAddonByID(this.id);
      if (!addon) {
        try { Services.prompt.alert(window || null, this.localize('حذف پلاگین', 'Remove Plugin'), this.localize('افزونه یافت نشد.', 'Addon not found.')); } catch {}
        return;
      }
      await addon.uninstall();
      try {
        Services.prompt.alert(window || null, this.localize('حذف پلاگین', 'Remove Plugin'), this.localize('افزونه حذف شد.', 'The plugin has been uninstalled.'));
      } catch {}
    } catch (e) {
      try {
        this.log('Error in uninstallThisPlugin: ' + e);
        Services.prompt.alert(window || null, this.localize('خطا', 'Error'), `${this.localize('امکان حذف وجود ندارد.', 'Could not uninstall.')}\n${e}`);
      } catch {}
    }
  },

  async refreshTranslatorCaches() {
    try {
      await Zotero.Translators.reinit({ reinit: true });
      this.log('Translators cache reinitialized');
    } catch (e) {
      try { this.log('Error reinitializing translators: ' + e); } catch {}
    }
    try {
      await Zotero.HTTP.request('POST', 'http://127.0.0.1:23119/connector/ping', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translatorsUpdated: true })
      });
      this.log('Connector ping dispatched');
    } catch (e) {
      try { this.log('Connector ping failed: ' + e); } catch {}
    }
  },

  async runInsertTranslator() {
    let progressWin;
    try {
      progressWin = new Zotero.ProgressWindow({ popup: true });
      progressWin.changeHeadline(this.getLocalizedString("progress.start"));
      progressWin.addDescription(this.getLocalizedString("progress.fetching"), {
        style: "font-size: 14px; color: #333; padding: 5px;",
      });
      this.log("Progress window created");
      progressWin.show();

      await Zotero.initializationPromise;
      this.log("Zotero initialization complete");

      let translatorsDir = Zotero.getTranslatorsDirectory();
      this.log("Translators directory: " + translatorsDir.path);

      let response = await fetch(this.GITHUB_API_URL);
      if (!response.ok) throw new Error("GitHub API fetch failed");
      let files = await response.json();
      this.log(`Fetched ${files.length} files from GitHub`);

      let progressItem = new progressWin.ItemProgress(
        "chrome://zotero/skin/tick.png",
        this.getLocalizedString("progress.fetching")
      );
      progressItem.setProgress(10);

      const totalFiles = files.filter((file) =>
        file.name.endsWith(".js")
      ).length;
      let processedFiles = 0;

      for (let file of files) {
        if (!file.name.endsWith(".js")) continue;

        processedFiles++;
        const progressPercent = 10 + (processedFiles / totalFiles) * 80;

        progressItem.setText(
          this.getLocalizedString("progress.downloading", { file: file.name })
        );
        progressItem.setProgress(progressPercent);
        this.log(`Downloading ${file.name}`);

        let rawURL = this.RAW_BASE_URL + file.name;
        let fileResponse = await fetch(rawURL);
        if (!fileResponse.ok) {
          progressItem.setText(
            this.getLocalizedString("progress.errorFetch", { file: file.name })
          );
          this.log(`Failed to fetch ${file.name}`);
          continue;
        }
        // خواندن پاسخ به‌صورت Blob و تبدیل به UTF-8
        let blob = await fileResponse.blob();
        let content = await blob.text(); // به‌طور پیش‌فرض UTF-8
        content = this.sanitizePersianText(content); // اعتبارسنجی متن

        progressItem.setText(
          this.getLocalizedString("progress.saving", { file: file.name })
        );
        progressItem.setProgress(progressPercent + 5);
        this.log(`Saving ${file.name}`);

        let targetFile = translatorsDir.clone();
        targetFile.append(file.name);
        if (targetFile.exists()) targetFile.remove(false);

        // استفاده از Zotero.File.putContents برای ذخیره با UTF-8
        await Zotero.File.putContents(targetFile, content);
        this.log(`Saved: ${file.name}`);

        let metadataMatch = content.match(
          /{[\s\S]*?"lastUpdated":\s*".*?"[\s\S]*?}/
        );
        if (metadataMatch) {
          let metadataStr = this.sanitizePersianText(metadataMatch[0]);
          let metadata = JSON.parse(metadataStr);

          // اعتبارسنجی فیلدهای متادیتا
          for (let key in metadata) {
            if (typeof metadata[key] === "string") {
              metadata[key] = this.sanitizePersianText(metadata[key]);
            }
          }

          await Zotero.DB.queryAsync(`
            CREATE TABLE IF NOT EXISTS translatorCache (
              fileName TEXT PRIMARY KEY,
              metadataJSON TEXT,
              lastModifiedTime INTEGER
            )`);

          let now = Date.now();
          await Zotero.DB.queryAsync(
            `
            INSERT OR REPLACE INTO translatorCache (fileName, metadataJSON, lastModifiedTime)
            VALUES (?, ?, ?)`,
            [file.name, JSON.stringify(metadata), now]
          );
          this.log(`Metadata saved for ${file.name}`);
        } else {
          progressItem.setText(
            this.getLocalizedString("progress.noMetadata", { file: file.name })
          );
          this.log(`No metadata found in ${file.name}`);
        }
      }

      await this.refreshTranslatorCaches();

      progressItem.setText(this.getLocalizedString("progress.completed"));
      progressItem.setProgress(100);
      progressWin.addDescription(
        this.getLocalizedString("progress.available"),
        {
          style:
            "font-size: 14px; color: #333; padding: 5px; font-weight: bold;",
        }
      );
      progressWin.addDescription(this.getLocalizedString("button.close"), {
        style:
          "font-size: 14px; color: #333; padding: 5px; text-align: center;",
      });
      this.log("Update completed");

      // اضافه کردن رویداد کلیک بعد از تکمیل فرآیند
      if (progressWin.window && progressWin.window.document) {
        let closeHandler = () => {
          this.log("Window closed by clicking anywhere");
          progressWin.close();
        };
        progressWin.window.document.addEventListener("click", closeHandler, {
          once: true,
        });
        this.log("Click event listener added to document after completion");
      }

      setTimeout(() => {
        this.log("Auto-closing progress window");
        progressWin.close();
      }, 5000);
    } catch (e) {
      this.log("Error in runInsertTranslator: " + e);
      progressWin = progressWin || new Zotero.ProgressWindow({ popup: true });
      progressWin.changeHeadline(
        this.getLocalizedString("progress.error", { file: e.toString() })
      );
      progressWin.addDescription(this.getLocalizedString("button.close"), {
        style:
          "font-size: 14px; color: #333; padding: 5px; text-align: center;",
      });
      progressWin.show();

      // اضافه کردن رویداد کلیک در حالت خطا
      if (progressWin.window && progressWin.window.document) {
        let closeHandler = () => {
          this.log("Window closed by clicking anywhere (error state)");
          progressWin.close();
        };
        progressWin.window.document.addEventListener("click", closeHandler, {
          once: true,
        });
        this.log("Click event listener added to document after error");
      }

      setTimeout(() => {
        this.log("Auto-closing progress window (error state)");
        progressWin.close();
      }, 5000);
    }
  },

  addToWindow(window) {
    try {
      let doc = window.document;
      // ?????: ???? ???? ?????? �??????�
      this.addTopPluginMenu(window);

      if (doc.getElementById("update-translators-btn")) {
        this.log("Update Translators menu item already exists; skipping");
      } else {
        const pluginMenu = doc.getElementById("tu-plugin-menu");
        const menuPopup =
          pluginMenu && (pluginMenu.menupopup || pluginMenu.querySelector("menupopup"));

        if (!menuPopup) {
          this.log("Plugin menu popup not found");
        } else {
          let item = doc.createXULElement("menuitem");
          item.id = "update-translators-btn";
          item.setAttribute("label", this.getLocalizedString("menu.label"));
          item.addEventListener("command", () => {
            this.log("Update Translators menu item clicked");
            this.runInsertTranslator();
          });

          const newWindowItem = menuPopup.querySelector("#tu-plugin-menu-new-window");
          if (newWindowItem && newWindowItem.parentNode === menuPopup) {
            if (newWindowItem.nextSibling) {
              menuPopup.insertBefore(item, newWindowItem.nextSibling);
            } else {
              menuPopup.appendChild(item);
            }
          } else if (menuPopup.firstChild) {
            menuPopup.insertBefore(item, menuPopup.firstChild);
          } else {
            menuPopup.appendChild(item);
          }

          this.storeAddedElement(item);
          this.log("Menu item added to plugin menu");
        }
      }
      // Ensure item context menu remains functional
      this.installContextMenuRescue(window);

      // Patch labels and add custom item to the item context menu
      this.installItemMenuPatches(window);

      // Patch collection menu labels (fallbacks for missing l10n)
      this.installCollectionMenuPatches(window);
    } catch (e) {
      this.log("Error in addToWindow: " + e);
    }
  },



  // پیدا کردن مناسب‌ترین کانتینر نوار ابزار در بالای پنجره
  getToolbarContainer(window) {
    const doc = window.document;
    // اول: چند ID رایج در زوترو
    const candidates = [
      "zotero-items-toolbar",
      "zotero-toolbar",
      "zotero-pane-toolbar",
      "toolbar-menubar",
    ];
    for (const id of candidates) {
      const el = doc.getElementById(id);
      if (el) return el;
    }
    // دوم: یک toolbar داخل toolbox
    const tbInToolbox = doc.querySelector("toolbox toolbar");
    if (tbInToolbox) return tbInToolbox;
    // سوم: هر toolbar موجود (اولین)
    const anyToolbar = doc.querySelector("toolbar");
    if (anyToolbar) return anyToolbar;
    // چهارم: اگر منوبار هست، از والدِ آن استفاده کن
    const menubar = doc.getElementById("main-menubar") || doc.querySelector("menubar");
    if (menubar && menubar.parentElement) return menubar.parentElement;
    return null;
  },



  // Ensure item context menu works even if another handler interferes
  installContextMenuRescue(window) {
    try {
      if (!window || !window.ZoteroPane) return;
      const doc = window.document;
      const itemsTree = doc.getElementById('zotero-items-tree');
      if (!itemsTree || itemsTree._tu_context_rescue) return;
      itemsTree._tu_context_rescue = true;
      itemsTree.addEventListener('contextmenu', (event) => {
        try {
          const menu = doc.getElementById('zotero-itemmenu');
          if (!menu) return;
          // Wait to let Zotero build/translate the menu first.
          // Only open if it failed to open on its own (fallback path).
          setTimeout(() => {
            try {
              if (menu.state !== 'open') {
                menu.openPopupAtScreen(event.screenX, event.screenY, true);
              }
            } catch {}
          }, 220);
        } catch {}
      }, { capture: false });
    } catch (e) {
      try { this.log('installContextMenuRescue error: ' + e); } catch {}
    }
  },


  // Fix missing labels in item context menu and add "open PDF in new tab"
  installItemMenuPatches(window) {
    try {
      if (!window || !window.ZoteroPane) return;
      const doc = window.document;
      const menu = doc.getElementById('zotero-itemmenu');
      if (!menu || menu._tu_patched) return;
      menu._tu_patched = true;

      const labels = {
        viewInTab: this.localize('نمایش در تب جدید', 'Open in New Tab'),
        viewInWindow: this.localize('نمایش در پنجره جدید', 'Open in New Window'),
        viewPDFInNewTab: this.localize('خواندن در صفحه جدید', 'Open PDF in New Tab'),
        showFile: this.localize('نمایش فایل در پوشه', 'Show File in Folder'),
        viewOnline: this.localize('نمایش نسخه برخط', 'View Online'),
        viewExternal: this.localize('باز کردن با برنامه دیگر', 'Open in External Viewer'),
        addToCollection: this.localize('افزودن به مجموعه', 'Add to Collection'),
      };

      const ensureLabels = () => {
        try {
          // Try Fluent first; ignore errors
          try { if (doc.l10n?.translateFragment) doc.l10n.translateFragment(menu); } catch {}

          const fix = (selector, label) => {
            const nodes = menu.querySelectorAll(selector);
            nodes.forEach((el) => {
              const lbl = el.getAttribute('label');
              if (!lbl || !String(lbl).trim()) {
                el.setAttribute('label', label);
              }
            });
          };

          // Possible classes assigned by Zotero for these actions
          fix('.zotero-menuitem-new-tab', labels.viewInTab);
          fix('.zotero-menuitem-new-window', labels.viewInWindow);
          // Assign attachment open behavior based on user pref; first item = default, second = alternate
          const openInWindowPref = (() => { try { return Services.prefs.getBoolPref('extensions.zotero.openReaderInNewWindow', false); } catch { return false; } })();
          const attachNodes = Array.from(menu.querySelectorAll('.zotero-menuitem-attachments-pdf, .zotero-menuitem-attachments-epub, .zotero-menuitem-attachments-snapshot'))
            .filter(el => !el.getAttribute('label') || !el.getAttribute('label').trim());
          if (attachNodes.length) {
            const firstLabel = openInWindowPref ? labels.viewInWindow : labels.viewInTab;
            const secondLabel = openInWindowPref ? labels.viewInTab : labels.viewInWindow;
            if (attachNodes[0]) attachNodes[0].setAttribute('label', firstLabel);
            if (attachNodes[1]) attachNodes[1].setAttribute('label', secondLabel);
            if (attachNodes.length > 2) {
              for (let i = 2; i < attachNodes.length; i++) {
                attachNodes[i].setAttribute('label', labels.viewInTab);
              }
            }
          }
          fix('.zotero-menuitem-show-file', labels.showFile);
          fix('.zotero-menuitem-view-online', labels.viewOnline);
          fix('.zotero-menuitem-view-external', labels.viewExternal);
          // Submenu label sometimes missing
          fix('.zotero-menuitem-add-to-collection', labels.addToCollection);
        } catch {}
      };

      const addOpenPDFInNewTab = async () => {
        try {
          // Remove if exists to avoid duplicates
          const existing = doc.getElementById('tu-open-pdf-new-tab');
          if (existing) existing.remove();

          // Determine if selection has a PDF attachment
          let items = window.ZoteroPane.getSelectedItems();
          if (!items || !items.length) return;

          // Find first usable PDF attachment
          let pdfAttachment = null;
          for (let item of items) {
            try {
              if (item.isAttachment()) {
                if (item.attachmentContentType === 'application/pdf' || item.attachmentReaderType === 'pdf') {
                  pdfAttachment = item;
                  break;
                }
              } else {
                const atts = await item.getBestAttachments();
                for (let att of atts) {
                  if (att.attachmentContentType === 'application/pdf' || att.attachmentReaderType === 'pdf') {
                    pdfAttachment = att;
                    break;
                  }
                }
                if (pdfAttachment) break;
              }
            } catch {}
          }

          if (!pdfAttachment) return;

          // Insert after "View Online" if present, else at top
          const viewOnline = menu.querySelector('.zotero-menuitem-view-online');
          const insertAfter = viewOnline || menu.firstChild;

          const mi = doc.createXULElement('menuitem');
          mi.id = 'tu-open-pdf-new-tab';
          mi.setAttribute('class', 'menuitem-iconic zotero-menuitem-attachments-pdf');
          mi.setAttribute('zotero-locate', 'true');
          mi.setAttribute('label', labels.viewPDFInNewTab);
          mi.addEventListener('command', async (event) => {
            try {
              const openReaderInNewWindow = Services.prefs.getBoolPref('extensions.zotero.openReaderInNewWindow', false);
              const attachments = [pdfAttachment.id];
              // Toggle only if pref would open in window; we always want a tab
              const extra = { forceAlternateWindowBehavior: !!openReaderInNewWindow };
              window.ZoteroPane.viewAttachment(attachments, event, false, extra);
            } catch (e) { try { Zotero.debug('tu-open-pdf-new-tab error: ' + e); } catch {} }
          });

          if (insertAfter && insertAfter.nextSibling) {
            menu.insertBefore(mi, insertAfter.nextSibling);
          } else {
            menu.insertBefore(mi, menu.firstChild);
          }
        } catch {}
      };

      menu.addEventListener('popupshowing', () => {
        ensureLabels();
        // Remove our custom PDF entry if it exists (requested: keep only native two options)
        try {
          const custom = doc.getElementById('tu-open-pdf-new-tab');
          if (custom) custom.remove();
        } catch {}
      });
    } catch (e) {
      try { this.log('installItemMenuPatches error: ' + e); } catch {}
    }
  },

  installCollectionMenuPatches(window) {
    try {
      if (!window || !window.ZoteroPane) return;
      const doc = window.document;
      const menu = doc.getElementById('zotero-collectionmenu');
      if (!menu || menu._tu_patched) return;
      menu._tu_patched = true;

      const labels = {
        rename: this.localize('تغییر نام مجموعه…', 'Rename Collection…'),
        move: this.localize('جابجایی مجموعه…', 'Move Collection…'),
        copy: this.localize('کپی از مجموعه…', 'Copy Collection…'),
      };

      const ensureLabels = async () => {
        try {
          // Try to trigger Fluent first
          try { if (doc.l10n && doc.l10n.translateFragment) await doc.l10n.translateFragment(menu); } catch {}

          const fix = (selector, label) => {
            const el = menu.querySelector(selector);
            if (el && (!el.getAttribute('label') || !el.getAttribute('label').trim())) {
              el.setAttribute('label', label);
            }
          };
          // These are <menu> elements that rely on Fluent
          fix('.zotero-menuitem-move-collection', labels.move);
          fix('.zotero-menuitem-copy-collection', labels.copy);
          // And the plain menuitem that also uses Fluent
          fix('.zotero-menuitem-edit-collection', labels.rename);
        } catch {}
      };

      menu.addEventListener('popupshowing', () => {
        ensureLabels();
      });
    } catch (e) {
      try { this.log('installCollectionMenuPatches error: ' + e); } catch {}
    }
  },

  


  addTopPluginMenu(window) {
    try {
      const doc = window.document;

      // اگر قبلاً اضافه شده، دوباره نساز
      if (doc.getElementById("tu-plugin-menu")) {
        this.log("Plugin menu already exists; skipping");
        return;
      }

      // پیدا کردن menubar بالای زوترو
      const menubar =
        doc.getElementById("main-menubar") ||
        doc.getElementById("toolbar-menubar") ||
        doc.querySelector("menubar");

      if (!menubar) {
        this.log("Menubar not found; cannot add top-level plugin menu");
        return;
      }

      // ساخت منوی بالایی «پلاگین»
      const menu = doc.createXULElement("menu");
      menu.id = "tu-plugin-menu";
      menu.setAttribute("label", this.localize("پلاگین", "Plugin"));

      const popup = doc.createXULElement("menupopup");
      menu.appendChild(popup);
      menubar.appendChild(menu);

      this.storeAddedElement(menu);
      this.log("Top-level plugin menu added");

    } catch (e) {
      this.log("Error in addTopPluginMenu: " + e);
    }
  },


  
  // باز کردن یک پنجره اصلی جدید از زوترو (Multi-window)
     openNewMainWindow(window) {
    try {
      const url = window.document && window.document.documentURI;
      if (!url) throw new Error("Cannot resolve main window URL");

      const features = "chrome,dialog=no,all,resizable,centerscreen";
      let newWin = null;

      if (typeof Services !== "undefined" && Services.ww && Services.ww.openWindow) {
        newWin = Services.ww.openWindow(null, url, "_blank", features, null);
      } else if (window.openDialog) {
        newWin = window.openDialog(url, "_blank", features, null);
      } else {
        throw new Error("No API to open a new window");
      }

      if (newWin && newWin.focus) newWin.focus();
      this.log("Opened a new Zotero main window");
    } catch (e) {
      this.log("Error in openNewMainWindow: " + e);
    }
  },




  // ========================================================================================

  addToAllWindows() {
    try {
      this.log("Attempting to add menu to all windows");
      for (let win of Zotero.getMainWindows()) {
        if (!win.ZoteroPane) {
          this.log("Skipping window without ZoteroPane");
          continue;
        }
        this.addToWindow(win);
      }
      this.log("Finished adding menu to all windows");
    } catch (e) {
      this.log("Error in addToAllWindows: " + e);
    }
  },

  storeAddedElement(elem) {
    if (!elem.id) {
      this.log("Error: Element must have an id");
      throw new Error("Element must have an id");
    }
    this.addedElementIDs.push(elem.id);
    this.log(`Stored element with id: ${elem.id}`);
  },

  removeFromWindow(window) {
    try {
      let doc = window.document;
      for (let id of this.addedElementIDs) {
        let elem = doc.getElementById(id);
        if (elem) {
          elem.remove();
          this.log(`Removed element with id: ${id}`);
        }
      }
    } catch (e) {
      this.log("Error in removeFromWindow: " + e);
    }
  },

  removeFromAllWindows() {
    try {
      this.log("Removing menu from all windows");
      for (let win of Zotero.getMainWindows()) {
        if (!win.ZoteroPane) continue;
        this.removeFromWindow(win);
      }
      this.log("Finished removing menu from all windows");
    } catch (e) {
      this.log("Error in removeFromAllWindows: " + e);
    }
  },
};

(function () {
  try {
    // Final override to ensure proper Persian labels and minimal items
    TranslatorUpdator.addTopPluginMenu = function (window) {
      try {
        const doc = window.document;
        if (doc.getElementById("tu-plugin-menu")) return;

        const menubar =
          doc.getElementById("main-menubar") ||
          doc.getElementById("toolbar-menubar") ||
          doc.querySelector("menubar");
        if (!menubar) return;

        const menu = doc.createXULElement("menu");
        menu.id = "tu-plugin-menu";
        menu.setAttribute("label", this.localize("پلاگین", "Plugin"));

        const popup = doc.createXULElement("menupopup");

        const newWinItem = doc.createXULElement("menuitem");
        newWinItem.id = "tu-plugin-menu-new-window";
        newWinItem.setAttribute("label", this.localize("افزودن صفحه", "Open New Window"));
        newWinItem.addEventListener("command", () => this.openNewMainWindow(window));
        popup.appendChild(newWinItem);

        // Help/Tutorial page
        const helpItem = doc.createXULElement("menuitem");
        helpItem.id = "tu-plugin-menu-help";
        helpItem.setAttribute("label", this.localize("آموزش پلاگین", "Plugin Tutorial"));
        helpItem.addEventListener("command", () => this.openTutorialWindow(window));
        popup.appendChild(helpItem);

        menu.appendChild(popup);
        menubar.appendChild(menu);

        this.storeAddedElement(menu);
        this.storeAddedElement(newWinItem);
      } catch (e) {
        try { this.log("Error in addTopPluginMenu (final override): " + e); } catch {}
      }
    };
  } catch (e) {
    try { Zotero.debug("TranslatorUpdator final override init error: " + e); } catch {}
  }
})();

(function () {
  try {
    TranslatorUpdator.addTopPluginMenu = function (window) {
      try {
        const doc = window.document;
        if (doc.getElementById("tu-plugin-menu")) return;

        const menubar =
          doc.getElementById("main-menubar") ||
          doc.getElementById("toolbar-menubar") ||
          doc.querySelector("menubar");
        if (!menubar) return;

        const menu = doc.createXULElement("menu");
        menu.id = "tu-plugin-menu";
        menu.setAttribute("label", this.localize("پلاگین", "Plugin"));

        const popup = doc.createXULElement("menupopup");

        const newWinItem = doc.createXULElement("menuitem");
        newWinItem.id = "tu-plugin-menu-new-window";
        newWinItem.setAttribute("label", this.localize("افزودن صفحه", "Open New Window"));
        newWinItem.addEventListener("command", () => this.openNewMainWindow(window));
        popup.appendChild(newWinItem);

        const zoomMenu = doc.createXULElement("menu");
        zoomMenu.id = "tu-zoom-menu";
        zoomMenu.setAttribute("label", this.localize("بزرگ‌نمایی", "Zoom"));

        const zoomPopup = doc.createXULElement("menupopup");

        const zoomInItem = doc.createXULElement("menuitem");
        zoomInItem.id = "tu-zoom-increase";
        zoomInItem.setAttribute("label", this.localize("بزرگ‌نمایی (+)", "Zoom In (+)"));
        zoomInItem.setAttribute("closemenu", "none");
        zoomPopup.appendChild(zoomInItem);

        const zoomOutItem = doc.createXULElement("menuitem");
        zoomOutItem.id = "tu-zoom-decrease";
        zoomOutItem.setAttribute("label", this.localize("کوچک‌نمایی (-)", "Zoom Out (-)"));
        zoomOutItem.setAttribute("closemenu", "none");
        zoomPopup.appendChild(zoomOutItem);

        const zoomResetItem = doc.createXULElement("menuitem");
        zoomResetItem.id = "tu-zoom-reset";
        zoomResetItem.setAttribute("label", this.localize("حالت پیش‌فرض (0)", "Reset Zoom (0)"));
        zoomResetItem.setAttribute("closemenu", "none");
        zoomPopup.appendChild(zoomResetItem);

        zoomPopup.addEventListener("command", (event) => {
          try {
            const target = event.target || event.originalTarget;
            if (!target || !target.id) {
              return;
            }
            const id = target.id;
            if (id === "tu-zoom-increase") {
              this.increaseUIScale();
            } else if (id === "tu-zoom-decrease") {
              this.decreaseUIScale();
            } else if (id === "tu-zoom-reset") {
              this.resetUIScale();
            } else {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            window.setTimeout(() => {
              try {
                const parentPopup = menu.menupopup || menu.querySelector("menupopup");
                if (parentPopup && parentPopup.state !== "open" && typeof parentPopup.openPopup === "function") {
                  menu.open = true;
                  menu.setAttribute("open", "true");
                  parentPopup.openPopup(menu, "after_start", 0, 0, true, false);
                }
                const subPopup = zoomMenu.menupopup || zoomPopup;
                if (subPopup && subPopup.state !== "open" && typeof subPopup.openPopup === "function") {
                  zoomMenu.open = true;
                  zoomMenu.setAttribute("open", "true");
                  subPopup.openPopup(zoomMenu, "after_start", 0, 0, true, false);
                }
              } catch (err2) {
                try { this.log("Zoom menu reopen error: " + err2); } catch {}
              }
            }, 0);
          } catch (err) {
            try { this.log("Zoom menu command error: " + err); } catch {}
          }
        });

        zoomMenu.appendChild(zoomPopup);
        popup.appendChild(zoomMenu);

        // Clipboard Mode submenu
        const clipMenu = doc.createXULElement("menu");
        clipMenu.id = "tu-clipboard-mode-menu";
        clipMenu.setAttribute("label", this.localize("انتقال از کلیپ‌برد", "Clipboard Mode"));

        const clipPopup = doc.createXULElement("menupopup");

        const mode1 = doc.createXULElement("menuitem");
        mode1.id = "tu-clipboard-mode-force";
        mode1.setAttribute("type", "radio");
        mode1.setAttribute("name", "tu-clipboard-mode-group");
        mode1.setAttribute("label", this.localize("همیشه انتقال (حالت مخصوص)", "Always Import (Force Mode)"));

        const mode2 = doc.createXULElement("menuitem");
        mode2.id = "tu-clipboard-mode-respect";
        mode2.setAttribute("type", "radio");
        mode2.setAttribute("name", "tu-clipboard-mode-group");
        mode2.setAttribute("label", this.localize("تشخیص کات/کپی (حالت عادی)", "Respect Clipboard (Default Mode)"));

        // Set initial state from pref
        let modePref = "force";
        try { modePref = Services.prefs.getStringPref("extensions.clipboard-pdf-importer.mode", "force"); } catch {}
        if (modePref === "respect-clipboard" || modePref === "respect") {
          mode2.setAttribute("checked", "true");
        } else {
          mode1.setAttribute("checked", "true");
        }

        mode1.addEventListener("command", () => {
          try { Services.prefs.setStringPref("extensions.clipboard-pdf-importer.mode", "force"); } catch {}
          mode1.setAttribute("checked", "true");
          mode2.removeAttribute("checked");
        });
        mode2.addEventListener("command", () => {
          try { Services.prefs.setStringPref("extensions.clipboard-pdf-importer.mode", "respect-clipboard"); } catch {}
          mode2.setAttribute("checked", "true");
          mode1.removeAttribute("checked");
        });

        clipPopup.appendChild(mode1);
        clipPopup.appendChild(mode2);
        clipMenu.appendChild(clipPopup);
        popup.appendChild(clipMenu);

        // Plugin Settings submenu
        const settingsMenu = doc.createXULElement('menu');
        settingsMenu.id = 'tu-plugin-settings-menu';
        settingsMenu.setAttribute('label', this.localize('تنظیمات پلاگین', 'Plugin Settings'));

        const settingsPopup = doc.createXULElement('menupopup');

        const updateFromFileItem = doc.createXULElement('menuitem');
        updateFromFileItem.id = 'tu-plugin-update-from-file';
        updateFromFileItem.setAttribute('label', this.localize('آپدیت پلاگین با فایل', 'Update Plugin from File'));
        updateFromFileItem.addEventListener('command', () => this.updatePluginFromFile(window));

        const removePluginItem = doc.createXULElement('menuitem');
        removePluginItem.id = 'tu-plugin-remove-self';
        removePluginItem.setAttribute('label', this.localize('حذف پلاگین', 'Remove Plugin'));
        removePluginItem.addEventListener('command', () => this.uninstallThisPlugin(window));

        settingsPopup.appendChild(updateFromFileItem);
        settingsPopup.appendChild(removePluginItem);
        settingsMenu.appendChild(settingsPopup);
        popup.appendChild(settingsMenu);

        // Separator before help item
        const sep = doc.createXULElement("menuseparator");
        popup.appendChild(sep);

        // Help/Training entry opens Preferences with plugin panes
        const helpItem = doc.createXULElement("menuitem");
        helpItem.id = "tu-plugin-menu-help";
        helpItem.setAttribute("label", this.localize("راهنما و آموزش...", "Help & Training..."));
        helpItem.addEventListener("command", () => this.openHelpPreferences());
        popup.appendChild(helpItem);

        menu.appendChild(popup);
        menubar.appendChild(menu);

        this.storeAddedElement(menu);
        this.storeAddedElement(newWinItem);
        this.storeAddedElement(zoomMenu);
        this.storeAddedElement(zoomInItem);
        this.storeAddedElement(zoomOutItem);
        this.storeAddedElement(zoomResetItem);
        this.storeAddedElement(clipMenu);
        this.storeAddedElement(mode1);
        this.storeAddedElement(mode2);
        this.storeAddedElement(settingsMenu);
        this.storeAddedElement(updateFromFileItem);
        this.storeAddedElement(removePluginItem);
        this.storeAddedElement(sep);
        this.storeAddedElement(helpItem);
      } catch (e) {
        try { this.log("Error in addTopPluginMenu (override): " + e); } catch {}
      }
    };
  } catch (e) {
    try { Zotero.debug("TranslatorUpdator override init error: " + e); } catch {}
  }
})(); 

