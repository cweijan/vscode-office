function FloatWin(id) {
  var win = document.getElementById(id)
  var self = this

  /** @type {HTMLDivElement} */
  var titlebar = win.querySelector('.float-win-title');
  titlebar.addEventListener("selectstart", function () { return false }, false)

  /** @type {HTMLButtonElement} */
  var closeBtn = win.querySelector('.float-win-close');
  if (closeBtn) {
    closeBtn.addEventListener("click", function () { self.hide() }, false)
    win.addEventListener("keyup", function (ev) {
      if (ev.keyCode === 27) self.hide() // ESC
    }, false)
  }

  var boxX, boxY, mouseX, mouseY, offsetX, offsetY;

  titlebar.addEventListener("mousedown", function (e) {
    if (e.target === closeBtn) return

    boxX = win.offsetLeft;
    boxY = win.offsetTop;
    mouseX = parseInt(getMouseXY(e).x);
    mouseY = parseInt(getMouseXY(e).y);
    offsetX = mouseX - boxX;
    offsetY = mouseY - boxY;

    document.addEventListener("mousemove", move, false)
    document.addEventListener("mouseup", up, false)
  }, false)

  function move(e) {
    var x = getMouseXY(e).x - offsetX;
    var y = getMouseXY(e).y - offsetY;
    var width = document.documentElement.clientWidth - titlebar.offsetWidth;
    var height = document.documentElement.clientHeight - titlebar.offsetHeight;

    x = Math.min(Math.max(0, x), width);
    y = Math.min(Math.max(0, y), height);

    win.style.left = x + 'px';
    win.style.top = y + 'px';
  }

  function up(e) {
    document.removeEventListener("mousemove", move, false)
    document.removeEventListener("mouseup", up, false)
  }

  function getMouseXY(e) {
    var x = 0, y = 0;
    e = e || window.event;
    if (e.pageX) {
      x = e.pageX;
      y = e.pageY;
    } else {
      x = e.clientX + document.body.scrollLeft - document.body.clientLeft;
      y = e.clientY + document.body.scrollTop - document.body.clientTop;
    }
    return {
      x: x,
      y: y
    };
  }

  this.el = win
  this.closeBtn = closeBtn
  this.visible = !/float-win-hidden/.test(win.className)
}

FloatWin.prototype.show = function (moveToCenter) {
  if (this.visible) return
  var el = this.el, self = this
  this.visible = true
  el.className = this.el.className.replace(/\s*(float-win-hidden\s*)+/g, " ")

  if (moveToCenter) {
    setTimeout(function () {
      self.moveTo((window.innerWidth - el.offsetWidth) / 2, (window.innerHeight - el.offsetHeight) / 2)
    }, 0)
  }
}

FloatWin.prototype.hide = function () {
  if (!this.visible) return
  this.visible = false
  this.el.className += " float-win-hidden"
}

FloatWin.prototype.moveTo = function (x, y) {
  var s = this.el.style
  s.left = x + 'px';
  s.top = y + 'px';
}
