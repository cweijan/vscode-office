// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-emoji"
//
// Use EmojiOne to lookup emojis and render emoji `:smile:` :smile:
//
// :warning: **License**:
//
// Please follow https://www.emojione.com/licenses/free if you use this powerpack.
// 使用前请注意阅读 EmojiOne 使用许可
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("emojione"), require("../addon/fold-emoji"), require("emojione/extras/css/emojione.min.css")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","emojione","../addon/fold-emoji","emojione/extras/css/emojione.min.css"], mod) :
  /*plain env*/ mod(null, (this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["fold-emoji-with-emojione"] = {}), emojione, HyperMD.FoldEmoji);
})(function (require, exports, _emojione_module, fold_emoji_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** emojione doesn't have AMD declaration. load it from browser if needed */
    var emojione = _emojione_module || this['emojione'] || window['emojione'];
    exports.emojioneChecker = function (text) { return emojione.shortnameToUnicode(text) != text; };
    exports.emojioneRenderer = function (text) {
        var html = emojione.shortnameToImage(text);
        if (!/^<img /i.test(html))
            return null;
        var attr = /([\w-]+)="(.+?)"/g;
        var ans = document.createElement("img");
        var t;
        while (t = attr.exec(html))
            ans.setAttribute(t[1], t[2]);
        return ans;
    };
    // Update default EmojiChecker and EmojiRenderer
    if (emojione) {
        fold_emoji_1.defaultOption.emojiChecker = exports.emojioneChecker;
        fold_emoji_1.defaultOption.emojiRenderer = exports.emojioneRenderer;
    }
    else {
        console.error("[HyperMD] PowerPack fold-emoji-with-emojione loaded, but emojione not found.");
    }
});
