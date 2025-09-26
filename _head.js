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
        label: (Zotero.locale || '').startsWith('fa') ? 'راهنمای مترجم‌ها' : 'Translator Guide',
        src: 'prefs/help_translators.xhtml'
      });
      const pane1 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-addtab',
        label: (Zotero.locale || '').startsWith('fa') ? 'افزودن تب' : 'Add Extra Tabs',
        src: 'prefs/help_addtab.xhtml'
      });
      const pane2 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-clipboard',
        label: (Zotero.locale || '').startsWith('fa') ? 'انتقال فایل از ویندوز با کلید میانبر' : 'Clipboard Import Shortcuts',
        src: 'prefs/help_clipboard.xhtml'
      });
      const pane3 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-collections-highlight',
        label: (Zotero.locale || '').startsWith('fa') ? 'نمایش پوشهٔ مرتبط در درخت' : 'Highlight Collection in Tree',
        src: 'prefs/help_collections_highlight.xhtml'
      });
      const pane4 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-zoom',
        label: (Zotero.locale || '').startsWith('fa') ? 'بزرگ‌نمایی رابط کاربری' : 'UI Zoom Controls',
        src: 'prefs/help_zoom.xhtml'
      });
      const pane5 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-plugin-settings',
        label: (Zotero.locale || '').startsWith('fa') ? 'تنظیمات و پشتیبانی افزونه' : 'Plugin Settings & Support',
        src: 'prefs/help_plugin_settings.xhtml'
      });
      const pane6 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-context-actions',
        label: (Zotero.locale || '').startsWith('fa') ? 'میانبرهای راست‌کلیک' : 'Context Menu Actions',
        src: 'prefs/help_context_actions.xhtml'
      });
      const pane7 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-encryption',
        label: (Zotero.locale || '').startsWith('fa') ? 'راهنمای رمزگذاری فایل' : 'Attachment Encryption Guide',
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

