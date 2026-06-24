import { h } from './element';
import { bindClickoutside, unbindClickoutside } from './event';
import { cssPrefix } from '../config';
import { formulaDisplayName } from '../core/formula';

function isDividerItem(it) {
  return typeof it === 'object' && it !== null && it.divider === true;
}

function stripOrphanDividers(items) {
  const result = [];
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (!isDividerItem(it)) {
      result.push(it);
      continue;
    }
    const hasBefore = result.some((x) => !isDividerItem(x));
    const hasAfter = items.slice(i + 1).some((x) => !isDividerItem(x));
    if (hasBefore && hasAfter) result.push(it);
  }
  return result;
}

function inputMovePrev(evt) {
  evt.preventDefault();
  evt.stopPropagation();
  const { filterItems } = this;
  if (filterItems.length <= 0) return;
  if (this.itemIndex >= 0) filterItems[this.itemIndex].toggle();
  this.itemIndex -= 1;
  if (this.itemIndex < 0) {
    this.itemIndex = filterItems.length - 1;
  }
  filterItems[this.itemIndex].toggle();
}

function inputMoveNext(evt) {
  evt.stopPropagation();
  const { filterItems } = this;
  if (filterItems.length <= 0) return;
  if (this.itemIndex >= 0) filterItems[this.itemIndex].toggle();
  this.itemIndex += 1;
  if (this.itemIndex > filterItems.length - 1) {
    this.itemIndex = 0;
  }
  filterItems[this.itemIndex].toggle();
}

function inputEnter(evt) {
  evt.preventDefault();
  const { filterItems } = this;
  if (filterItems.length <= 0) return;
  evt.stopPropagation();
  if (this.itemIndex < 0) this.itemIndex = 0;
  filterItems[this.itemIndex].el.click();
  this.hide();
}

function inputKeydownHandler(evt) {
  const { keyCode } = evt;
  if (evt.ctrlKey) {
    evt.stopPropagation();
  }
  switch (keyCode) {
    case 37: // left
      evt.stopPropagation();
      break;
    case 38: // up
      inputMovePrev.call(this, evt);
      break;
    case 39: // right
      evt.stopPropagation();
      break;
    case 40: // down
      inputMoveNext.call(this, evt);
      break;
    case 13: // enter
      inputEnter.call(this, evt);
      break;
    case 9:
      inputEnter.call(this, evt);
      break;
    default:
      evt.stopPropagation();
      break;
  }
}

export default class Suggest {
  constructor(items, itemClick, width = '200px') {
    this.filterItems = [];
    this.items = items;
    this.el = h('div', `${cssPrefix}-suggest`).css('width', width).hide();
    this.itemClick = itemClick;
    this.itemIndex = -1;
  }

  setOffset(v) {
    this.el.cssRemoveKeys('top', 'bottom')
      .offset(v);
  }

  hide() {
    const { el } = this;
    this.filterItems = [];
    this.itemIndex = -1;
    el.hide();
    unbindClickoutside(this.el.parent());
  }

  setItems(items) {
    this.items = items;
    // this.search('');
  }

  search(word) {
    let { items } = this;
    if (!/^\s*$/.test(word)) {
      items = items.filter((it) => {
        if (isDividerItem(it)) return true;
        return (it.key || it).startsWith(word.toUpperCase());
      });
    }
    items = stripOrphanDividers(items);
    items = items.map((it) => {
      if (isDividerItem(it)) {
        return h('div', `${cssPrefix}-item divider`);
      }
      let title = '';
      if (typeof it === 'object' && it !== null && it.key) {
        if (typeof it.title === 'function') {
          // formula-style item: key is the formula name, title() returns a description hint
          const hint = it.title();
          title = formulaDisplayName(it.key);
          if (hint) {
            const item = h('div', `${cssPrefix}-item`)
              .children(
                h('span', '').child(title),
                h('div', 'label').html(hint),
              )
              .on('click.stop', () => {
                this.itemClick(it);
                this.hide();
              });
            return item;
          }
        } else if (it.title) {
          // plain item with explicit string title (e.g. validation operator options)
          title = it.title;
        } else {
          title = formulaDisplayName(it.key);
        }
      } else if (typeof it === 'object' && it !== null && it.title) {
        title = typeof it.title === 'function' ? it.title() : it.title;
      } else {
        title = it;
      }
      const item = h('div', `${cssPrefix}-item`)
        .child(title)
        .on('click.stop', () => {
          this.itemClick(it);
          this.hide();
        });
      if (it.label) {
        item.child(h('div', 'label').html(it.label));
      }
      return item;
    });
    this.filterItems = items;
    if (items.length <= 0) {
      return;
    }
    const { el } = this;
    // items[0].toggle();
    el.html('').children(...items).show();
    bindClickoutside(el.parent(), () => { this.hide(); });
  }

  bindInputEvents(input) {
    input.on('keydown', evt => inputKeydownHandler.call(this, evt));
  }
}
