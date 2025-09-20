# TranslatorUpdator
base zotero 7 plugin

## Backlog / Deferred Features

- Collections Focus & Highlight (deferred):
  - Stronger selection highlight in Collections pane and auto-scroll selected row into view.
  - Enable quick navigation from `libraries-collections-box` breadcrumbs to select library/collection.
  - Source for later: `lib-test6.xpi` → `collections_focus_highlight.js` (inspected).
  - Integration plan:
    - Add `collections_focus_highlight.js` to plugin root.
    - In `bootstrap.js`, load via `Services.scriptloader.loadSubScript(rootURI + "collections_focus_highlight.js");`, call `CollectionsFocusHighlight.init({ id: id + ":collections-focus", rootURI });` and add/remove to windows analogous to other modules.
    - Optional: gate behind a pref `extensions.baseplug.collectionsFocusHighlight.enabled`.
  - Notes: tune highlight colors for both light/dark themes; uses MutationObserver on `#zotero-collections-tree` and document-level click capture limited to `libraries-collections-box`.
