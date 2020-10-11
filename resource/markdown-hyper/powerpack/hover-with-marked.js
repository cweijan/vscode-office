// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/hover"
//
// Render tooltip Markdown to HTML, with marked
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("../addon/hover"), require("marked")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","../addon/hover","marked"], mod) :
  /*plain env*/ mod(null, (this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["hover-with-marked"] = {}), HyperMD.Hover, marked);
})(function (require, exports, hover_1, marked) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    if (typeof marked == "function") {
        // Use marked to render Hover tooltip content
        hover_1.defaultOption.convertor = function (footnote, text) {
            if (!text)
                return null;
            return marked(text);
        };
    }
    else {
        console.error("[HyperMD] PowerPack hover-with-marked loaded, but marked not found.");
    }
});
