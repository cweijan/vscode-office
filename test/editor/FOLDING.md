# WYSIWYG folding (issue #650)

Run `node --test test/editor/folding.test.cjs` and `npm run build` at the repository root.
The DOM tests use jsdom and the bundled Lute Markdown parser. They check heading
boundaries, nested states, ordered/unordered/task lists, caret relocation, DOM
replacement, cleanup and byte-identical serialization before/after folding.

In VS Code development mode (`npm run dev`, F5), open a Markdown file with nested
headings and lists. Use the triangles beside headings and parent list items:

- A heading hides following sibling blocks until the next equal/higher heading.
- A list item hides its direct nested lists, preserving its label and paragraphs.
- Nested folds remain independent when an outer fold is reopened.
- Buttons support Tab navigation and Enter/Space activation.
- Fold state is temporary. Full document reload/re-render resets it. Structural
  edits and selecting a hidden range expand folds before editing. Plain typing
  can retain folds when the editor preserves the relevant DOM nodes.
- Saving, copying, undo/redo and switching modes must preserve all content.
- Test fluid/fixed page width, scrolling, list markers, task checkboxes and block
  drag/insert handles. Folding controls must not cover these other targets.

Controls and the hiding stylesheet live outside the contenteditable element;
no folding attributes or placeholders are added to the Markdown document DOM.
