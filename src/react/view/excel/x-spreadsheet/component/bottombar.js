import { h } from './element';
import { bindClickoutside, unbindClickoutside, mouseMoveUp } from './event';
import { cssPrefix } from '../config';
import Icon from './icon';
import FormInput from './form_input';
import { tf } from '../locale/locale';

const menuItems = [
  { key: 'rename',    title: tf('contextmenu.renameSheet'),    icon: 'edit' },
  { key: 'duplicate', title: tf('contextmenu.duplicateSheet'), icon: 'files' },
  { key: 'divider' },
  { key: 'delete',    title: tf('contextmenu.deleteSheet'),    icon: 'trash' },
];

function buildMenuItem(item) {
  if (item.key === 'divider') {
    return h('div', `${cssPrefix}-item divider`);
  }
  return h('div', `${cssPrefix}-item`)
    .children(
      h('i', `codicon codicon-${item.icon}`),
      h('span', 'menu-title').child(item.title()),
    )
    .on('click', () => {
      this.itemClick(item.key);
      this.hide();
    });
}

function buildMenu() {
  return menuItems.map(it => buildMenuItem.call(this, it));
}

class ContextMenu {
  constructor() {
    this.el = h('div', `${cssPrefix}-contextmenu`)
      .css('width', '180px')
      .children(...buildMenu.call(this))
      .hide();
    this.itemClick = () => {};
  }

  hide() {
    const { el } = this;
    el.hide();
    unbindClickoutside(el);
  }

  setOffset(offset) {
    const { el } = this;
    el.offset(offset);
    el.show();
    bindClickoutside(el);
  }
}

export default class Bottombar {
  constructor(addFunc = () => {},
    swapFunc = () => {},
    menuFunc = () => {},
    updateFunc = () => {},
    moveFunc = () => {}) {
    this.swapFunc = swapFunc;
    this.updateFunc = updateFunc;
    this.moveFunc = moveFunc;
    this.dataNames = [];
    this.activeEl = null;
    this.contextEl = null;
    this.items = [];
    this.dragFromIndex = -1;
    this.dropMarkerEl = h('div', `${cssPrefix}-sheet-drop-marker`).hide();
    this.contextMenu = new ContextMenu();
    this.contextMenu.itemClick = (key) => menuFunc(key);
    this.el = h('div', `${cssPrefix}-bottombar`).children(
      this.contextMenu.el,
      this.dropMarkerEl,
      this.menuEl = h('ul', `${cssPrefix}-menu`).child(
        h('li', '').children(
          new Icon('add').on('click', () => {
            addFunc();
          }),
        ),
      ),
    );
  }

  bindTabItem(item, options) {
    item.on('mousedown', (evt) => {
      if (evt.button !== 0) return;
      if (options.mode === 'read') {
        evt.preventDefault();
        this.clickSwap2(item);
        return;
      }
      const fromIndex = this.items.findIndex(it => it === item);
      if (fromIndex < 0) return;
      const startX = evt.clientX;
      let dragging = false;
      let lastClientX = startX;
      evt.preventDefault();
      mouseMoveUp(window, (e) => {
        lastClientX = e.clientX;
        if (!dragging && Math.abs(e.clientX - startX) > 5) {
          dragging = true;
          this.dragFromIndex = fromIndex;
          item.addClass('dragging');
        }
        if (!dragging) return;
        const toIndex = this.findTabDropIndex(e.clientX);
        this.showDropMarker(toIndex);
      }, () => {
        item.removeClass('dragging');
        this.hideDropMarker();
        if (dragging) {
          const toIndex = this.findTabDropIndex(lastClientX);
          if (toIndex >= 0 && toIndex !== fromIndex) {
            this.moveFunc(fromIndex, toIndex);
          }
        } else {
          this.clickSwap2(item);
        }
        this.dragFromIndex = -1;
      });
    }).on('contextmenu', (evt) => {
      if (options.mode === 'read') return;
      evt.preventDefault();
      const { offsetLeft, offsetHeight } = evt.target;
      this.contextEl = item;
      this.contextMenu.setOffset({ left: offsetLeft, bottom: offsetHeight + 1 });
    }).on('dblclick', () => {
      if (options.mode === 'read') return;
      const index = this.items.findIndex(it => it === item);
      if (index >= 0) this.startRename(index);
    });
  }

