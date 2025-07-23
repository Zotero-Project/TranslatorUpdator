# 📦 UpdateTranslator for Zotero

**UpdateTranslator** is a lightweight plugin for Zotero that improves Persian content support and streamlines file handling in Zotero.

---

## 🌐 What Does This Plugin Do?

This plugin has **two main features**:

### 1. ✨ Adds and Updates Zotero Translators for Persian Websites

Zotero doesn't support many Iranian content platforms by default. This plugin installs and updates a curated set of **8 specialized translators** for popular Persian websites, such as:

- [Asmaneketab.ir](https://asmaneketab.ir)
- [PersianPDF.com](https://persianpdf.com)
- [LiteratureLib.com](https://literaturelib.com)
- [asmaneketab.ir](https://asmaneketab.ir/)
- [molapub.ir](https://www.molapub.ir/)
- More sites planned…

The translators are hosted on:

🔗 **[https://translatorupdator.ir/](https://translatorupdator.ir/)**

### 2. 🖱️ Drag & Paste File Support with Shortcuts

Managing attachments is now easier than ever:

- Quickly **paste files** (PDF, images, etc.) into Zotero using:
  - Custom **keyboard shortcuts**
  - Built-in **toolbar buttons**
- Avoids manual drag-and-drop from File Explorer.
- Seamlessly adds attachments to selected Zotero items.

---

## 🚀 How to Install

1. [Download the `.xpi` plugin file](#) from the latest release.
2. Open Zotero.
3. Drag and drop the `.xpi` file into the Zotero window.
4. Restart Zotero if prompted.

✅ Done! You're ready to go.

---

## 🔄 How It Works

- On startup, the plugin installs or updates all translators from the central source.
- The file paste feature hooks into Zotero’s UI, adds buttons and shortcut handlers.
- No user data is sent externally — all processes run locally.

---

## 🛠️ Developer Notes

- Built using Zotero’s official plugin and translator APIs.
- Translators are fetched from `https://translatorupdator.ir/translators/`.
- File paste integrates with Zotero’s item attachment APIs.
- Contributions welcome! Add translators under [`/translators/`](./translators/).

---

## 📬 Contact & Support

- Email: [you@example.com](mailto:you@example.com)
- Telegram: [@YourUsername](https://t.me/YourUsername)
- GitHub Issues: [Open an issue](https://github.com/YourRepo/issues) for bugs or feature requests.

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.

---

**Made with ❤️ for the Persian-speaking research community.**
