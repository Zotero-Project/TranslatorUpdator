var TranslatorUpdator;
var ClipboardPDFImporter;

function log(msg) {
  Zotero.debug("TranslatorUpdator : " + msg);
}

function install() {
  log("Installed TranslatorUpdator 2.0");
}

async function startup({ id, version, rootURI }) {
  log(
    "Starting TranslatorUpdator 2.0 with id: " +
      id +
      ", version: " +
      version +
      ", rootURI: " +
      rootURI
  );
  try {
    Services.scriptloader.loadSubScript(rootURI + "translator_updator.js");
    log("translator_updator.js loaded successfully");
    TranslatorUpdator.init({ id, version, rootURI });
    log("TranslatorUpdator initialized");
    TranslatorUpdator.addToAllWindows();
    log("addToAllWindows called");

    // Load and initialize Clipboard PDF Importer (merged)
    try {
      Services.scriptloader.loadSubScript(rootURI + "clipboard_pdf_importer.js");
      log("clipboard_pdf_importer.js loaded successfully");
      if (typeof ClipboardPDFImporter !== "undefined") {
        // Use plugin root for resources
        ClipboardPDFImporter.init({ id: id + ":cutpaste", version, rootURI });
        ClipboardPDFImporter.addToAllWindows();
        log("ClipboardPDFImporter initialized and injected into all windows");
      } else {
        log("ClipboardPDFImporter is undefined after load");
      }
    } catch (e2) {
      log("Error loading cutPaste integration: " + e2);
    }
  } catch (e) {
    log("Error in startup: " + e);
    throw e;
  }

  // Load ScrollbarColorizer module (separate from other features)
  try {
    Services.scriptloader.loadSubScript(rootURI + "scrollbar_colorizer.js");
    if (typeof ScrollbarColorizer !== "undefined") {
      ScrollbarColorizer.init({ id: id + ":scrollbars", rootURI });
      ScrollbarColorizer.addToAllWindows();
      log("ScrollbarColorizer initialized");
    } else {
      log("ScrollbarColorizer is undefined after load");
    }
  } catch (e) {
    log("Error loading scrollbar_colorizer: " + e);
  }

  // Load LightThemeTweaks for clearer boundaries in light theme
  try {
    Services.scriptloader.loadSubScript(rootURI + "light_theme_tweaks.js");
    if (typeof LightThemeTweaks !== "undefined") {
      LightThemeTweaks.init({ id: id + ":light-tweaks", rootURI });
      LightThemeTweaks.addToAllWindows();
      log("LightThemeTweaks initialized");
    } else {
      log("LightThemeTweaks is undefined after load");
    }
  } catch (e) {
    log("Error loading light_theme_tweaks: " + e);
  }

  // Enable Libraries & Collections pane for all item types
  try {
    Services.scriptloader.loadSubScript(rootURI + "libraries_collections_alltypes.js");
    if (typeof LibrariesCollectionsAllTypes !== "undefined") {
      LibrariesCollectionsAllTypes.init({ id: id + ":lc-alltypes", rootURI });
      LibrariesCollectionsAllTypes.addToAllWindows();
      log("LibrariesCollectionsAllTypes initialized");
    } else {
      log("LibrariesCollectionsAllTypes is undefined after load");
    }
  } catch (e) {
    log("Error loading libraries_collections_alltypes: " + e);
  }

  // Windows: register "Open with Zotero" for PDFs and handle incoming opens
  try {
    Services.scriptloader.loadSubScript(rootURI + "open_with_windows.js");
    if (typeof ZoteroOpenWithPDF !== "undefined") {
      ZoteroOpenWithPDF.init({ id: id + ":open-with", rootURI });
      log("ZoteroOpenWithPDF initialized");
    } else {
      log("ZoteroOpenWithPDF is undefined after load");
    }
  } catch (e) {
    log("Error loading open_with_windows: " + e);
  }

  // Attachment Locker (password gate on files)
  try {
    Services.scriptloader.loadSubScript(rootURI + "attachment_locker.js");
    if (typeof AttachmentLocker !== "undefined") {
      AttachmentLocker.init({ id: id + ":locker", rootURI });
      AttachmentLocker.addToAllWindows();
      log("AttachmentLocker initialized");
    } else {
      log("AttachmentLocker is undefined after load");
    }
  } catch (e) {
    log("Error loading attachment_locker: " + e);
  }
}

function onMainWindowLoad({ window }) {
  log("Main window loaded, adding menu item");
  TranslatorUpdator.addToWindow(window);
  try { if (typeof ClipboardPDFImporter !== "undefined") ClipboardPDFImporter.addToWindow(window); } catch {}
  try { if (typeof ScrollbarColorizer !== "undefined") ScrollbarColorizer.addToWindow(window); } catch {}
  try { if (typeof LightThemeTweaks !== "undefined") LightThemeTweaks.addToWindow(window); } catch {}
  try { if (typeof LibrariesCollectionsAllTypes !== "undefined") LibrariesCollectionsAllTypes.addToWindow(window); } catch {}
  try { if (typeof ZoteroOpenWithPDF !== "undefined") ZoteroOpenWithPDF.addToWindow(window); } catch {}
  try { if (typeof AttachmentLocker !== "undefined") AttachmentLocker.addToWindow(window); } catch {}
}

function onMainWindowUnload({ window }) {
  log("Main window unloaded, removing menu item");
  TranslatorUpdator.removeFromWindow(window);
  try { if (typeof ClipboardPDFImporter !== "undefined") ClipboardPDFImporter.removeFromWindow(window); } catch {}
  try { if (typeof ScrollbarColorizer !== "undefined") ScrollbarColorizer.removeFromWindow(window); } catch {}
  try { if (typeof LightThemeTweaks !== "undefined") LightThemeTweaks.removeFromWindow(window); } catch {}
  try { if (typeof LibrariesCollectionsAllTypes !== "undefined") LibrariesCollectionsAllTypes.removeFromWindow(window); } catch {}
  try { if (typeof ZoteroOpenWithPDF !== "undefined") ZoteroOpenWithPDF.removeFromWindow(window); } catch {}
  try { if (typeof AttachmentLocker !== "undefined") AttachmentLocker.removeFromWindow(window); } catch {}
}

function shutdown() {
  log("Shutting down 2.0");
  TranslatorUpdator.removeFromAllWindows();
  try { if (typeof ClipboardPDFImporter !== "undefined") ClipboardPDFImporter.removeFromAllWindows(); } catch {}
  try { if (typeof ScrollbarColorizer !== "undefined") ScrollbarColorizer.removeFromAllWindows(); } catch {}
  try { if (typeof LightThemeTweaks !== "undefined") LightThemeTweaks.removeFromAllWindows(); } catch {}
  try { if (typeof LibrariesCollectionsAllTypes !== "undefined") LibrariesCollectionsAllTypes.removeFromAllWindows(); } catch {}
  try { if (typeof AttachmentLocker !== "undefined") AttachmentLocker.removeFromAllWindows(); } catch {}
  TranslatorUpdator = undefined;
  ClipboardPDFImporter = undefined;
  try { ScrollbarColorizer = undefined; } catch {}
  try { LightThemeTweaks = undefined; } catch {}
  try { LibrariesCollectionsAllTypes = undefined; } catch {}
  try { AttachmentLocker = undefined; } catch {}
}

function uninstall() {
  log("Uninstalled 2.0");
}
