import { cssPrefix } from '../../config';
import tooltip from '../tooltip';
import { h } from '../element';
import { t } from '../../locale/locale';
import { handler } from '../../../../../util/vscode.ts';

function normalizeTelemetrySegment(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || 'unknown';
}

export function emitExcelToolbarTelemetry(name, properties) {
  handler.emit('telemetry', {
    event: `excel.toolbar.${normalizeTelemetrySegment(name)}`,
    properties,
  });
}

export default class Item {
  // tooltip
  // tag: the subclass type
  // shortcut: shortcut key
  constructor(tag, shortcut, value) {
    this.tip = '';
    if (tag) this.tip = t(`toolbar.${tag.replace(/-[a-z]/g, c => c[1].toUpperCase())}`);
    if (shortcut) this.tip += ` (${shortcut})`;
    this.tag = tag;
    this.shortcut = shortcut;
    this.value = value;
    this.el = this.element();
    this.change = () => {};
  }

  element() {
    const { tip } = this;
    return h('div', `${cssPrefix}-toolbar-btn`)
      .on('mouseenter', (evt) => {
        if (this.tip) tooltip(this.tip, evt.target);
      })
      .attr('data-tooltip', tip);
  }

  telemetryName() {
    return this.tag || this.tip || 'unknown';
  }

  trackTelemetry(properties) {
    emitExcelToolbarTelemetry(this.telemetryName(), properties);
  }

  setState() {}
}
