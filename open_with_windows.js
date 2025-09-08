var ZoteroOpenWithPDF;

ZoteroOpenWithPDF = {
  id: null,
  rootURI: null,
  initialized: false,

  init({ id, rootURI }) {
    if (this.initialized) return;
    this.id = id;
    this.rootURI = rootURI;
    this.initialized = true;
    try { if (Zotero.isWin) { this._registerProtocolHook(); this._ensureWindowsOpenWith(); } } catch (e) { this.log('init error: ' + e); }
  },

  log(msg) { try { Zotero.debug('OpenWithPDF: ' + msg); } catch {} },

  async _openFromFilePath(fileParam, winHint) {
    try {
      if (!fileParam) return;
      try { fileParam = decodeURIComponent(fileParam); } catch {}
      // Trim wrapping quotes
      if ((fileParam.startsWith('"') && fileParam.endsWith('"')) || (fileParam.startsWith("'") && fileParam.endsWith("'"))) {
        fileParam = fileParam.slice(1, -1);
      }
      // file:// -> path
      if (/^file:\/\//i.test(fileParam)) {
        try { fileParam = OS.Path.fromFileURI(fileParam); } catch {}
      }
      // Normalize slashes on Windows
      if (Zotero.isWin) {
        fileParam = fileParam.replace(/\//g, '\\');
      }

      // Ensure exists
      try {
        if (!await IOUtils.exists(fileParam)) {
          this.log('File does not exist: ' + fileParam);
          return;
        }
      } catch {}

      const absPath = OS.Path.normalize(fileParam);

      // Try to find an existing attachment pointing at this path
      let candidates = [absPath];
      // Also try forward-slash variant (some entries may store with slashes)
      try { candidates.push(absPath.replace(/\\/g, '/')); } catch {}
      // If inside Zotero storage, add a 'storage:' candidate (stored attachments)
      try {
        let storageRoot = Zotero.DataDirectory.getSubdirectory && Zotero.DataDirectory.getSubdirectory('storage', true);
        if (storageRoot) {
          let inStorage = Zotero.File.directoryContains(storageRoot, absPath);
          if (inStorage) {
            let fname = PathUtils.filename(absPath);
            candidates.push('storage:' + fname);
          }
        }
      } catch {}
      try {
        let base = Zotero.Prefs.get('baseAttachmentPath');
        if (base) {
          let nBase = OS.Path.normalize(base);
          let p = absPath;
          // Case-insensitive on Windows
          let starts = Zotero.isWin
            ? p.toLowerCase().startsWith(nBase.toLowerCase())
            : p.startsWith(nBase);
          if (starts) {
            let rel = p.substring(nBase.length);
            if (rel && (rel.startsWith('\\') || rel.startsWith('/'))) rel = rel.substring(1);
            let relMarked = Zotero.Attachments.BASE_PATH_PLACEHOLDER + rel;
            // Fix slashes per platform
            relMarked = Zotero.Attachments.fixPathSlashes(relMarked);
            candidates.push(relMarked);
          }
        }
      } catch {}

      let itemID = null;
      try {
        // Query DB for matching attachment
        let placeholders = new Array(candidates.length).fill('?').join(',');
        let sql = "SELECT itemID FROM itemAttachments WHERE path IN (" + placeholders + ") LIMIT 1";
        itemID = await Zotero.DB.valueQueryAsync(sql, candidates);
      } catch (e) { this.log('DB lookup error: ' + e); }

      let zp = winHint?.ZoteroPane || Zotero.getActiveZoteroPane() || Zotero.getMainWindow()?.ZoteroPane;

      if (itemID) {
        try {
          let item = await Zotero.Items.getAsync(itemID);
          // First, show item in library (open containing collection/library)
          try { zp?.loadURI(`zotero://select/library/items/${item.key}`); } catch {}
          try { await Zotero.Promise.delay(100); } catch {}
          // Then open in reader
          let openInWindow = Zotero.Prefs.get('openReaderInNewWindow');
          await Zotero.Reader.open(itemID, null, { openInWindow, allowDuplicate: openInWindow });
        } catch (e) { this.log('Reader open error: ' + e); }
        return;
      }

      // Otherwise create a linked attachment in user library and open it
      let item;
      try {
        item = await Zotero.Attachments.linkFromFile({ file: absPath, libraryID: Zotero.Libraries.userLibraryID });
      } catch (e) { this.log('linkFromFile error: ' + e); }
      if (item) {
        try { zp?.loadURI(`zotero://select/library/items/${item.key}`); } catch {}
        try { await Zotero.Promise.delay(100); } catch {}
        try {
          let openInWindow = Zotero.Prefs.get('openReaderInNewWindow');
          await Zotero.Reader.open(item.id, null, { openInWindow, allowDuplicate: openInWindow });
        } catch (e) { this.log('Reader open error: ' + e); }
      }
    } catch (e) { this.log('_openFromFilePath fatal: ' + e); }
  },

  _registerProtocolHook() {
    try {
      const tryOnce = () => {
        try {
          const handler = Components.classes['@mozilla.org/network/protocol;1?name=zotero']
            .getService().wrappedJSObject;
          if (!handler || !handler._extensions) { throw new Error('handler not ready'); }
          if (handler._extensions['zotero://tu-open-file']) return true;

          const OpenFileExtension = {
        noContent: true,
        doAction: async (uri) => {
          try {
            // Accept zotero://tu-open-file/?file=...
            let query = uri.query || '';
            let params = new URLSearchParams(query);
            let fileParam = params.get('file') || '';
            if (!fileParam) {
              Zotero.warn('tu-open-file: missing file parameter');
              return;
            }
            await ZoteroOpenWithPDF._openFromFilePath(fileParam);
          } catch (e) { Zotero.logError(e); }
        },
        newChannel: function (uri) { this.doAction(uri); },
          };

          handler._extensions['zotero://tu-open-file'] = OpenFileExtension;
          this.log('Registered zotero://tu-open-file handler');
          return true;
        } catch (e) {
          return false;
        }
      };

      // Try now, else retry a few times
      let ok = tryOnce();
      if (!ok) {
        let attempts = 0;
        let timer = () => {
          attempts++;
          if (tryOnce() || attempts > 20) return;
          // Retry after 200ms
          Services.tm.dispatchToMainThread(timer);
        };
        Services.tm.dispatchToMainThread(timer);
      }
    } catch (e) { this.log('_registerProtocolHook error: ' + e); }
  },

  _ensureWindowsOpenWith() {
    try {
      // Write HKCU\Software\Classes\Applications\Zotero.exe entries for Open With
      const wrk = Components.classes['@mozilla.org/windows-registry-key;1']
        .createInstance(Components.interfaces.nsIWindowsRegKey);
      // Get path to current executable
      const exeFile = Services.dirsvc.get('XREExeF', Components.interfaces.nsIFile);
      const exePath = exeFile.path;

      // Applications\Zotero.exe
      const basePath = 'Software\\Classes\\Applications\\Zotero.exe';
      // Create (or open) base key
      wrk.create(wrk.ROOT_KEY_CURRENT_USER, basePath, wrk.ACCESS_ALL);

      // FriendlyAppName
      wrk.open(wrk.ROOT_KEY_CURRENT_USER, basePath, wrk.ACCESS_WRITE);
      try { wrk.writeStringValue('FriendlyAppName', 'Zotero'); } catch {}
      wrk.close();

      // SupportedTypes\.pdf
      const suppTypes = basePath + '\\SupportedTypes';
      wrk.create(wrk.ROOT_KEY_CURRENT_USER, suppTypes, wrk.ACCESS_ALL);
      wrk.open(wrk.ROOT_KEY_CURRENT_USER, suppTypes, wrk.ACCESS_WRITE);
      try { wrk.writeStringValue('.pdf', ''); } catch {}
      wrk.close();

      // shell\open\command -> "<exe>" -url "zotero://tu-open-file/?file=%1"
      const cmdPath = basePath + '\\shell\\open\\command';
      wrk.create(wrk.ROOT_KEY_CURRENT_USER, cmdPath, wrk.ACCESS_ALL);
      wrk.open(wrk.ROOT_KEY_CURRENT_USER, cmdPath, wrk.ACCESS_WRITE);
      const cmd = '"' + exePath + '" -url "zotero://tu-open-file/?file=%1"';
      try { wrk.writeStringValue('', cmd); } catch {}
      wrk.close();

      // Also add to .pdf OpenWithList
      const owlPath = 'Software\\Classes\\.pdf\\OpenWithList';
      wrk.create(wrk.ROOT_KEY_CURRENT_USER, owlPath, wrk.ACCESS_ALL);
      // Create subkey 'Zotero.exe'
      wrk.create(wrk.ROOT_KEY_CURRENT_USER, owlPath + '\\Zotero.exe', wrk.ACCESS_ALL);
      wrk.close();
      this.log('Registered Windows Open With for PDF');
    } catch (e) { this.log('_ensureWindowsOpenWith error: ' + e); }
  },

  addToWindow(window) {
    try {
      // Intercept early calls to loadURI for our custom scheme
      const zp = window.ZoteroPane;
      if (!zp || zp.__tu_open_with_patched) return;
      const origLoadURI = zp.loadURI.bind(zp);
      zp.loadURI = function (uris, event) {
        try {
          let list = Array.isArray(uris) ? uris : [uris];
          if (list.length) {
            let uri = list[0];
            if (typeof uri === 'string' && uri.startsWith('zotero://tu-open-file')) {
              try {
                let nsIURI = Services.io.newURI(uri, null, null);
                let q = nsIURI.query || '';
                let p = new URLSearchParams(q);
                let fileParam = p.get('file') || '';
                ZoteroOpenWithPDF._openFromFilePath(fileParam, window);
                return; // Do not fall-through
              } catch (e) { ZoteroOpenWithPDF.log('loadURI intercept error: ' + e); }
            }
          }
        } catch {}
        return origLoadURI(uris, event);
      };
      zp.__tu_open_with_patched = true;
    } catch (e) { this.log('addToWindow patch error: ' + e); }
  },
  removeFromWindow(window) {},
  addToAllWindows() {},
  removeFromAllWindows() {},
};
