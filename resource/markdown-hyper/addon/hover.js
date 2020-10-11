// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: When mouse hovers on a link or footnote ref, shows related footnote
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core"), require("./read-link")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core","./read-link"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.Hover = this.HyperMD.Hover || {}), CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var markdownToHTML = (typeof marked === 'function') ? marked : function (text) {
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/  /g, ' &nbsp;');
        return "<pre>" + text + "</pre>";
    };
    /** if `marked` exists, use it; else, return safe html */
    function defaultConvertor(footnote, text) {
        if (!text)
            return null;
        return markdownToHTML(text);
    }
    exports.defaultConvertor = defaultConvertor;
    exports.defaultOption = {
        enabled: false,
        xOffset: 10,
        convertor: defaultConvertor,
    };
    exports.suggestedOption = {
        enabled: true,
    };
    core_1.suggestedEditorConfig.hmdHover = exports.suggestedOption;
    CodeMirror.defineOption("hmdHover", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            newVal = { enabled: !!newVal };
        }
        else if (typeof newVal === "function") {
            newVal = { enabled: true, convertor: newVal };
        }
        ///// apply config and write new values into cm
        var inst = exports.getAddon(cm);
        for (var k in exports.defaultOption) {
            inst[k] = (k in newVal) ? newVal[k] : exports.defaultOption[k];
        }
    });
    //#endregion
    /********************************************************************************** */
    //#region Addon Class
    var Hover = /** @class */ (function () {
        function Hover(cm) {
            // options will be initialized to defaultOption when constructor is finished
            var _this = this;
            this.cm = cm;
            new core_1.FlipFlop(
            /* ON  */ function () { lineDiv.addEventListener("mouseenter", evhandler, true); }, 
            /* OFF */ function () { lineDiv.removeEventListener("mouseenter", evhandler, true); _this.hideInfo(); }).bind(this, "enabled", true);
            var lineDiv = cm.display.lineDiv;
            this.lineDiv = lineDiv;
            var tooltip = document.createElement("div"), tooltipContent = document.createElement("div"), tooltipIndicator = document.createElement("div");
            tooltip.setAttribute("style", "position:absolute;z-index:99");
            tooltip.setAttribute("class", "HyperMD-hover");
            tooltip.setAttribute("cm-ignore-events", "true");
            tooltipContent.setAttribute("class", "HyperMD-hover-content");
            tooltip.appendChild(tooltipContent);
            tooltipIndicator.setAttribute("class", "HyperMD-hover-indicator");
            tooltip.appendChild(tooltipIndicator);
            this.tooltipDiv = tooltip;
            this.tooltipContentDiv = tooltipContent;
            this.tooltipIndicator = tooltipIndicator;
            var evhandler = this.mouseenter.bind(this);
        }
        Hover.prototype.mouseenter = function (ev) {
            var cm = this.cm, target = ev.target;
            var className = target.className;
            if (target == this.tooltipDiv || (target.compareDocumentPosition && (target.compareDocumentPosition(this.tooltipDiv) & 8) == 8)) {
                return;
            }
            var mat;
            if (target.nodeName !== "SPAN" || !(mat = className.match(/(?:^|\s)cm-(hmd-barelink2?|hmd-footref2)(?:\s|$)/))) {
                this.hideInfo();
                return;
            }
            var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY }, "window");
            var footnoteName = null;
            var footnote = null;
            var hover_type = mat[1]; // hmd-barelink|hmd-link-url-s
            var range = core_1.expandRange(cm, pos, hover_type);
            if (range) {
                footnoteName = cm.getRange(range.from, range.to);
                footnoteName = footnoteName.slice(1, -1);
                if (footnoteName)
                    footnote = cm.hmdReadLink(footnoteName, pos.line) || null;
            }
            var convertor = this.convertor || defaultConvertor;
            var html = convertor(footnoteName, footnote && footnote.content || null);
            if (!html) {
                this.hideInfo();
                return;
            }
            this.showInfo(html, target);
        };
        Hover.prototype.showInfo = function (html, relatedTo) {
            var b1 = relatedTo.getBoundingClientRect();
            var b2 = this.lineDiv.getBoundingClientRect();
            var tdiv = this.tooltipDiv;
            var xOffset = this.xOffset;
            this.tooltipContentDiv.innerHTML = html;
            tdiv.style.left = (b1.left - b2.left - xOffset) + 'px';
            this.lineDiv.appendChild(tdiv);
            var b3 = tdiv.getBoundingClientRect();
            if (b3.right > b2.right) {
                xOffset = b3.right - b2.right;
                tdiv.style.left = (b1.left - b2.left - xOffset) + 'px';
            }
            tdiv.style.top = (b1.top - b2.top - b3.height) + 'px';
            this.tooltipIndicator.style.marginLeft = xOffset + 'px';
        };
        Hover.prototype.hideInfo = function () {
            if (this.tooltipDiv.parentElement == this.lineDiv) {
                this.lineDiv.removeChild(this.tooltipDiv);
            }
        };
        return Hover;
    }());
    exports.Hover = Hover;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one Hover instance */
    exports.getAddon = core_1.Addon.Getter("Hover", Hover, exports.defaultOption /** if has options */);
});
