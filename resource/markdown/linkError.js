export function bindLinkErrors(handler, editor) {
  handler.on('openLinkError', ({ message }) => {
    editor.toast(message, 5000, 'error', 'bottom-right');
  });
}
