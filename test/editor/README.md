# Nested list regression tests

Run from the repository root:

```sh
npm install
npm run test:lists
npm run build
```

The tests load the production list handlers and bundled Lute parser in jsdom.
Toolbar, rendering notifications, history notifications, and selection utilities
are replaced with small DOM-only test doubles. These tests cover structural
list edits and Markdown round-trips, not native `contenteditable` behavior or the
VS Code extension host.

## Issue #646 coverage

- Backspace at the first nested item outdents one level with descendants intact.
- Shift+Tab does not flatten or duplicate the selected item's descendants.
- Following sibling items retain their subtrees when becoming children.
- Compatible child lists remain tight rather than gaining blank paragraphs.
- Removing the first top-level marker preserves paragraph/child-list boundaries.
- Ordered/unordered nesting, checkbox state, repeated operations, caret retention,
  and empty source-list cleanup.
- Tab creates fourth and fifth levels when the item has a preceding sibling.
  Bullet shapes repeating after the third level are not a nesting limit.

## Heading corruption regression

A synthetic DOM containing an empty first nested `-` item reproducibly makes the
bundled parser consume that item as a Setext underline and turn its parent into
an H2. The tests include that failing control, followed by normalization cases
that preserve all list items through repeated Spin and Markdown save/reload.
The fix adds a paragraph boundary around the parent's inline content, producing
a separating blank line in Markdown. It does not add hidden characters or change
the user's text. Other bullet markers, nonempty/task items, existing headings,
and rendered HTML previews are left alone.

## Required manual verification

Use the development workflow from `README-CN.md` (`npm run dev`, then F5 in VS Code)
and open the following Markdown in WYSIWYG mode:

```markdown
- Parent
    - Child A
        - Grandchild A
    - Child B
        - Grandchild B
            - Fourth level
                - Fifth level
- Tail
```

1. At the start of Child A, press Enter. Check that no heading is created.
2. Repeat Enter at the middle and end of Child A, then Backspace. Check for
   duplicate bullets, lost text, and changed hierarchy. Repeat with loose lists
   containing multiple paragraphs.
3. At the start of Child A, press Backspace or Shift+Tab. Child A should move out
   one level; its descendants must remain intact. Check caret placement and type
   a character immediately afterward.
4. Undo and redo each edit. Verify both hierarchy and caret position.
5. Save/reopen, and compare Markdown source and rendered hierarchy.
6. Repeat with ordered lists and task lists, including checked children.

The unit fixtures exercise production handlers and the bundled parser; they are
not native keyboard tests. Separate Linux Chromium testing reproduced the heading
and duplicate-bullet bugs on the unmodified dev baseline with trusted native
input events. The patched editor passed Enter→Backspace at label start/middle/end,
immediate typing, save/reload, undo/redo, and fourth/fifth-level Tab indentation.
The VS Code extension host and macOS keyboard integration have not been tested.
Complex multi-paragraph merges remain delegated to existing editor behavior.
