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
  },

  log(msg) {
    Zotero.debug("TranslatorUpdator: " + msg);
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

  getLocalizedString(key, params = {}) {
    const locale = Zotero.locale || "en-US";
    const isPersian = locale.startsWith("fa");
    const strings = {
      "menu.label": isPersian ? "به‌روزرسانی مترجم‌ها" : "Update Translators",
      "progress.start": isPersian
        ? "🚀 شروع به‌روزرسانی..."
        : "🚀 Starting update...",
      "progress.fetching": isPersian
        ? "دریافت لیست فایل‌ها..."
        : "Fetching file list...",
      "progress.downloading": isPersian
        ? (file) => `📥 دانلود ${file}...`
        : (file) => `📥 Downloading ${file}...`,
      "progress.saving": isPersian
        ? (file) => `💾 ذخیره ${file}...`
        : (file) => `💾 Saving ${file}...`,
      "progress.noMetadata": isPersian
        ? (file) => `⚠️ متادیتا برای ${file} یافت نشد`
        : (file) => `⚠️ No metadata for ${file}`,
      "progress.errorFetch": isPersian
        ? (file) => `❌ خطا در دانلود ${file}`
        : (file) => `❌ Failed to fetch ${file}`,
      "progress.completed": isPersian
        ? "✅ به‌روزرسانی با موفقیت تکمیل شد!"
        : "✅ Update completed successfully!",
      "progress.available": isPersian
        ? "📚 مترجم‌ها بعد از 10 دقیقه در دسترس خواهند بود"
        : "📚 Translators will be available after 10 minutes",
      "progress.error": isPersian
        ? (err) => `❌ خطا: ${err}`
        : (err) => `❌ Error: ${err}`,
      "button.close": isPersian
        ? "برای بستن کلیک کنید..."
        : "Click to close...",
    };
    const text =
      typeof strings[key] === "function"
        ? strings[key](params.file)
        : strings[key];
    return text || key;
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
      let item = doc.createXULElement("menuitem");
      item.id = "update-translators-btn";
      item.setAttribute("label", this.getLocalizedString("menu.label"));
      item.addEventListener("command", () => {
        this.log("Update Translators menu item clicked");
        this.runInsertTranslator();
      });
      let menuPopup = doc.getElementById("menu_viewPopup");
      if (!menuPopup) {
        this.log("menu_viewPopup not found");
        return;
      }
      menuPopup.appendChild(item);
      this.storeAddedElement(item);
      this.log("Menu item added to window");
    } catch (e) {
      this.log("Error in addToWindow: " + e);
    }
  },

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
