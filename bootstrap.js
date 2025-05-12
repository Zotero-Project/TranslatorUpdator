var TranslatorUpdator;

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
  } catch (e) {
    log("Error in startup: " + e);
    throw e;
  }
}

function onMainWindowLoad({ window }) {
  log("Main window loaded, adding menu item");
  TranslatorUpdator.addToWindow(window);
}

function onMainWindowUnload({ window }) {
  log("Main window unloaded, removing menu item");
  TranslatorUpdator.removeFromWindow(window);
}

function shutdown() {
  log("Shutting down 2.0");
  TranslatorUpdator.removeFromAllWindows();
  TranslatorUpdator = undefined;
}

function uninstall() {
  log("Uninstalled 2.0");
}
