var TranslatorUpdator;
var ClipboardPDFImporter;

function log(msg) {
  Zotero.debug("TranslatorUpdator : " + msg);	
  Zotero.debug("Clipboard PDF Importer: " + msg);

}

function install() {
  log("Installed TranslatorUpdator 2.0");
}

async function startup({ id, version, rootURI }) {

    log("Starting TranslatorUpdator 2.0");
    try {

        Zotero.PreferencePanes.register({
            pluginID: 'clipboard-pdf-importer@example.com',
            src: rootURI + 'preferences.xhtml',
            scripts: [rootURI + 'prefs.js']
	    });


        Services.scriptloader.loadSubScript(rootURI + 'main.js', this);
        Services.scriptloader.loadSubScript(rootURI + "translator_updator.js");

        if (typeof ClipboardPDFImporter === "undefined") {
            log("ERROR: ClipboardPDFImporter object not found after loading main.js");
            return;
        }       

        ClipboardPDFImporter.addToAllWindows();
        ClipboardPDFImporter.init({ id, version, rootURI });
        ClipboardPDFImporter.addToAllWindows();
        await ClipboardPDFImporter.main();

        TranslatorUpdator.init({ id, version, rootURI });
        TranslatorUpdator.addToAllWindows();
  } catch (e) {
        log("Error in startup: " + e);
    throw e;
  }
}

function onMainWindowLoad({ window }) {
    log("Main window loaded, adding menu item");
    TranslatorUpdator.addToWindow(window);
    ClipboardPDFImporter.addToWindow(window);
}

function onMainWindowUnload({ window }) {
    log("Main window unloaded, removing menu item");
    TranslatorUpdator.removeFromWindow(window);
  	ClipboardPDFImporter.removeFromWindow(window);

}

function shutdown() {
  log("Shutting down 2.0");
    TranslatorUpdator.removeFromAllWindows();
    TranslatorUpdator = undefined;
    ClipboardPDFImporter.removeFromAllWindows();
	ClipboardPDFImporter = undefined;
}


function uninstall() {
  log("Uninstalled 2.0");
}
