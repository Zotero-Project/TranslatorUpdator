/**
 * clipboard_pdf_importer.js - Integrated Clipboard PDF Importer for Zotero
 * This module merges the cutPaste plugin into the main plugin bundle.
 */

var ClipboardPDFImporter;

ClipboardPDFImporter = {
  id: null,
  version: null,
  rootURI: null,
  initialized: false,
  addedElementIDs: [],

  // Optional settings dialog (not wired by default)
  openPluginSettings(window) {
    try {
      const url = this.rootURI + "preferences.xhtml";
      window.openDialog(url, "clipboard-pdf-importer-preferences", "chrome,centerscreen,resizable");
      this.log("Preferences dialog opened");
    } catch (e) {
      this.log("Error opening preferences: " + e);
    }
  },

  init({ id, version, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.initialized = true;

    // Attach keyboard listeners to currently open windows
    var windows = Zotero.getMainWindows();
    for (let win of windows) {
      this.addKeyboardListener(win);
    }
    this.log("Clipboard importer initialized");
  },

  log(msg) {
    Zotero.debug("Clipboard PDF Importer: " + msg);
  },

  addKeyboardListener(window) {
    try {
      window.addEventListener("keydown", (event) => {
        const mode = this.getMode();
        // Ctrl+V: paste behavior depends on mode
        if (event.ctrlKey && (event.key === "v") && !event.repeat) {
          if (!window.ZoteroPane) return;
          if (mode === "respect-clipboard") {
            // Determine move/copy from clipboard contents
            this.importPDFFromClipboard(window, null);
          } else {
            // Default: always move (special mode)
            this.importPDFFromClipboard(window, true);
          }
          event.preventDefault();
        }
        // Ctrl+D -> copy PDF from clipboard
        if (event.ctrlKey && (event.key === "d") && !event.repeat) {
          if (!window.ZoteroPane) return;
          this.importPDFFromClipboard(window, false);
          event.preventDefault();
        }
        // Ctrl+B -> restore to original path if known; fallback to Desktop
        if (event.ctrlKey && (event.key === "b") && !event.repeat) {
          if (!window.ZoteroPane) return;
          this.restoreOriginalOrDesktop(window);
          event.preventDefault();
        }
      });
      this.log("Keyboard listener added to window");
    } catch (e) {
      this.log(`Error adding keyboard listener: ${e}`);
    }
  },

  getMode() {
    try {
      return Services.prefs.getStringPref("extensions.clipboard-pdf-importer.mode", "force");
    } catch (e) {
      return "force";
    }
  },

  addToWindow(window) {
    let doc = window.document;

    // Load localization FTL from plugin root
    try {
      window.MozXULElement.insertFTLIfNeeded(this.rootURI + "clipboard-pdf-importer.ftl");
    } catch (e) {
      this.log(`Error loading localization file: ${e}`);
    }

    const addMenuItems = async () => {
      if (!window.ZoteroPane) return false;

      // Avoid duplicates
      if (
        doc.getElementById("clipboard-pdf-copy") ||
        doc.getElementById("clipboard-pdf-move") ||
        doc.getElementById("clipboard-pdf-move-to-desktop")
      ) {
        return true;
      }

      // Discover File menu popup candidates
      const ids = [
        "menu_FilePopup",
        "zotero-menu-file-popup",
        "menu_File",
        "zotero-file-menu",
        "file-menu",
      ];
      let targetMenu = null;
      for (let id of ids) {
        const el = doc.getElementById(id);
        if (!el) continue;
        targetMenu = el.tagName === "menu" ? el.querySelector("menupopup") || el : el;
        if (targetMenu) break;
      }

      if (!targetMenu) {
        // Deep query fallback
        const candidates = Array.from(doc.querySelectorAll('menupopup, popup, panel'));
        for (let candidate of candidates) {
          const id = candidate.id || candidate.getAttribute('label') || 'no-id';
          const label = candidate.getAttribute('label') || '';
          const parentLabel = candidate.parentNode?.getAttribute('label') || '';
          if (
            id.toLowerCase().includes('file') ||
            label.includes('File') ||
            parentLabel.includes('File')
          ) {
            targetMenu = candidate;
            break;
          }
        }
      }

      if (!targetMenu) return false;

      // Copy
      let copyMenuItem = doc.createXULElement('menuitem');
      copyMenuItem.id = 'clipboard-pdf-copy';
      copyMenuItem.setAttribute('data-l10n-id', 'clipboard-pdf-copy');
      copyMenuItem.setAttribute('label', '(Ctrl+D) کپی فایل از کلیپ‌بورد');
      copyMenuItem.addEventListener('command', () => {
        this.importPDFFromClipboard(window, false);
      });
      targetMenu.appendChild(copyMenuItem);
      this.storeAddedElement(copyMenuItem);

      // Move
      let moveMenuItem = doc.createXULElement('menuitem');
      moveMenuItem.id = 'clipboard-pdf-move';
      moveMenuItem.setAttribute('data-l10n-id', 'clipboard-pdf-move');
      moveMenuItem.setAttribute('label', '(Ctrl+V) انتقال فایل از کلیپ‌بورد');
      moveMenuItem.addEventListener('command', () => {
        this.importPDFFromClipboard(window, true);
      });
      targetMenu.appendChild(moveMenuItem);
      this.storeAddedElement(moveMenuItem);

      // Restore original or move to desktop
      let moveToDesktopMenuItem = doc.createXULElement('menuitem');
      moveToDesktopMenuItem.id = 'clipboard-pdf-move-to-desktop';
      moveToDesktopMenuItem.setAttribute('data-l10n-id', 'clipboard-pdf-move-to-desktop');
      moveToDesktopMenuItem.setAttribute('label', '(Ctrl+B) انتقال به دسکتاپ و حذف');
      moveToDesktopMenuItem.addEventListener('command', () => {
        this.moveToDesktopAndDelete(window);
      });
      targetMenu.appendChild(moveToDesktopMenuItem);
      this.storeAddedElement(moveToDesktopMenuItem);

      return true;
    };

    const waitForMenu = async () => {
      const maxAttempts = 30;
      const delay = 500;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (await addMenuItems()) return;
        await new Promise((r) => setTimeout(r, delay));
      }
    };

    if (doc.readyState === 'complete') {
      waitForMenu();
    } else {
      window.addEventListener('load', waitForMenu, { once: true });
    }
  },

  addToAllWindows() {
    try {
      var windows = Zotero.getMainWindows();
      for (let win of windows) {
        if (!win.ZoteroPane) continue;
        this.addToWindow(win);
      }
    } catch (e) {
      this.log(`Error in addToAllWindows: ${e}`);
    }
  },

  storeAddedElement(elem) {
    if (!elem.id) return;
    this.addedElementIDs.push(elem.id);
  },

  removeFromWindow(window) {
    try {
      var doc = window.document;
      for (let id of this.addedElementIDs) {
        let elem = doc.getElementById(id);
        if (elem) elem.remove();
      }
      let ftl = doc.querySelector('[href="clipboard-pdf-importer.ftl"]');
      if (ftl) ftl.remove();
    } catch (e) {
      this.log(`Error in removeFromWindow: ${e}`);
    }
  },

  removeFromAllWindows() {
    var windows = Zotero.getMainWindows();
    for (let win of windows) {
      if (!win.ZoteroPane) continue;
      this.removeFromWindow(win);
    }
  },

  // Mapping storage to restore files to their original source path
  async ensureMapTable() {
    await Zotero.DB.queryAsync(`
      CREATE TABLE IF NOT EXISTS clipboardImportMap (
        attachmentID INTEGER PRIMARY KEY,
        originalPath TEXT,
        op TEXT
      )`);
  },

  async saveMapping(attachmentID, originalPath, op) {
    try {
      await this.ensureMapTable();
      await Zotero.DB.queryAsync(
        `INSERT OR REPLACE INTO clipboardImportMap (attachmentID, originalPath, op) VALUES (?, ?, ?)`,
        [attachmentID, originalPath, op]
      );
    } catch (e) {
      this.log('saveMapping error: ' + e);
    }
  },

  async getMapping(attachmentID) {
    await this.ensureMapTable();
    const rows = await Zotero.DB.queryAsync(
      `SELECT originalPath, op FROM clipboardImportMap WHERE attachmentID = ?`,
      [attachmentID]
    );
    if (!rows || !rows.length) return null;
    return { originalPath: rows[0].originalPath, op: rows[0].op };
  },

  // Try to detect whether clipboard operation is a CUT (move) or COPY
  // Returns true for move, false for copy, or null if unknown
  detectClipboardMove(trans) {
    try {
      const Ci = Components.interfaces;
      const flavors = [
        "application/x-moz-Preferred-DropEffect",
        "application/x-moz-Preferreddropeffect",
        "application/x-moz-preferreddropeffect",
        "application/x-moz-dropeffect",
        "Preferred DropEffect",            // Windows CFSTR_PREFERREDDROPEFFECT
        "Performed DropEffect",            // Windows CFSTR_PERFORMEDDROPEFFECT
      ];
      let dataLen = {};
      for (let f of flavors) {
        try {
          let effObj = {};
          trans.getTransferData(f, effObj, dataLen);
          if (!effObj || !effObj.value) continue;
          // Try numeric PRUint32/PRInt32
          try {
            let num = effObj.value.QueryInterface(Ci.nsISupportsPRUint32).data;
            if (typeof num === 'number') return (num & 2) === 2; // MOVE flag
          } catch (e1) {
            try {
              let num = effObj.value.QueryInterface(Ci.nsISupportsPRInt32).data;
              if (typeof num === 'number') return (num & 2) === 2;
            } catch (e2) {}
          }
          // Try string value: often 'move' or 'copy'
          try {
            let s = effObj.value.QueryInterface(Ci.nsISupportsString).data || '';
            s = String(s).toLowerCase();
            if (s.includes('move')) return true;
            if (s.includes('copy')) return false;
            if (s.includes('2')) return true; // rough fallback
            if (s.includes('1')) return false;
          } catch (e3) {}
        } catch (e) {}
      }
    } catch (e) {
      this.log('detectClipboardMove error: ' + e);
    }
    return null;
  },

  async deleteMapping(attachmentID) {
    await this.ensureMapTable();
    await Zotero.DB.queryAsync(`DELETE FROM clipboardImportMap WHERE attachmentID = ?`, [attachmentID]);
  },

  async importPDFFromClipboard(window, move) {
    try {
      if (!window || !window.ZoteroPane) return;

      const clipboard = Services.clipboard;
      let trans = Components.classes["@mozilla.org/widget/transferable;1"]
        .createInstance(Components.interfaces.nsITransferable);
      trans.init(null);

      // Try to request dropeffect flavors (for cut/copy detection) + file flavors
      const dropFlavors = [
        "application/x-moz-Preferred-DropEffect",
        "application/x-moz-Preferreddropeffect",
        "application/x-moz-preferreddropeffect",
        "application/x-moz-dropeffect",
      ];
      const fileFlavors = [
        "application/x-moz-file",
        "text/x-moz-url",
        "text/unicode",
        "text/plain",
        "application/x-moz-nativehtml",
        "application/x-moz-file-promise",
      ];
      for (let f of dropFlavors) {
        try { trans.addDataFlavor(f); } catch (e) {}
      }
      for (let f of fileFlavors) {
        try { trans.addDataFlavor(f); } catch (e) {}
      }

      clipboard.getData(trans, clipboard.kGlobalClipboard);

      let file = null;
      let dataLen = {};

      // If move is not specified and mode is respect-clipboard, attempt detection
      if (move === null) {
        try {
          // Try robust detection via multiple clipboard flavors
          let detected = this.detectClipboardMove(trans);
          if (detected === null) {
            detected = false; // fallback to copy
          }
          move = detected;
        } catch (e) {
          move = false; // fallback to copy
        }
      }

      try {
        let fileData = {};
        trans.getTransferData("application/x-moz-file", fileData, dataLen);
        file = fileData.value.QueryInterface(Components.interfaces.nsIFile);
      } catch {}

      if (!file) {
        try {
          let dropData = {};
          trans.getTransferData("application/x-moz-nativehtml", dropData, dataLen);
          let dropFiles = dropData.value.QueryInterface(Components.interfaces.nsISupports);
          let fileList = dropFiles.QueryInterface(Components.interfaces.nsIArray);
          if (fileList?.length > 0) {
            file = fileList.queryElementAt(0, Components.interfaces.nsIFile);
          }
        } catch {}
      }

      if (!file) {
        try {
          let promiseData = {};
          trans.getTransferData("application/x-moz-file-promise", promiseData, dataLen);
          let promise = promiseData.value.QueryInterface(Components.interfaces.nsISupports);
          file = promise.QueryInterface(Components.interfaces.nsIFile);
        } catch {}
      }

      if (!file) {
        try {
          let urlData = {};
          trans.getTransferData("text/x-moz-url", urlData, dataLen);
          let url = urlData.value.QueryInterface(Components.interfaces.nsISupportsString).data;
          if (url) {
            let path = url.split('\n')[0].replace(/^file:\/\//, "").replace(/\//g, "\\");
            file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
            file.initWithPath(path);
          }
        } catch {}
      }

      if (!file) {
        try {
          let textData = {};
          let text = null;
          try {
            trans.getTransferData("text/unicode", textData, dataLen);
            text = textData.value.QueryInterface(Components.interfaces.nsISupportsString).data;
          } catch (e) {
            trans.getTransferData("text/plain", textData, dataLen);
            text = textData.value.QueryInterface(Components.interfaces.nsISupportsString).data;
          }
          if (text && text.match(/\.(pdf)$/i)) {
            file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
            file.initWithPath(text.trim().replace(/^file:\/\//, "").replace(/\//g, "\\"));
          }
        } catch {}
      }

      if (file && file.exists() && file.isFile() && file.path.toLowerCase().endsWith('.pdf')) {
        let collection = window.ZoteroPane.getSelectedCollection();
        let libraryId = collection ? collection.libraryID : window.ZoteroPane.getSelectedLibraryID();

        let attachment = await Zotero.Attachments.importFromFile({
          file: file,
          libraryID: libraryId,
          collections: collection ? [collection.id] : [],
          rename: move,
        });

        // Save mapping for later restore
        await this.saveMapping(attachment.id, file.path, move ? 'move' : 'copy');

        if (move) {
          try {
            if (file.exists()) file.remove(false);
          } catch {}
          // Clear clipboard to signal Windows that the cut has been handled
          try {
            clipboard.emptyClipboard(clipboard.kGlobalClipboard);
          } catch (e) {
            this.log('Failed to clear clipboard after cut: ' + e);
          }
        }

        window.ZoteroPane.selectItem(attachment.id);
      } else {
        this.log("No valid PDF file found in clipboard");
      }
    } catch (e) {
      this.log(`Error importing PDF: ${e}`);
    }
  },

  async restoreOriginalOrDesktop(window) {
    try {
      if (!window || !window.ZoteroPane) return;

      let selectedItems = window.ZoteroPane.getSelectedItems();
      if (!selectedItems || selectedItems.length === 0) return;

      let item = selectedItems[0];
      if (!item.isAttachment() || item.attachmentContentType !== 'application/pdf') return;

      let currentPath = await item.getFilePathAsync();
      if (!currentPath) return;

      // Try to restore to original path based on mapping
      const mapping = await this.getMapping(item.id);
      if (mapping && mapping.originalPath) {
        let dest = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        dest.initWithPath(mapping.originalPath);

        // If file already exists at original location, avoid duplicate
        if (dest.exists()) {
          // For both copy and move ops, if a file is already there, just remove from Zotero
          await item.eraseTx();
          await this.deleteMapping(item.id);
          return;
        }

        // Determine behavior based on how the item was imported
        const wasMove = (mapping.op === 'move');

        if (wasMove) {
          // Ensure parent dir exists
          let parent = dest.parent;
          if (parent && !parent.exists()) {
            try { parent.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o755); } catch (e) {}
          }

          // Copy back to original path
          let src = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
          src.initWithPath(currentPath);
          if (src.exists()) src.copyTo(parent, dest.leafName);

          await item.eraseTx();
          await this.deleteMapping(item.id);
          return;
        } else {
          // It was originally a copy; don't duplicate by copying back unless the source was removed.
          // Since dest doesn't exist here, it's safe to restore to original location.
          let parent = dest.parent;
          if (parent && !parent.exists()) {
            try { parent.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o755); } catch (e) {}
          }
          let src = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
          src.initWithPath(currentPath);
          if (src.exists()) src.copyTo(parent, dest.leafName);
          await item.eraseTx();
          await this.deleteMapping(item.id);
          return;
        }
      }

      // Fallback: move to Desktop
      let src = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
      src.initWithPath(currentPath);
      if (!src.exists()) return;
      let desktopDir = Services.dirsvc.get("Desk", Components.interfaces.nsIFile);
      if (!desktopDir.exists()) return;
      let destFile = desktopDir.clone();
      destFile.append(src.leafName);
      let counter = 1;
      let baseName = src.leafName.replace(/\.pdf$/i, '');
      while (destFile.exists()) {
        destFile = desktopDir.clone();
        destFile.append(`${baseName} (${counter}).pdf`);
        counter++;
      }
      src.copyTo(desktopDir, destFile.leafName);
      await item.eraseTx();
    } catch (e) {
      this.log(`Error restoring or moving file: ${e}`);
    }
  },

  // Backward compatibility for any callers still using the old name
  async moveToDesktopAndDelete(window) {
    return this.restoreOriginalOrDesktop(window);
  },

  async main() {
    this.log("Plugin main function called");
  },
};
