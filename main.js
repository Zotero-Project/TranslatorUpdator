/**
 * main.js - Main implementation for the Clipboard PDF Importer plugin
 */

ClipboardPDFImporter = {
    id: null,
    version: null,
    rootURI: null,
    initialized: false,
    addedElementIDs: [],

    /**
     * Initialize the plugin
     */
    init({ id, version, rootURI }) {
        if (this.initialized) return;
        this.id = id;
        this.version = version;
        this.rootURI = rootURI;
        this.initialized = true;

        // Add keyboard listener to all windows
        var windows = Zotero.getMainWindows();
        for (let win of windows) {
            this.addKeyboardListener(win);
        }
        this.log("Plugin initialized, keyboard listeners added");
    },

    /**
     * Log messages to Zotero's debug console
     */
    log(msg) {
        Zotero.debug("Clipboard PDF Importer: " + msg);
    },

    /**
     * Add keyboard listener for Ctrl+V, Ctrl+D, and Ctrl+B
     */
    addKeyboardListener(window) {
        try {
            window.addEventListener('keydown', (event) => {
                // Ctrl+V or Ctrl+ر for moving PDF from clipboard
                if (event.ctrlKey && (event.key === 'v' || event.key === 'ر') && !event.repeat) { // NEW: Added !event.repeat
                    if (!window.ZoteroPane) {
                        this.log("Ctrl+V/ر ignored: ZoteroPane not defined in this window");
                        return;
                    }
                    this.log("Ctrl+V/ر detected");
                    this.importPDFFromClipboard(window, true); // true = move
                    event.preventDefault();
                }
                // Ctrl+D or Ctrl+ی for copying PDF from clipboard
                if (event.ctrlKey && (event.key === 'd' || event.key === 'ی') && !event.repeat) { // NEW: Added !event.repeat
                    if (!window.ZoteroPane) {
                        this.log("Ctrl+D/ی ignored: ZoteroPane not defined in this window");
                        return;
                    }
                    this.log("Ctrl+D/ی detected");
                    this.importPDFFromClipboard(window, false); // false = copy
                    event.preventDefault();
                }
                // NEW: Ctrl+B or Ctrl+ذ for moving to desktop and deleting
                if (event.ctrlKey && (event.key === 'b' || event.key === 'ذ') && !event.repeat) {
                    if (!window.ZoteroPane) {
                        this.log("Ctrl+B/ذ ignored: ZoteroPane not defined in this window");
                        return;
                    }
                    this.log("Ctrl+B/ذ detected");
                    this.moveToDesktopAndDelete(window);
                    event.preventDefault();
                }
            });
            this.log("Keyboard listener added to window");
        } catch (e) {
            this.log(`Error adding keyboard listener: ${e}`);
        }
    },

    /**
     * Add UI elements to a Zotero window
     */
    addToWindow(window) {
        let doc = window.document;

        // Load localization file
        try {
            window.MozXULElement.insertFTLIfNeeded("clipboard-pdf-importer.ftl");
            this.log("Localization file loaded successfully");
        } catch (e) {
            this.log(`Error loading localization file: ${e}`);
        }

        // Function to add menu items
        const addMenuItems = async () => {
            if (!window.ZoteroPane) {
                this.log("Error: ZoteroPane not defined in this window");
                return false;
            }

            // Check for existing menu items to avoid duplicates
            if (doc.getElementById('clipboard-pdf-copy') || doc.getElementById('clipboard-pdf-move') || doc.getElementById('clipboard-pdf-move-to-desktop')) {
                this.log("Warning: Menu items already exist, skipping addition");
                return true;
            }

            // Log all potential popup elements
            const popupTypes = ['menupopup', 'popup', 'panel'];
            let allPopups = [];
            popupTypes.forEach(type => {
                allPopups.push(...doc.querySelectorAll(type));
            });
            this.log(`Found ${allPopups.length} popup elements (${popupTypes.join(", ")}): ${Array.from(allPopups).map(p => `${p.tagName}#${p.id || p.getAttribute('label') || 'no-id'}`).join(", ")}`);

            // Try different menu IDs
            const menuIDs = [
                'menu_filePopup',
                'zotero-menu-file-popup',
                'menu_File',
                'zotero-file-menu',
                'file-menu',
                'zotero-menu-file',
                'zotero-file-menupopup',
                'menupopup-file',
                'main-menupopup',
                'zotero-main-file-popup',
                'zotero-main-menupopup'
            ];
            let targetMenu = null;
            for (let id of menuIDs) {
                targetMenu = doc.getElementById(id);
                if (targetMenu) {
                    this.log(`Found menu with ID: ${id}`);
                    break;
                }
            }

            // Fallback: Deep DOM search
            if (!targetMenu) {
                const candidates = doc.querySelectorAll('menupopup[id*="file"], menupopup[label*="File"], menupopup[label*="پرونده"], popup[id*="file"], popup[label*="File"], popup[label*="پرونده"], menu[label*="File"] > menupopup, menu[label*="پرونده"] > menupopup, menu[label*="File"] > popup, menu[label*="پرونده"] > popup');
                for (let candidate of candidates) {
                    const id = candidate.id || candidate.getAttribute('label') || 'no-id';
                    const label = candidate.getAttribute('label') || '';
                     const parentLabel = candidate.parentNode?.getAttribute('label') || '';
                    if (id.toLowerCase().includes('file') || label.includes('File') || label.includes('پرونده') || parentLabel.includes('File') || parentLabel.includes('پرونده')) {
                        targetMenu = candidate;
                        this.log(`Found menu via deep DOM query: ${candidate.tagName}#${id} [label=${label}]`);
                        break;
                    }
                }
            }

            if (!targetMenu) {
                const errorMsg = `Error: Could not find File/پرونده menu. Found ${allPopups.length} popups: ${Array.from(allPopups).map(p => `${p.tagName}#${p.id || 'no-id'} [label=${p.getAttribute('label') || 'no-label'}]`).join(", ")}`;
                this.log(errorMsg);
                return false;
            }

            // Add menu items with fallback labels
            let copyMenuItem = doc.createXULElement('menuitem');
            copyMenuItem.id = 'clipboard-pdf-copy';
            copyMenuItem.setAttribute('data-l10n-id', 'clipboard-pdf-copy');
            copyMenuItem.setAttribute('label', '(ctrl+D)کپی فایل از کلیپ‌بورد'); // Improved fallback
            copyMenuItem.addEventListener('command', () => {
                this.importPDFFromClipboard(window, false);
            });
            targetMenu.appendChild(copyMenuItem);
            this.storeAddedElement(copyMenuItem);

            let moveMenuItem = doc.createXULElement('menuitem');
            moveMenuItem.id = 'clipboard-pdf-move';
            moveMenuItem.setAttribute('data-l10n-id', 'clipboard-pdf-move');
            moveMenuItem.setAttribute('label', '(ctrl+V) برش فایل از کیپ‌بورد '); // Improved fallback
            moveMenuItem.addEventListener('command', () => {
                this.importPDFFromClipboard(window, true);
            });
            targetMenu.appendChild(moveMenuItem);
            this.storeAddedElement(moveMenuItem);

            // Add menu item for moving to desktop and deleting
            let moveToDesktopMenuItem = doc.createXULElement('menuitem');
            moveToDesktopMenuItem.id = 'clipboard-pdf-move-to-desktop';
            moveToDesktopMenuItem.setAttribute('data-l10n-id', 'clipboard-pdf-move-to-desktop');
            moveToDesktopMenuItem.setAttribute('label', '(ctrl+B) برگرداندن فایل به دسکتاپ'); // Fallback
            moveToDesktopMenuItem.addEventListener('command', () => {
                this.moveToDesktopAndDelete(window);
            });
            targetMenu.appendChild(moveToDesktopMenuItem);
            this.storeAddedElement(moveToDesktopMenuItem);

            this.log("Menu items added successfully");
            return true;
        };

        // Polling function
        const waitForMenu = async () => {
            const maxAttempts = 30;
            const delay = 500;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                this.log(`Attempt ${attempt} to find File menu`);
                if (await addMenuItems()) {
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            this.log("Failed to find File menu after maximum attempts");
            const allPopups = doc.querySelectorAll('menupopup, popup, panel');
            const errorMsg = `Final error: Could not find File menu. Found ${allPopups.length} popups: ${Array.from(allPopups).map(p => `${p.tagName}#${p.id || p.getAttribute('label') || 'no-id'}`).join(", ")}`;
            this.log(errorMsg);
            window.alert(`خطا: منوی File پس از ${maxAttempts} تلاش یافت نشد. تعداد عناصر پاپ‌آپ: ${allPopups.length}. لطفاً لاگ‌های دیباگ را بررسی کنید یا با توسعه‌دهنده تماس بگیرید.`);
        };

        // Start polling
        if (doc.readyState === 'complete') {
            waitForMenu();
        } else {
            window.addEventListener('load', waitForMenu, { once: true });
        }
    },

    /**
     * Add UI elements to all open Zotero windows
     */
    addToAllWindows() {
        try {
            var windows = Zotero.getMainWindows();
            this.log(`Found ${windows.length} main windows`);
            for (let win of windows) {
                if (!win.ZoteroPane) {
                    this.log("Skipping window without ZoteroPane");
                    continue;
                }
                this.addToWindow(win);
            }
        } catch (e) {
            this.log(`Error in addToAllWindows: ${e}`);
        }
    },

    /**
     * Store DOM elements for cleanup
     */
    storeAddedElement(elem) {
        if (!elem.id) throw new Error("Element must have an id");
        this.addedElementIDs.push(elem.id);
    },

    /**
     * Remove UI elements from a window
     */
    removeFromWindow(window) {
        var doc = window.document;
        for (let id of this.addedElementIDs) {
            let elem = doc.getElementById(id);
            if (elem) elem.remove();
        }
        let ftl = doc.querySelector('[href="clipboard-pdf-importer.ftl"]');
        if (ftl) ftl.remove();
    },

    /**
     * Remove UI elements from all windows
     */
    removeFromAllWindows() {
        var windows = Zotero.getMainWindows();
        for (let win of windows) {
            if (!win.ZoteroPane) continue;
            this.removeFromWindow(win);
        }
    },

    /**
     * Import PDF from clipboard
     */
    async importPDFFromClipboard(window, move) {
        try {
            if (!window || !window.ZoteroPane) {
                this.log("Error: Invalid window or ZoteroPane not defined");
                window.alert("خطا: پنل Zotero در دسترس نیست.");
                return;
            }

            this.log(`Attempting to access clipboard in window: ${window.document.title || 'no-title'}`);

            const clipboard = Services.clipboard;
            let trans = Components.classes["@mozilla.org/widget/transferable;1"]
                .createInstance(Components.interfaces.nsITransferable);
            trans.init(null);

            const flavors = [
                "application/x-moz-file",
                "text/x-moz-url",
                "text/unicode",
                "text/plain",
                "application/x-moz-nativehtml",
                "application/x-moz-file-promise"
            ];
            for (let flavor of flavors) {
                trans.addDataFlavor(flavor);
            }

            clipboard.getData(trans, clipboard.kGlobalClipboard);

            let availableFlavors = [];
            for (let flavor of flavors) {
                if (trans.flavorsTransferableCanImport(flavor)) {
                    availableFlavors.push(flavor);
                }
            }
            this.log(`Available clipboard flavors: ${availableFlavors.join(", ")}`);

            let file = null;
            let dataLen = {};

            try {
                let fileData = {};
                trans.getTransferData("application/x-moz-file", fileData, dataLen);
                file = fileData.value.QueryInterface(Components.interfaces.nsIFile);
                this.log(`Found file via application/x-moz-file: ${file.path}`);
            } catch (e) {
                this.log(`No file found in application/x-moz-file: ${e}`);
            }

            if (!file) {
                try {
                    let dropData = {};
                    trans.getTransferData("application/x-moz-nativehtml", dropData, dataLen);
                    let dropFiles = dropData.value.QueryInterface(Components.interfaces.nsISupports);
                    let fileList = dropFiles.QueryInterface(Components.interfaces.nsIArray);
                    if (fileList?.length > 0) {
                        file = fileList.queryElementAt(0, Components.interfaces.nsIFile);
                        this.log(`Found file via application/x-moz-nativehtml: ${file.path}`);
                    }
                } catch (e) {
                    this.log(`No file found in application/x-moz-nativehtml: ${e}`);
                }
            }

            if (!file) {
                try {
                    let promiseData = {};
                    trans.getTransferData("application/x-moz-file-promise", promiseData, dataLen);
                    let promise = promiseData.value.QueryInterface(Components.interfaces.nsISupports);
                    file = promise.QueryInterface(Components.interfaces.nsIFile);
                    this.log(`Found file via application/x-moz-file-promise: ${file.path}`);
                } catch (e) {
                    this.log(`No file found in application/x-moz-file-promise: ${e}`);
                }
            }

            if (!file) {
                try {
                    let urlData = {};
                    trans.getTransferData("text/x-moz-url", urlData, dataLen);
                    let url = urlData.value.QueryInterface(Components.interfaces.nsISupportsString).data;
                    if (url) {
                        let path = url.split('\n')[0].replace(/^file:\/\//, "").replace(/\//g, "\\");
                        file = Components.classes["@mozilla.org/file/local;1"]
                            .createInstance(Components.interfaces.nsIFile);
                        file.initWithPath(path);
                        this.log(`Found file via text/x-moz-url: ${file.path}`);
                    }
                } catch (e) {
                    this.log(`No file found in text/x-moz-url: ${e}`);
                }
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
                        file = Components.classes["@mozilla.org/file/local;1"]
                            .createInstance(Components.interfaces.nsIFile);
                        file.initWithPath(text.trim().replace(/^file:\/\//, "").replace(/\//g, "\\"));
                        this.log(`Found file via text/unicode or text/plain: ${file.path}`);
                    }
                } catch (e) {
                    this.log(`No file found in text/unicode or text/plain: ${e}`);
                }
            }

            if (file && file.exists() && file.isFile() && file.path.toLowerCase().endsWith('.pdf')) {
                let collection = window.ZoteroPane.getSelectedCollection();
                let libraryId = collection ? collection.libraryID : window.ZoteroPane.getSelectedLibraryID();

                this.log(`Importing PDF to library ID: ${libraryId}, collection: ${collection ? collection.name : 'none'}`);

                // Use Zotero.Attachments.importFromFile for proper attachment creation
                let attachment = await Zotero.Attachments.importFromFile({
                    file: file,
                    libraryID: libraryId,
                    collections: collection ? [collection.id] : [],
                    rename: move
                });

                this.log(`Attachment created with ID: ${attachment.id}`);

                if (move) {
                    try {
                        if (file.exists()) {
                            file.remove(false);
                            this.log(`Moved file: ${file.path}`);
                        }
                    } catch (e) {
                        this.log(`Error deleting file: ${e}`);
                        window.alert("خطا در حذف فایل اصلی: " + e.message);
                        return;
                    }
                } else {
                    this.log(`Copied file: ${file.path}`);
                }

                window.ZoteroPane.selectItem(attachment.id);
                window.alert(`فایل PDF با موفقیت ${move ? 'منتقل' : 'کپی'} شد.`);
            } else {
                this.log("No valid PDF file found in clipboard");
                window.alert("فایل PDF معتبری در کلیپ‌بورد یافت نشد. لطفاً یک فایل PDF کپی کنید.");
            }
        } catch (e) {
            this.log(`Error importing PDF: ${e}`);
            window.alert("خطا در وارد کردن PDF از کلیپ‌بورد: " + e.message);
        }
    },

    /**
     * Move selected file to desktop and delete from Zotero
     */
    async moveToDesktopAndDelete(window) {
        try {
            if (!window || !window.ZoteroPane) {
                this.log("Error: Invalid window or ZoteroPane not defined");
                window.alert("خطا: پنل Zotero در دسترس نیست.");
                return;
            }

            // Get selected items
            let selectedItems = window.ZoteroPane.getSelectedItems();
            if (!selectedItems || selectedItems.length === 0) {
                this.log("No items selected");
                window.alert("لطفاً یک فایل PDF انتخاب کنید.");
                return;
            }

            // For now, handle only the first selected item
            let item = selectedItems[0];
            if (!item.isAttachment() || item.attachmentContentType !== 'application/pdf') {
                this.log(`Selected item is not a PDF attachment: ${item.getDisplayTitle()}`);
                window.alert("لطفاً یک فایل PDF معتبر انتخاب کنید.");
                return;
            }

            // Get file path
            let filePath = await item.getFilePathAsync();
            if (!filePath) {
                this.log(`No file path found for item: ${item.id}`);
                window.alert("خطا: فایل یافت نشد.");
                return;
            }

            // Create nsIFile instance for source file
            let sourceFile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
            sourceFile.initWithPath(filePath);
            if (!sourceFile.exists()) {
                this.log(`Source file does not exist: ${filePath}`);
                window.alert("خطا: فایل در سیستم یافت نشد.");
                return;
            }

            // Get desktop path using Services.dirsvc
            let desktopDir = Services.dirsvc.get("Desk", Components.interfaces.nsIFile);
            if (!desktopDir.exists()) {
                this.log("Desktop directory does not exist");
                window.alert("خطا: پوشه دسکتاپ یافت نشد.");
                return;
            }

            // Generate destination path (preserve original filename)
            let destFile = desktopDir.clone();
            destFile.append(sourceFile.leafName);

            // Check if file already exists on desktop
            let counter = 1;
            let baseName = sourceFile.leafName.replace(/\.pdf$/i, '');
            while (destFile.exists()) {
                destFile = desktopDir.clone();
                destFile.append(`${baseName} (${counter}).pdf`);
                counter++;
            }

            // Copy file to desktop
            sourceFile.copyTo(desktopDir, destFile.leafName);
            this.log(`File copied to desktop: ${destFile.path}`);

            // Delete item from Zotero
            await item.eraseTx();
            this.log(`Item deleted from Zotero: ${item.id}`);

            window.alert(`فایل با موفقیت به دسکتاپ منتقل و از Zotero حذف شد: ${destFile.leafName}`);
        } catch (e) {
            this.log(`Error moving file to desktop: ${e}`);
            window.alert("خطا در انتقال فایل به دسکتاپ: " + e.message);
        }
    },

    /**
     * Main plugin functionality
     */
    async main() {
        this.log("Plugin main function called");
    },
};