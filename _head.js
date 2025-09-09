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
      const pane1 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-addtab',
        label: '?????? ??',
        src: 'prefs/help_addtab.xhtml'
      });
      const pane2 = await Zotero.PreferencePanes.register({
        pluginID: this.id,
        id: 'tu-prefpane-help-clipboard',
        label: '?????? ???? ?? ?????? ?? ???? ??????',
        src: 'prefs/help_clipboard.xhtml'
      });
      this.helpPaneIDs = [pane1, pane2];
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