  addItem(name, active, options) {
    this.dataNames.push(name);
    const item = h('li', active ? 'active' : '').child(name);
    this.bindTabItem(item, options);
    if (options.mode === 'read' && !this.addHidden) {
      this.addHidden = true;
      const addLi = this.menuEl.el.firstElementChild;
      if (addLi) addLi.style.display = 'none';
    }
    if (active) {
      this.clickSwap(item);
    }
    this.items.push(item);
    this.menuEl.child(item);
  }

  insertItem(index, name, active, options) {
    const item = h('li', active ? 'active' : '').child(name);
    this.bindTabItem(item, options);
    this.dataNames.splice(index, 0, name);
    this.items.splice(index, 0, item);
    const next = this.items[index + 1];
    if (next) {
      this.menuEl.el.insertBefore(item.el, next.el);
    } else {
      this.menuEl.child(item);
    }
    if (active) {
      if (this.activeEl !== null) {
        this.activeEl.toggle();
      }
      this.activeEl = item;
      this.swapFunc(index);
    }
  }

  getContextSheetIndex() {
    if (!this.contextEl) return -1;
    return this.items.findIndex(it => it === this.contextEl);
  }

  moveItem(from, to) {
    if (from === to || from < 0 || to < 0 || from >= this.items.length || to >= this.items.length) {
      return;
    }
    const item = this.items[from];
    const name = this.dataNames[from];
    this.items.splice(from, 1);
    this.dataNames.splice(from, 1);
    this.items.splice(to, 0, item);
    this.dataNames.splice(to, 0, name);
    this.menuEl.removeChild(item.el);
    const next = this.items[to + 1];
    if (next) {
      this.menuEl.el.insertBefore(item.el, next.el);
    } else {
      this.menuEl.child(item);
    }
    if (this.activeEl === item) {
      this.swapFunc(to);
    }
  }

  findTabDropIndex(clientX) {
    const { items } = this;
    if (!items.length) return -1;
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].box();
      const mid = rect.left + rect.width / 2;
      if (clientX < mid) return i;
    }
    return items.length - 1;
  }

  showDropMarker(index) {
    if (index < 0 || index >= this.items.length) {
      this.hideDropMarker();
      return;
    }
    const item = this.items[index];
    const rect = item.box();
    const bar = this.menuEl.box();
    this.dropMarkerEl.offset({
      left: rect.left - bar.left,
      bottom: 0,
    }).show();
  }

  hideDropMarker() {
    this.dropMarkerEl.hide();
  }

  startRename(index) {
    if (index < 0 || index >= this.items.length) return;
    const item = this.items[index];
    const v = this.dataNames[index];
    const input = new FormInput('auto', '');
    input.val(v);
    input.input.on('blur', ({ target }) => {
      const { value } = target;
      this.renameItem(index, value.trim() || v);
    });
    input.input.on('keydown', (evt) => {
      if (evt.key === 'Enter') {
        evt.target.blur();
      }
      if (evt.key === 'Escape') {
        this.renameItem(index, v);
      }
    });
    item.html('').child(input.el);
    input.focus();
  }

  renameItem(index, value) {
    this.dataNames.splice(index, 1, value);
    this.items[index].html('').child(value);
    this.updateFunc(index, value);
  }

  clear() {
    this.items.forEach((it) => {
      this.menuEl.removeChild(it.el);
    });
    this.items = [];
    this.dataNames = [];
    this.contextEl = null;
  }

  deleteItem() {
    const { activeEl } = this;
    const deleteEl = this.contextEl;
    if (!deleteEl || this.items.length <= 1) {
      return [-1];
    }
    const index = this.items.findIndex(it => it === deleteEl);
    this.items.splice(index, 1);
    this.dataNames.splice(index, 1);
    this.menuEl.removeChild(deleteEl.el);
    this.contextEl = null;
    if (activeEl === deleteEl) {
      const [f] = this.items;
      this.activeEl = f;
      this.activeEl.toggle();
      return [index, 0];
    }
    return [index, -1];
  }

  clickSwap2(item) {
    const index = this.items.findIndex(it => it === item);
    this.clickSwap(item);
    this.activeEl.toggle();
    this.swapFunc(index);
  }

  clickSwap(item) {
    if (this.activeEl !== null) {
      this.activeEl.toggle();
    }
    this.activeEl = item;
  }
}
