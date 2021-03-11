module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activateIcon = void 0;
const vscode = __webpack_require__(1);
const commands = __webpack_require__(2);
const changeDetection_1 = __webpack_require__(62);
const versioning_1 = __webpack_require__(63);
const i18n = __webpack_require__(40);
const start_1 = __webpack_require__(107);
/**
 * This method is called when the extension is activated.
 * It initializes the core functionality of the extension.
 */
exports.activateIcon = (context) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield i18n.initTranslations();
        const status = yield versioning_1.checkThemeStatus(context.globalState);
        start_1.showStartMessages(status);
        // Subscribe to the extension commands
        context.subscriptions.push(...commands.registered);
        // Initially trigger the config change detection
        changeDetection_1.detectConfigChanges();
        // Observe changes in the config
        vscode.workspace.onDidChangeConfiguration(changeDetection_1.detectConfigChanges);
    }
    catch (error) {
        console.error(error);
    }
});
/** This method is called when the extension is deactivated */
exports.deactivate = () => { };


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.registered = void 0;
const vscode = __webpack_require__(1);
const activate_1 = __webpack_require__(3);
const explorerArrows_1 = __webpack_require__(54);
const folderColor_1 = __webpack_require__(55);
const folders_1 = __webpack_require__(56);
const grayscale_1 = __webpack_require__(57);
const iconPacks_1 = __webpack_require__(58);
const opacity_1 = __webpack_require__(59);
const restoreConfig_1 = __webpack_require__(60);
const saturation_1 = __webpack_require__(61);
const commands = {
    activateIcons: activate_1.activateIcons,
    toggleIconPacks: iconPacks_1.toggleIconPacks,
    changeFolderTheme: folders_1.changeFolderTheme,
    changeFolderColor: folderColor_1.changeFolderColor,
    restoreDefaultConfig: restoreConfig_1.restoreDefaultConfig,
    toggleExplorerArrows: explorerArrows_1.toggleExplorerArrows,
    changeOpacity: opacity_1.changeOpacity,
    toggleGrayscale: grayscale_1.toggleGrayscale,
    changeSaturation: saturation_1.changeSaturation,
};
exports.registered = Object.keys(commands).map((commandName) => {
    const callCommand = () => commands[commandName]();
    return vscode.commands.registerCommand(`material-icon-theme.${commandName}`, callCommand);
});


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateIcons = void 0;
const vscode = __webpack_require__(1);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Activate the icon theme by changing the settings for the iconTheme. */
exports.activateIcons = () => {
    return setIconTheme();
};
/** Set the icon theme in the config. */
const setIconTheme = () => __awaiter(void 0, void 0, void 0, function* () {
    // global user config
    try {
        yield helpers
            .getConfig()
            .update('workbench.iconTheme', 'material-icon-theme', true);
        // local workspace config
        if (helpers.getConfig().inspect('workbench.iconTheme').workspaceValue !==
            undefined) {
            helpers.getConfig().update('workbench.iconTheme', 'material-icon-theme');
        }
        vscode.window.showInformationMessage(i18n.translate('activated'));
    }
    catch (error) {
        console.error(error);
    }
});


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.toTitleCase = exports.capitalizeFirstLetter = exports.promptToReload = exports.getMaterialIconsJSON = exports.getExtensionPath = exports.isThemeNotVisible = exports.isThemeActivated = exports.setThemeConfig = exports.getThemeConfig = exports.setConfig = exports.getConfigProperties = exports.getConfig = void 0;
const fs = __webpack_require__(5);
const path = __webpack_require__(6);
const vscode = __webpack_require__(1);
const index_1 = __webpack_require__(7);
const reloadMessages = __webpack_require__(39);
/** Get configuration of vs code. */
exports.getConfig = (section) => {
    return vscode.workspace.getConfiguration(section);
};
/** Get list of configuration entries of package.json */
exports.getConfigProperties = () => {
    return vscode.extensions.getExtension('cweijan.vscode-office').packageJSON
        .contributes.configuration.properties;
};
/** Update configuration of vs code. */
exports.setConfig = (section, value, global = false) => {
    return exports.getConfig().update(section, value, global);
};
exports.getThemeConfig = (section) => {
    return exports.getConfig('material-icon-theme').inspect(section);
};
/** Set the config of the theme. */
exports.setThemeConfig = (section, value, global = false) => {
    return exports.getConfig('material-icon-theme').update(section, value, global);
};
/**
 * Is the theme already activated in the editor configuration?
 * @param{boolean} global false by default
 */
exports.isThemeActivated = (global = false) => {
    return global
        ? exports.getConfig().inspect('workbench.iconTheme').globalValue ===
            'material-icon-theme'
        : exports.getConfig().inspect('workbench.iconTheme').workspaceValue ===
            'material-icon-theme';
};
/** Is the theme not visible for the user? */
exports.isThemeNotVisible = () => {
    const config = exports.getConfig().inspect('workbench.iconTheme');
    return ((!exports.isThemeActivated(true) && config.workspaceValue === undefined) || // no workspace and not global
        (!exports.isThemeActivated() && config.workspaceValue !== undefined));
};
/** Return the path of the extension in the file system. */
exports.getExtensionPath = () => vscode.extensions.getExtension('cweijan.vscode-office').extensionPath;
/** Get the configuration of the icons as JSON Object */
exports.getMaterialIconsJSON = () => {
    const iconJSONPath = path.join(exports.getExtensionPath(), 'dist', index_1.iconJsonName);
    try {
        const data = fs.readFileSync(iconJSONPath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error(error);
        return undefined;
    }
};
/** Reload vs code window */
exports.promptToReload = () => {
    return reloadMessages.showConfirmToReloadMessage().then((result) => {
        if (result)
            reloadWindow();
    });
};
const reloadWindow = () => {
    return vscode.commands.executeCommand('workbench.action.reloadWindow');
};
/** Capitalize the first letter of a string */
exports.capitalizeFirstLetter = (name) => name.charAt(0).toUpperCase() + name.slice(1);
/** TitleCase all words in a string */
exports.toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};


/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(8), exports);
__exportStar(__webpack_require__(34), exports);
__exportStar(__webpack_require__(35), exports);
__exportStar(__webpack_require__(36), exports);


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(9), exports);
__exportStar(__webpack_require__(30), exports);
__exportStar(__webpack_require__(31), exports);
__exportStar(__webpack_require__(29), exports);
__exportStar(__webpack_require__(32), exports);
__exportStar(__webpack_require__(37), exports);
__exportStar(__webpack_require__(38), exports);


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFileIconDefinitions = void 0;
const merge = __webpack_require__(10);
const fileConfig_1 = __webpack_require__(12);
const index_1 = __webpack_require__(13);
const constants_1 = __webpack_require__(29);
/**
 * Get all file icons that can be used in this theme.
 */
exports.loadFileIconDefinitions = (fileIcons, config, options) => {
    config = merge({}, config);
    const enabledIcons = disableIconsByPack(fileIcons, options.activeIconPack);
    const customIcons = getCustomIcons(options.files.associations);
    const allFileIcons = [...enabledIcons, ...customIcons];
    allFileIcons.forEach((icon) => {
        if (icon.disabled)
            return;
        config = merge({}, config, setIconDefinition(config, icon.name));
        if (icon.light) {
            config = merge({}, config, setIconDefinition(config, icon.name, constants_1.lightVersion));
        }
        if (icon.highContrast) {
            config = merge({}, config, setIconDefinition(config, icon.name, constants_1.highContrastVersion));
        }
        if (icon.fileExtensions) {
            config = merge({}, config, mapSpecificFileIcons(icon, "fileExtensions" /* FileExtensions */));
        }
        if (icon.fileNames) {
            config = merge({}, config, mapSpecificFileIcons(icon, "fileNames" /* FileNames */, options.files.associations));
        }
    });
    // set default file icon
    config = merge({}, config, setIconDefinition(config, fileIcons.defaultIcon.name));
    config.file = fileIcons.defaultIcon.name;
    if (fileIcons.defaultIcon.light) {
        config = merge({}, config, setIconDefinition(config, fileIcons.defaultIcon.name, constants_1.lightVersion));
        config.light.file = fileIcons.defaultIcon.name + constants_1.lightVersion;
    }
    if (fileIcons.defaultIcon.highContrast) {
        config = merge({}, config, setIconDefinition(config, fileIcons.defaultIcon.name, constants_1.highContrastVersion));
        config.highContrast.file = fileIcons.defaultIcon.name + constants_1.highContrastVersion;
    }
    return config;
};
/**
 * Map the file extensions and the filenames to the related icons.
 */
const mapSpecificFileIcons = (icon, mappingType, customFileAssociation = {}) => {
    const config = new index_1.IconConfiguration();
    icon[mappingType].forEach((name) => {
        // if the custom file extension should also overwrite the file names
        const shouldOverwriteFileNames = Object.keys(customFileAssociation).some((key) => {
            // overwrite is enabled if there are two asterisks in the wildcard
            if (!/^\*{2}\./.test(key))
                return false;
            const fileExtension = key.replace(constants_1.wildcardPattern, '.');
            // check if the file name contains the particular file extension
            // (e.g. extension ".md" in "Readme.md" -> then overwrite it with the *.md icon)
            return name.toLowerCase().indexOf(fileExtension.toLowerCase()) !== -1;
        });
        // if overwrite is enabled then do not continue to set the icons for file names containing the file extension
        if (shouldOverwriteFileNames)
            return;
        config[mappingType][name] = icon.name;
        if (icon.light) {
            config.light[mappingType][name] = `${icon.name}${constants_1.lightVersion}`;
        }
        if (icon.highContrast) {
            config.highContrast[mappingType][name] = `${icon.name}${constants_1.highContrastVersion}`;
        }
    });
    return config;
};
/**
 * Disable all file icons that are in a pack which is disabled.
 */
const disableIconsByPack = (fileIcons, activatedIconPack) => {
    return fileIcons.icons.filter((icon) => {
        return !icon.enabledFor
            ? true
            : icon.enabledFor.some((p) => p === activatedIconPack);
    });
};
const setIconDefinition = (config, iconName, appendix = '') => {
    const obj = { iconDefinitions: {} };
    const fileConfigHash = fileConfig_1.getFileConfigHash(config.options);
    obj.iconDefinitions[`${iconName}${appendix}`] = {
        iconPath: `${constants_1.iconFolderPath}${iconName}${appendix}${fileConfigHash}.svg`,
    };
    return obj;
};
const getCustomIcons = (fileAssociations) => {
    if (!fileAssociations)
        return [];
    const icons = Object.keys(fileAssociations).map((fa) => {
        const icon = { name: fileAssociations[fa].toLowerCase() };
        if (constants_1.wildcardPattern.test(fa)) {
            icon.fileExtensions = [fa.toLowerCase().replace(constants_1.wildcardPattern, '')];
        }
        else {
            icon.fileNames = [fa.toLowerCase()];
        }
        return icon;
    });
    return icons;
};


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(module) {/**
 * Lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    asyncTag = '[object AsyncFunction]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    nullTag = '[object Null]',
    objectTag = '[object Object]',
    proxyTag = '[object Proxy]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    undefinedTag = '[object Undefined]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Detect free variable `exports`. */
var freeExports =  true && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule && freeModule.require && freeModule.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined,
    Symbol = root.Symbol,
    Uint8Array = root.Uint8Array,
    allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined,
    getPrototype = overArg(Object.getPrototypeOf, Object),
    objectCreate = Object.create,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    splice = arrayProto.splice,
    symToStringTag = Symbol ? Symbol.toStringTag : undefined;

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined,
    nativeMax = Math.max,
    nativeNow = Date.now;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
    nativeCreate = getNative(Object, 'create');

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} proto The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(proto) {
    if (!isObject(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object;
    object.prototype = undefined;
    return result;
  };
}());

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * This function is like `assignValue` except that it doesn't assign
 * `undefined` values.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignMergeValue(object, key, value) {
  if ((value !== undefined && !eq(object[key], value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && defineProperty) {
    defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * The base implementation of `_.merge` without support for multiple sources.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} [customizer] The function to customize merged values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) {
    return;
  }
  baseFor(source, function(srcValue, key) {
    stack || (stack = new Stack);
    if (isObject(srcValue)) {
      baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
    }
    else {
      var newValue = customizer
        ? customizer(safeGet(object, key), srcValue, (key + ''), object, source, stack)
        : undefined;

      if (newValue === undefined) {
        newValue = srcValue;
      }
      assignMergeValue(object, key, newValue);
    }
  }, keysIn);
}

/**
 * A specialized version of `baseMerge` for arrays and objects which performs
 * deep merges and tracks traversed objects enabling objects with circular
 * references to be merged.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {string} key The key of the value to merge.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} mergeFunc The function to merge values.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
  var objValue = safeGet(object, key),
      srcValue = safeGet(source, key),
      stacked = stack.get(srcValue);

  if (stacked) {
    assignMergeValue(object, key, stacked);
    return;
  }
  var newValue = customizer
    ? customizer(objValue, srcValue, (key + ''), object, source, stack)
    : undefined;

  var isCommon = newValue === undefined;

  if (isCommon) {
    var isArr = isArray(srcValue),
        isBuff = !isArr && isBuffer(srcValue),
        isTyped = !isArr && !isBuff && isTypedArray(srcValue);

    newValue = srcValue;
    if (isArr || isBuff || isTyped) {
      if (isArray(objValue)) {
        newValue = objValue;
      }
      else if (isArrayLikeObject(objValue)) {
        newValue = copyArray(objValue);
      }
      else if (isBuff) {
        isCommon = false;
        newValue = cloneBuffer(srcValue, true);
      }
      else if (isTyped) {
        isCommon = false;
        newValue = cloneTypedArray(srcValue, true);
      }
      else {
        newValue = [];
      }
    }
    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      newValue = objValue;
      if (isArguments(objValue)) {
        newValue = toPlainObject(objValue);
      }
      else if (!isObject(objValue) || isFunction(objValue)) {
        newValue = initCloneObject(srcValue);
      }
    }
    else {
      isCommon = false;
    }
  }
  if (isCommon) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    stack.set(srcValue, newValue);
    mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
    stack['delete'](srcValue);
  }
  assignMergeValue(object, key, newValue);
}

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

/**
 * Creates a clone of  `buffer`.
 *
 * @private
 * @param {Buffer} buffer The buffer to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Buffer} Returns the cloned buffer.
 */
function cloneBuffer(buffer, isDeep) {
  if (isDeep) {
    return buffer.slice();
  }
  var length = buffer.length,
      result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

  buffer.copy(result);
  return result;
}

/**
 * Creates a clone of `arrayBuffer`.
 *
 * @private
 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
  return result;
}

/**
 * Creates a clone of `typedArray`.
 *
 * @private
 * @param {Object} typedArray The typed array to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned typed array.
 */
function cloneTypedArray(typedArray, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    if (newValue === undefined) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue(object, key, newValue);
    } else {
      assignValue(object, key, newValue);
    }
  }
  return object;
}

/**
 * Creates a function like `_.assign`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return baseRest(function(object, sources) {
    var index = -1,
        length = sources.length,
        customizer = length > 1 ? sources[length - 1] : undefined,
        guard = length > 2 ? sources[2] : undefined;

    customizer = (assigner.length > 3 && typeof customizer == 'function')
      ? (length--, customizer)
      : undefined;

    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}

/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !isPrototype(object))
    ? baseCreate(getPrototype(object))
    : {};
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

/**
 * Gets the value at `key`, unless `key` is "__proto__" or "constructor".
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function safeGet(object, key) {
  if (key === 'constructor' && typeof object[key] === 'function') {
    return;
  }

  if (key == '__proto__') {
    return;
  }

  return object[key];
}

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/**
 * Converts `value` to a plain object flattening inherited enumerable string
 * keyed properties of `value` to own properties of the plain object.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {Object} Returns the converted plain object.
 * @example
 *
 * function Foo() {
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.assign({ 'a': 1 }, new Foo);
 * // => { 'a': 1, 'b': 2 }
 *
 * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
 * // => { 'a': 1, 'b': 2, 'c': 3 }
 */
function toPlainObject(value) {
  return copyObject(value, keysIn(value));
}

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}

/**
 * This method is like `_.assign` except that it recursively merges own and
 * inherited enumerable string keyed properties of source objects into the
 * destination object. Source properties that resolve to `undefined` are
 * skipped if a destination value exists. Array and plain object properties
 * are merged recursively. Other objects and value types are overridden by
 * assignment. Source objects are applied from left to right. Subsequent
 * sources overwrite property assignments of previous sources.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 0.5.0
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var object = {
 *   'a': [{ 'b': 2 }, { 'd': 4 }]
 * };
 *
 * var other = {
 *   'a': [{ 'c': 3 }, { 'e': 5 }]
 * };
 *
 * _.merge(object, other);
 * // => { 'a': [{ 'b': 2, 'c': 3 }, { 'd': 4, 'e': 5 }] }
 */
var merge = createAssigner(function(object, source, srcIndex) {
  baseMerge(object, source, srcIndex);
});

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = merge;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(11)(module)))

/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = function(module) {
	if (!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if (!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileConfigHash = void 0;
const icons_1 = __webpack_require__(7);
/**
 * Generate a config hashed string that is appended to each icon file name.
 * @param config Icon Configuration object
 */
exports.getFileConfigHash = (options) => {
    try {
        const defaults = icons_1.getDefaultIconOptions();
        let fileConfigString = '';
        if (options.saturation !== defaults.saturation ||
            options.opacity !== defaults.opacity ||
            options.folders.color !== defaults.folders.color) {
            fileConfigString += `~${getHash(JSON.stringify(options))}`;
        }
        return fileConfigString;
    }
    catch (error) {
        console.error(error);
    }
};
const getHash = (value) => {
    let hash = 0, i, chr;
    if (value.length === 0)
        return hash;
    for (i = 0; i < value.length; i++) {
        chr = value.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(14), exports);
__exportStar(__webpack_require__(26), exports);
__exportStar(__webpack_require__(28), exports);


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(15), exports);
__exportStar(__webpack_require__(18), exports);
__exportStar(__webpack_require__(21), exports);
__exportStar(__webpack_require__(23), exports);
__exportStar(__webpack_require__(24), exports);
__exportStar(__webpack_require__(25), exports);


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(16), exports);
__exportStar(__webpack_require__(17), exports);


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.FileIcons = void 0;
class FileIcons {
}
exports.FileIcons = FileIcons;


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(19), exports);
__exportStar(__webpack_require__(20), exports);


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(22), exports);


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.IconPack = void 0;
/**
 * Defines icon packs that can be toggled.
 */
var IconPack;
(function (IconPack) {
    IconPack["Angular"] = "angular";
    IconPack["Nest"] = "nest";
    IconPack["Ngrx"] = "angular_ngrx";
    IconPack["React"] = "react";
    IconPack["Redux"] = "react_redux";
    IconPack["Vue"] = "vue";
    IconPack["Vuex"] = "vue_vuex";
})(IconPack = exports.IconPack || (exports.IconPack = {}));


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(27), exports);


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.IconConfiguration = void 0;
class IconConfiguration {
    constructor() {
        this.iconDefinitions = {};
        this.folderNames = {};
        this.folderNamesExpanded = {};
        this.fileExtensions = {};
        this.fileNames = {};
        this.languageIds = {};
        this.light = {
            fileExtensions: {},
            fileNames: {},
        };
        this.highContrast = {
            fileExtensions: {},
            fileNames: {},
        };
        this.options = {};
    }
}
exports.IconConfiguration = IconConfiguration;


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.wildcardPattern = exports.highContrastVersion = exports.lightVersion = exports.openedFolder = exports.iconJsonName = exports.iconFolderPath = void 0;
/**
 * Path where the icons are located.
 */
exports.iconFolderPath = './../icons/';
/**
 * File name of the JSON file that will be generated to the out folder.
 */
exports.iconJsonName = 'material-icons.json';
/**
 * File ending for opened folders.
 */
exports.openedFolder = '-open';
/**
 * File ending for light icons.
 */
exports.lightVersion = '_light';
/**
 * File ending for high contrast icons.
 */
exports.highContrastVersion = '_highContrast';
/**
 * Pattern to match wildcards for custom file icon mappings.
 */
exports.wildcardPattern = new RegExp(/^\*{1,2}\./);


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHEXColorCode = exports.generateFolderIcons = exports.loadFolderIconDefinitions = void 0;
const fs = __webpack_require__(5);
const merge = __webpack_require__(10);
const path = __webpack_require__(6);
const fileConfig_1 = __webpack_require__(12);
const constants_1 = __webpack_require__(29);
/**
 * Get the folder icon definitions as object.
 */
exports.loadFolderIconDefinitions = (folderThemes, config, options) => {
    config = merge({}, config);
    config.hidesExplorerArrows = options.hidesExplorerArrows;
    const activeTheme = getEnabledFolderTheme(folderThemes, options.folders.theme);
    const enabledIcons = disableIconsByPack(activeTheme, options.activeIconPack);
    const customIcons = getCustomIcons(options.folders.associations);
    const allIcons = [...enabledIcons, ...customIcons];
    if (options.folders.theme === 'none') {
        return config;
    }
    allIcons.forEach((icon) => {
        if (icon.disabled)
            return;
        config = setIconDefinitions(config, icon);
        config = merge({}, config, setFolderNames(icon.name, icon.folderNames));
        config.light = icon.light
            ? merge({}, config.light, setFolderNames(icon.name, icon.folderNames, constants_1.lightVersion))
            : config.light;
        config.highContrast = icon.highContrast
            ? merge({}, config.highContrast, setFolderNames(icon.name, icon.folderNames, constants_1.highContrastVersion))
            : config.highContrast;
    });
    config = setDefaultFolderIcons(activeTheme, config);
    return config;
};
/**
 * Set the default folder icons for the theme.
 */
const setDefaultFolderIcons = (theme, config) => {
    config = merge({}, config);
    const hasFolderIcons = theme.defaultIcon.name && theme.defaultIcon.name.length > 0;
    if (hasFolderIcons) {
        config = setIconDefinitions(config, theme.defaultIcon);
    }
    config = merge({}, config, createDefaultIconConfigObject(hasFolderIcons, theme, ''));
    config.light = theme.defaultIcon.light
        ? merge({}, config.light, createDefaultIconConfigObject(hasFolderIcons, theme, constants_1.lightVersion))
        : config.light;
    config.highContrast = theme.defaultIcon.highContrast
        ? merge({}, config.highContrast, createDefaultIconConfigObject(hasFolderIcons, theme, constants_1.highContrastVersion))
        : config.highContrast;
    config = merge({}, config, createRootIconConfigObject(hasFolderIcons, theme, ''));
    if (theme.rootFolder) {
        config = setIconDefinitions(config, theme.rootFolder);
        config.light = theme.rootFolder.light
            ? merge({}, config.light, createRootIconConfigObject(hasFolderIcons, theme, constants_1.lightVersion))
            : config.light;
        config.highContrast = theme.rootFolder.highContrast
            ? merge({}, config.highContrast, createRootIconConfigObject(hasFolderIcons, theme, constants_1.highContrastVersion))
            : config.highContrast;
    }
    return config;
};
/**
 * Get the object of the current enabled theme.
 */
const getEnabledFolderTheme = (themes, enabledTheme) => {
    return themes.find((theme) => theme.name === enabledTheme);
};
/**
 * Disable all file icons that are in a pack which is disabled.
 */
const disableIconsByPack = (folderIcons, activatedIconPack) => {
    if (!folderIcons.icons || folderIcons.icons.length === 0) {
        return [];
    }
    return folderIcons.icons.filter((icon) => {
        return !icon.enabledFor
            ? true
            : icon.enabledFor.some((p) => p === activatedIconPack);
    });
};
const setIconDefinitions = (config, icon) => {
    config = merge({}, config);
    config = createIconDefinitions(config, icon.name);
    if (icon.light) {
        config = merge({}, config, createIconDefinitions(config, icon.name, constants_1.lightVersion));
    }
    if (icon.highContrast) {
        config = merge({}, config, createIconDefinitions(config, icon.name, constants_1.highContrastVersion));
    }
    return config;
};
const createIconDefinitions = (config, iconName, appendix = '') => {
    config = merge({}, config);
    const fileConfigHash = fileConfig_1.getFileConfigHash(config.options);
    config.iconDefinitions[iconName + appendix] = {
        iconPath: `${constants_1.iconFolderPath}${iconName}${appendix}${fileConfigHash}.svg`,
    };
    config.iconDefinitions[`${iconName}${constants_1.openedFolder}${appendix}`] = {
        iconPath: `${constants_1.iconFolderPath}${iconName}${constants_1.openedFolder}${appendix}${fileConfigHash}.svg`,
    };
    return config;
};
const setFolderNames = (iconName, folderNames, appendix = '') => {
    const obj = { folderNames: {}, folderNamesExpanded: {} };
    folderNames.forEach((fn) => {
        obj.folderNames[fn] = iconName + appendix;
        obj.folderNamesExpanded[fn] = `${iconName}${constants_1.openedFolder}${appendix}`;
    });
    return obj;
};
const createDefaultIconConfigObject = (hasFolderIcons, theme, appendix = '') => {
    const obj = {
        folder: '',
        folderExpanded: '',
    };
    obj.folder = hasFolderIcons ? theme.defaultIcon.name + appendix : '';
    obj.folderExpanded = hasFolderIcons
        ? `${theme.defaultIcon.name}${constants_1.openedFolder}${appendix}`
        : '';
    return obj;
};
const createRootIconConfigObject = (hasFolderIcons, theme, appendix = '') => {
    const obj = {
        rootFolder: '',
        rootFolderExpanded: '',
    };
    obj.rootFolder = hasFolderIcons
        ? theme.rootFolder
            ? theme.rootFolder.name + appendix
            : theme.defaultIcon.name + appendix
        : '';
    obj.rootFolderExpanded = hasFolderIcons
        ? theme.rootFolder
            ? `${theme.rootFolder.name}${constants_1.openedFolder}${appendix}`
            : `${theme.defaultIcon.name}${constants_1.openedFolder}${appendix}`
        : '';
    return obj;
};
const getCustomIcons = (folderAssociations) => {
    if (!folderAssociations)
        return [];
    const icons = Object.keys(folderAssociations).map((fa) => ({
        // use default folder if icon name is empty
        name: folderAssociations[fa].length > 0
            ? 'folder-' + folderAssociations[fa].toLowerCase()
            : 'folder',
        folderNames: [fa.toLowerCase()],
    }));
    return icons;
};
exports.generateFolderIcons = (color) => {
    if (!exports.validateHEXColorCode(color)) {
        return console.error('Invalid color code for folder icons');
    }
    const folderIcon = 'M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.9-2-2-2h-8l-2-2z';
    const folderIconOpen = 'M19 20H4c-1.11 0-2-.9-2-2V6c0-1.11.89-2 2-2h6l2 2h7a2 2 0 0 1 2 2H4v10l2.14-8h17.07l-2.28 8.5c-.23.87-1.01 1.5-1.93 1.5z';
    const rootFolderIcon = 'M12 20a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 5a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5z';
    const rootFolderIconOpen = 'M12 20a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z';
    writeSVGFiles('folder', getSVG(getPath(folderIcon, color)));
    writeSVGFiles('folder-open', getSVG(getPath(folderIconOpen, color)));
    writeSVGFiles('folder-root', getSVG(getPath(rootFolderIcon, color)));
    writeSVGFiles('folder-root-open', getSVG(getPath(rootFolderIconOpen, color)));
};
const getPath = (d, color) => `<path d="${d}" fill="${color}" />`;
const getSVG = (path) => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
const writeSVGFiles = (iconName, svg) => {
    let iconsPath;
    if (path.basename(__dirname) === 'dist' || path.basename(__dirname) === 'out') {
        iconsPath = path.join(__dirname, '..', 'icons');
    }
    else {
        // executed via script
        iconsPath = path.join(__dirname, '..', '..', '..', 'icons');
    }
    const iconsFolderPath = path.join(iconsPath, `${iconName}.svg`);
    try {
        fs.writeFileSync(iconsFolderPath, svg);
    }
    catch (error) {
        console.error(error);
    }
};
/**
 * Validate the HEX color code
 * @param color HEX code
 */
exports.validateHEXColorCode = (color) => {
    const hexPattern = new RegExp(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
    return color.length > 0 && hexPattern.test(color);
};


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLanguageIconDefinitions = void 0;
const merge = __webpack_require__(10);
const fileConfig_1 = __webpack_require__(12);
const constants_1 = __webpack_require__(29);
/**
 * Get all file icons that can be used in this theme.
 */
exports.loadLanguageIconDefinitions = (languages, config, options) => {
    config = merge({}, config);
    const enabledLanguages = disableLanguagesByPack(languages, options.activeIconPack);
    const customIcons = getCustomIcons(options.languages.associations);
    const allLanguageIcons = [...enabledLanguages, ...customIcons];
    allLanguageIcons.forEach((lang) => {
        if (lang.disabled)
            return;
        config = setIconDefinitions(config, lang.icon);
        config = merge({}, config, setLanguageIdentifiers(lang.icon.name, lang.ids));
        config.light = lang.icon.light
            ? merge({}, config.light, setLanguageIdentifiers(lang.icon.name + constants_1.lightVersion, lang.ids))
            : config.light;
        config.highContrast = lang.icon.highContrast
            ? merge({}, config.highContrast, setLanguageIdentifiers(lang.icon.name + constants_1.highContrastVersion, lang.ids))
            : config.highContrast;
    });
    return config;
};
const setIconDefinitions = (config, icon) => {
    config = merge({}, config);
    config = createIconDefinitions(config, icon.name);
    config = merge({}, config, icon.light
        ? createIconDefinitions(config, icon.name + constants_1.lightVersion)
        : config.light);
    config = merge({}, config, icon.highContrast
        ? createIconDefinitions(config, icon.name + constants_1.highContrastVersion)
        : config.highContrast);
    return config;
};
const createIconDefinitions = (config, iconName) => {
    config = merge({}, config);
    const fileConfigHash = fileConfig_1.getFileConfigHash(config.options);
    config.iconDefinitions[iconName] = {
        iconPath: `${constants_1.iconFolderPath}${iconName}${fileConfigHash}.svg`,
    };
    return config;
};
const setLanguageIdentifiers = (iconName, languageIds) => {
    const obj = { languageIds: {} };
    languageIds.forEach((id) => {
        obj.languageIds[id] = iconName;
    });
    return obj;
};
const getCustomIcons = (languageAssociations) => {
    if (!languageAssociations)
        return [];
    const icons = Object.keys(languageAssociations).map((fa) => ({
        icon: { name: languageAssociations[fa].toLowerCase() },
        ids: [fa.toLowerCase()],
    }));
    return icons;
};
/**
 * Disable all file icons that are in a pack which is disabled.
 */
const disableLanguagesByPack = (languageIcons, activatedIconPack) => {
    return languageIcons.filter((language) => {
        return !language.enabledFor
            ? true
            : language.enabledFor.some((p) => p === activatedIconPack);
    });
};


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultIconOptions = exports.createIconFile = exports.generateIconConfigurationObject = void 0;
const fs = __webpack_require__(5);
const merge = __webpack_require__(10);
const path = __webpack_require__(6);
const customIcons_1 = __webpack_require__(33);
const fileConfig_1 = __webpack_require__(12);
const index_1 = __webpack_require__(13);
const fileIcons_1 = __webpack_require__(34);
const folderIcons_1 = __webpack_require__(35);
const languageIcons_1 = __webpack_require__(36);
const constants_1 = __webpack_require__(29);
const index_2 = __webpack_require__(8);
/**
 * Generate the complete icon configuration object that can be written as JSON file.
 */
exports.generateIconConfigurationObject = (options) => {
    const iconConfig = merge({}, new index_1.IconConfiguration(), { options });
    const languageIconDefinitions = index_2.loadLanguageIconDefinitions(languageIcons_1.languageIcons, iconConfig, options);
    const fileIconDefinitions = index_2.loadFileIconDefinitions(fileIcons_1.fileIcons, iconConfig, options);
    const folderIconDefinitions = index_2.loadFolderIconDefinitions(folderIcons_1.folderIcons, iconConfig, options);
    return merge({}, languageIconDefinitions, fileIconDefinitions, folderIconDefinitions);
};
/**
 * Create the JSON file that is responsible for the icons in the editor.
 * @param updatedConfigs Options that have been changed.
 * @param updatedJSONConfig New JSON options that already include the updatedConfigs.
 */
exports.createIconFile = (updatedConfigs, updatedJSONConfig = {}) => {
    var _a, _b;
    // override the default options with the new options
    const options = merge({}, exports.getDefaultIconOptions(), updatedJSONConfig);
    const json = exports.generateIconConfigurationObject(options);
    // make sure that the folder color, opacity and saturation values are entered correctly
    if ((updatedConfigs === null || updatedConfigs === void 0 ? void 0 : updatedConfigs.opacity) &&
        !index_2.validateOpacityValue(updatedConfigs === null || updatedConfigs === void 0 ? void 0 : updatedConfigs.opacity)) {
        throw Error('Material Icons: Invalid opacity value!');
    }
    if ((updatedConfigs === null || updatedConfigs === void 0 ? void 0 : updatedConfigs.saturation) &&
        !index_2.validateSaturationValue(updatedConfigs === null || updatedConfigs === void 0 ? void 0 : updatedConfigs.saturation)) {
        throw Error('Material Icons: Invalid saturation value!');
    }
    if (((_a = updatedConfigs === null || updatedConfigs === void 0 ? void 0 : updatedConfigs.folders) === null || _a === void 0 ? void 0 : _a.color) &&
        !index_2.validateHEXColorCode((_b = updatedConfigs === null || updatedConfigs === void 0 ? void 0 : updatedConfigs.folders) === null || _b === void 0 ? void 0 : _b.color)) {
        throw Error('Material Icons: Invalid folder color value!');
    }
    try {
        let iconJsonPath = __dirname;
        // if executed via script
        if (path.basename(__dirname) !== 'dist' && path.basename(__dirname) !== 'out') {
            iconJsonPath = path.join(__dirname, '..', '..', '..', 'dist');
        }
        if (!updatedConfigs || (updatedConfigs.folders || {}).color) {
            // if updatedConfigs do not exist (because of initial setup)
            // or new config value was detected by the change detection
            index_2.generateFolderIcons(options.folders.color);
            index_2.setIconOpacity(options, [
                'folder.svg',
                'folder-open.svg',
                'folder-root.svg',
                'folder-root-open.svg',
            ]);
        }
        if (!updatedConfigs || updatedConfigs.opacity !== undefined) {
            index_2.setIconOpacity(options);
        }
        if (!updatedConfigs || updatedConfigs.saturation !== undefined) {
            index_2.setIconSaturation(options);
        }
        renameIconFiles(iconJsonPath, options);
    }
    catch (error) {
        throw Error(error);
    }
    try {
        let iconJsonPath = __dirname;
        // if executed via script
        if (path.basename(__dirname) !== 'dist' && path.basename(__dirname) !== 'out') {
            iconJsonPath = path.join(__dirname, '..', '..', '..', 'dist');
        }
        fs.writeFileSync(path.join(iconJsonPath, constants_1.iconJsonName), JSON.stringify(json, undefined, 2), 'utf-8');
    }
    catch (error) {
        throw Error(error);
    }
    return constants_1.iconJsonName;
};
/**
 * The options control the generator and decide which icons are disabled or not.
 */
exports.getDefaultIconOptions = () => ({
    folders: {
        theme: 'specific',
        color: '#90a4ae',
        associations: {},
    },
    activeIconPack: 'angular',
    hidesExplorerArrows: false,
    opacity: 1,
    saturation: 1,
    files: { associations: {} },
    languages: { associations: {} },
});
/**
 * Rename all icon files according their respective config
 * @param iconJsonPath Path of icon json folder
 * @param options Icon Json Options
 */
const renameIconFiles = (iconJsonPath, options) => {
    const customPaths = customIcons_1.getCustomIconPaths(options);
    const defaultIconPath = path.join(iconJsonPath, '..', 'icons');
    const iconPaths = [defaultIconPath, ...customPaths];
    iconPaths.forEach((iconPath) => {
        fs.readdirSync(iconPath)
            .filter((f) => f.match(/\.svg/gi))
            .forEach((f) => {
            const filePath = path.join(iconPath, f);
            const fileConfigHash = fileConfig_1.getFileConfigHash(options);
            // append file config to file name
            const newFilePath = path.join(iconPath, f.replace(/(^[^\.~]+)(.*)\.svg/, `$1${fileConfigHash}.svg`));
            // if generated files are already in place, do not overwrite them
            if (filePath !== newFilePath && fs.existsSync(newFilePath)) {
                fs.unlinkSync(filePath);
            }
            else {
                fs.renameSync(filePath, newFilePath);
            }
        });
    });
};


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomIconPaths = void 0;
const path = __webpack_require__(6);
exports.getCustomIconPaths = (options) => {
    return Object.values(options.files.associations)
        .filter((v) => v.match(/^[.\/]+/)) // <- custom dirs have a relative path to the dist folder
        .map((v) => path.dirname(path.join(__dirname, v)));
};


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.fileIcons = void 0;
const index_1 = __webpack_require__(13);
/**
 * Defines file icons
 */
exports.fileIcons = {
    defaultIcon: { name: 'file' },
    icons: [
        { name: 'html', fileExtensions: ['htm', 'xhtml', 'html_vm', 'asp'] },
        {
            name: 'pug',
            fileExtensions: ['jade', 'pug'],
            fileNames: ['.pug-lintrc', '.pug-lintrc.js', '.pug-lintrc.json'],
        },
        {
            name: 'markdown',
            fileExtensions: ['md', 'markdown', 'rst'],
        },
        { name: 'blink', fileExtensions: ['blink'], light: true },
        { name: 'css', fileExtensions: ['css'] },
        { name: 'sass', fileExtensions: ['scss', 'sass'] },
        { name: 'less', fileExtensions: ['less'] },
        {
            name: 'json',
            fileExtensions: ['json', 'tsbuildinfo', 'json5', 'jsonl', 'ndjson'],
            fileNames: [
                '.jscsrc',
                '.jshintrc',
                'composer.lock',
                '.jsbeautifyrc',
                '.esformatter',
                'cdp.pid',
                '.mjmlconfig',
            ],
        },
        {
            name: 'jinja',
            fileExtensions: ['jinja', 'jinja2', 'j2', 'jinja-html'],
            light: true,
        },
        {
            name: 'sublime',
            fileExtensions: ['sublime-project', 'sublime-workspace'],
        },
        { name: 'yaml', fileExtensions: ['yaml', 'YAML-tmLanguage', 'yml'] },
        {
            name: 'xml',
            fileExtensions: [
                'xml',
                'plist',
                'xsd',
                'dtd',
                'xsl',
                'xslt',
                'resx',
                'iml',
                'xquery',
                'tmLanguage',
                'manifest',
                'project',
            ],
            fileNames: ['.htaccess'],
        },
        {
            name: 'image',
            fileExtensions: [
                'png',
                'jpeg',
                'jpg',
                'gif',
                'ico',
                'tif',
                'tiff',
                'psd',
                'psb',
                'ami',
                'apx',
                'bmp',
                'bpg',
                'brk',
                'cur',
                'dds',
                'dng',
                'exr',
                'fpx',
                'gbr',
                'img',
                'jbig2',
                'jb2',
                'jng',
                'jxr',
                'pbm',
                'pgf',
                'pic',
                'raw',
                'webp',
                'eps',
                'afphoto',
                'ase',
                'aseprite',
                'clip',
                'cpt',
                'heif',
                'heic',
                'kra',
                'mdp',
                'ora',
                'pdn',
                'reb',
                'sai',
                'tga',
                'xcf',
            ],
        },
        { name: 'javascript', fileExtensions: ['js', 'esx', 'mjs'] },
        { name: 'react', fileExtensions: ['jsx'] },
        { name: 'react_ts', fileExtensions: ['tsx'] },
        {
            name: 'routing',
            fileExtensions: [
                'routing.ts',
                'routing.tsx',
                'routing.js',
                'routing.jsx',
                'routes.ts',
                'routes.tsx',
                'routes.js',
                'routes.jsx',
            ],
            fileNames: [
                'router.js',
                'router.jsx',
                'router.ts',
                'router.tsx',
                'routes.js',
                'routes.jsx',
                'routes.ts',
                'routes.tsx',
            ],
            enabledFor: [
                index_1.IconPack.Angular,
                index_1.IconPack.Ngrx,
                index_1.IconPack.React,
                index_1.IconPack.Redux,
                index_1.IconPack.Vue,
                index_1.IconPack.Vuex,
            ],
        },
        {
            name: 'redux-action',
            fileExtensions: ['action.js', 'actions.js', 'action.ts', 'actions.ts'],
            fileNames: ['action.js', 'actions.js', 'action.ts', 'actions.ts'],
            enabledFor: [index_1.IconPack.Redux],
        },
        {
            name: 'redux-reducer',
            fileExtensions: [
                'reducer.js',
                'reducers.js',
                'reducer.ts',
                'reducers.ts',
            ],
            fileNames: ['reducer.js', 'reducers.js', 'reducer.ts', 'reducers.ts'],
            enabledFor: [index_1.IconPack.Redux],
        },
        {
            name: 'redux-store',
            fileExtensions: ['store.js', 'store.ts'],
            fileNames: ['store.js', 'store.ts'],
            enabledFor: [index_1.IconPack.Redux],
        },
        {
            name: 'settings',
            fileExtensions: [
                'ini',
                'dlc',
                'dll',
                'config',
                'conf',
                'properties',
                'prop',
                'settings',
                'option',
                'props',
                'toml',
                'prefs',
                'sln.dotsettings',
                'sln.dotsettings.user',
                'cfg',
            ],
            fileNames: [
                '.jshintignore',
                '.buildignore',
                '.mrconfig',
                '.yardopts',
                'manifest.mf',
                '.clang-format',
                '.clang-tidy',
            ],
        },
        { name: 'typescript', fileExtensions: ['ts'] },
        { name: 'typescript-def', fileExtensions: ['d.ts'] },
        { name: 'markojs', fileExtensions: ['marko'] },
        { name: 'pdf', fileExtensions: ['pdf'] },
        { name: 'table', fileExtensions: ['xlsx', 'xls', 'csv', 'tsv'] },
        {
            name: 'vscode',
            fileExtensions: [
                'vscodeignore',
                'vsixmanifest',
                'vsix',
                'code-workplace',
            ],
        },
        {
            name: 'visualstudio',
            fileExtensions: [
                'csproj',
                'ruleset',
                'sln',
                'suo',
                'vb',
                'vbs',
                'vcxitems',
                'vcxitems.filters',
                'vcxproj',
                'vcxproj.filters',
            ],
        },
        {
            name: 'database',
            fileExtensions: [
                'pdb',
                'sql',
                'pks',
                'pkb',
                'accdb',
                'mdb',
                'sqlite',
                'pgsql',
                'postgres',
                'psql',
            ],
        },
        { name: 'csharp', fileExtensions: ['cs', 'csx'] },
        { name: 'qsharp', fileExtensions: ['qs'] },
        {
            name: 'zip',
            fileExtensions: [
                'zip',
                'tar',
                'gz',
                'xz',
                'br',
                'bzip2',
                'gzip',
                'brotli',
                '7z',
                'rar',
                'tgz',
            ],
        },
        { name: 'vala', fileExtensions: ['vala'] },
        { name: 'zig', fileExtensions: ['zig'] },
        { name: 'exe', fileExtensions: ['exe', 'msi'] },
        { name: 'java', fileExtensions: ['java', 'jar', 'jsp'] },
        { name: 'c', fileExtensions: ['c', 'm', 'i', 'mi'] },
        { name: 'h', fileExtensions: ['h'] },
        {
            name: 'cpp',
            fileExtensions: ['cc', 'cpp', 'cxx', 'c++', 'cp', 'mm', 'mii', 'ii'],
        },
        {
            name: 'hpp',
            fileExtensions: ['hh', 'hpp', 'hxx', 'h++', 'hp', 'tcc', 'inl'],
        },
        { name: 'go', fileExtensions: ['go'] },
        { name: 'go-mod', fileNames: ['go.mod', 'go.sum'] },
        { name: 'python', fileExtensions: ['py'] },
        {
            name: 'python-misc',
            fileExtensions: ['pyc', 'whl'],
            fileNames: [
                'requirements.txt',
                'pipfile',
                '.python-version',
                'manifest.in',
            ],
        },
        { name: 'url', fileExtensions: ['url'] },
        {
            name: 'console',
            fileExtensions: [
                'sh',
                'ksh',
                'csh',
                'tcsh',
                'zsh',
                'bash',
                'bat',
                'cmd',
                'awk',
                'fish',
            ],
        },
        {
            name: 'powershell',
            fileExtensions: ['ps1', 'psm1', 'psd1', 'ps1xml', 'psc1', 'pssc'],
        },
        {
            name: 'gradle',
            fileExtensions: ['gradle'],
            fileNames: ['gradle.properties', 'gradlew', 'gradle-wrapper.properties'],
        },
        { name: 'word', fileExtensions: ['doc', 'docx', 'rtf'] },
        {
            name: 'certificate',
            fileExtensions: ['cer', 'cert', 'crt'],
            fileNames: [
                'license',
                'license.md',
                'license.txt',
                'licence',
                'licence.md',
                'licence.txt',
                'unlicense',
                'unlicense.md',
                'unlicense.txt',
            ],
        },
        {
            name: 'key',
            fileExtensions: ['pub', 'key', 'pem', 'asc', 'gpg', 'passwd'],
            fileNames: ['.htpasswd'],
        },
        {
            name: 'font',
            fileExtensions: [
                'woff',
                'woff2',
                'ttf',
                'eot',
                'suit',
                'otf',
                'bmap',
                'fnt',
                'odttf',
                'ttc',
                'font',
                'fonts',
                'sui',
                'ntf',
                'mrf',
            ],
        },
        { name: 'lib', fileExtensions: ['lib', 'bib'] },
        { name: 'ruby', fileExtensions: ['rb', 'erb'] },
        { name: 'gemfile', fileNames: ['gemfile'] },
        { name: 'fsharp', fileExtensions: ['fs', 'fsx', 'fsi', 'fsproj'] },
        { name: 'swift', fileExtensions: ['swift'] },
        { name: 'arduino', fileExtensions: ['ino'] },
        {
            name: 'docker',
            fileExtensions: ['dockerignore', 'dockerfile'],
            fileNames: [
                'dockerfile',
                'dockerfile.prod',
                'dockerfile.production',
                'docker-compose.yml',
                'docker-compose.yaml',
                'docker-compose.dev.yml',
                'docker-compose.local.yml',
                'docker-compose.ci.yml',
                'docker-compose.override.yml',
                'docker-compose.staging.yml',
                'docker-compose.prod.yml',
                'docker-compose.production.yml',
                'docker-compose.test.yml',
            ],
        },
        { name: 'tex', fileExtensions: ['tex', 'sty', 'dtx', 'ltx'] },
        {
            name: 'powerpoint',
            fileExtensions: [
                'pptx',
                'ppt',
                'pptm',
                'potx',
                'potm',
                'ppsx',
                'ppsm',
                'pps',
                'ppam',
                'ppa',
            ],
        },
        {
            name: 'video',
            fileExtensions: [
                'webm',
                'mkv',
                'flv',
                'vob',
                'ogv',
                'ogg',
                'gifv',
                'avi',
                'mov',
                'qt',
                'wmv',
                'yuv',
                'rm',
                'rmvb',
                'mp4',
                'm4v',
                'mpg',
                'mp2',
                'mpeg',
                'mpe',
                'mpv',
                'm2v',
            ],
        },
        { name: 'virtual', fileExtensions: ['vdi', 'vbox', 'vbox-prev'] },
        { name: 'email', fileExtensions: ['ics'], fileNames: ['.mailmap'] },
        { name: 'audio', fileExtensions: ['mp3', 'flac', 'm4a', 'wma', 'aiff'] },
        { name: 'coffee', fileExtensions: ['coffee', 'cson', 'iced'] },
        { name: 'document', fileExtensions: ['txt'] },
        {
            name: 'graphql',
            fileExtensions: ['graphql', 'gql'],
            fileNames: ['.graphqlconfig'],
        },
        { name: 'rust', fileExtensions: ['rs'] },
        { name: 'raml', fileExtensions: ['raml'] },
        { name: 'xaml', fileExtensions: ['xaml'] },
        { name: 'haskell', fileExtensions: ['hs'] },
        { name: 'kotlin', fileExtensions: ['kt', 'kts'] },
        {
            name: 'git',
            fileExtensions: ['patch'],
            fileNames: [
                '.gitignore',
                '.gitconfig',
                '.gitattributes',
                '.gitmodules',
                '.gitkeep',
                'git-history',
            ],
        },
        { name: 'lua', fileExtensions: ['lua'], fileNames: ['.luacheckrc'] },
        { name: 'clojure', fileExtensions: ['clj', 'cljs', 'cljc'] },
        { name: 'groovy', fileExtensions: ['groovy'] },
        { name: 'r', fileExtensions: ['r', 'rmd'], fileNames: ['.Rhistory'] },
        { name: 'dart', fileExtensions: ['dart'] },
        { name: 'actionscript', fileExtensions: ['as'] },
        { name: 'mxml', fileExtensions: ['mxml'] },
        { name: 'autohotkey', fileExtensions: ['ahk'] },
        { name: 'flash', fileExtensions: ['swf'] },
        { name: 'swc', fileExtensions: ['swc'] },
        {
            name: 'cmake',
            fileExtensions: ['cmake'],
            fileNames: ['cmakelists.txt', 'cmakecache.txt'],
        },
        {
            name: 'assembly',
            fileExtensions: [
                'asm',
                'a51',
                'inc',
                'nasm',
                's',
                'ms',
                'agc',
                'ags',
                'aea',
                'argus',
                'mitigus',
                'binsource',
            ],
        },
        { name: 'vue', fileExtensions: ['vue'] },
        { name: 'vue-config', fileNames: ['vue.config.js', 'vue.config.ts'] },
        {
            name: 'vuex-store',
            fileExtensions: ['store.js', 'store.ts'],
            fileNames: ['store.js', 'store.ts'],
            enabledFor: [index_1.IconPack.Vuex],
        },
        { name: 'nuxt', fileNames: ['nuxt.config.js', 'nuxt.config.ts'] },
        { name: 'ocaml', fileExtensions: ['ml', 'mli', 'cmx'] },
        { name: 'javascript-map', fileExtensions: ['js.map', 'mjs.map'] },
        { name: 'css-map', fileExtensions: ['css.map'] },
        {
            name: 'lock',
            fileExtensions: ['lock'],
            fileNames: ['security.md', 'security.txt', 'security'],
        },
        { name: 'handlebars', fileExtensions: ['hbs', 'mustache'] },
        { name: 'perl', fileExtensions: ['pm', 'raku'] },
        { name: 'haxe', fileExtensions: ['hx'] },
        {
            name: 'test-ts',
            fileExtensions: ['spec.ts', 'e2e-spec.ts', 'test.ts', 'ts.snap'],
        },
        {
            name: 'test-jsx',
            fileExtensions: [
                'spec.tsx',
                'test.tsx',
                'tsx.snap',
                'spec.jsx',
                'test.jsx',
                'jsx.snap',
            ],
        },
        {
            name: 'test-js',
            fileExtensions: ['spec.js', 'e2e-spec.js', 'test.js', 'js.snap'],
        },
        {
            name: 'angular',
            fileExtensions: ['module.ts', 'module.js', 'ng-template'],
            fileNames: ['angular-cli.json', '.angular-cli.json', 'angular.json'],
            enabledFor: [index_1.IconPack.Angular, index_1.IconPack.Ngrx],
        },
        {
            name: 'angular-component',
            fileExtensions: ['component.ts', 'component.js'],
            enabledFor: [index_1.IconPack.Angular, index_1.IconPack.Ngrx],
        },
        {
            name: 'angular-guard',
            fileExtensions: ['guard.ts', 'guard.js'],
            enabledFor: [index_1.IconPack.Angular, index_1.IconPack.Ngrx],
        },
        {
            name: 'angular-service',
            fileExtensions: ['service.ts', 'service.js'],
            enabledFor: [index_1.IconPack.Angular, index_1.IconPack.Ngrx],
        },
        {
            name: 'angular-pipe',
            fileExtensions: ['pipe.ts', 'pipe.js', 'filter.js'],
            enabledFor: [index_1.IconPack.Angular, index_1.IconPack.Ngrx],
        },
        {
            name: 'angular-directive',
            fileExtensions: ['directive.ts', 'directive.js'],
            enabledFor: [index_1.IconPack.Angular, index_1.IconPack.Ngrx],
        },
        {
            name: 'angular-resolver',
            fileExtensions: ['resolver.ts', 'resolver.js'],
            enabledFor: [index_1.IconPack.Angular, index_1.IconPack.Ngrx],
        },
        { name: 'puppet', fileExtensions: ['pp'] },
        { name: 'elixir', fileExtensions: ['ex', 'exs', 'eex', 'leex'] },
        { name: 'livescript', fileExtensions: ['ls'] },
        { name: 'erlang', fileExtensions: ['erl'] },
        { name: 'twig', fileExtensions: ['twig'] },
        { name: 'julia', fileExtensions: ['jl'] },
        { name: 'elm', fileExtensions: ['elm'] },
        { name: 'purescript', fileExtensions: ['pure', 'purs'] },
        { name: 'smarty', fileExtensions: ['tpl'] },
        { name: 'stylus', fileExtensions: ['styl'] },
        { name: 'reason', fileExtensions: ['re', 'rei'] },
        { name: 'bucklescript', fileExtensions: ['cmj'] },
        { name: 'merlin', fileExtensions: ['merlin'] },
        { name: 'verilog', fileExtensions: ['v', 'vhd', 'sv', 'svh'] },
        { name: 'mathematica', fileExtensions: ['nb'] },
        { name: 'wolframlanguage', fileExtensions: ['wl', 'wls'] },
        { name: 'nunjucks', fileExtensions: ['njk', 'nunjucks'] },
        { name: 'robot', fileExtensions: ['robot'] },
        { name: 'solidity', fileExtensions: ['sol'] },
        { name: 'autoit', fileExtensions: ['au3'] },
        { name: 'haml', fileExtensions: ['haml'] },
        { name: 'yang', fileExtensions: ['yang'] },
        { name: 'mjml', fileExtensions: ['mjml'] },
        {
            name: 'vercel',
            fileNames: ['vercel.json', '.vercelignore', 'now.json', '.nowignore'],
            light: true,
        },
        {
            name: 'terraform',
            fileExtensions: ['tf', 'tf.json', 'tfvars', 'tfstate'],
        },
        { name: 'laravel', fileExtensions: ['blade.php', 'inky.php'] },
        { name: 'applescript', fileExtensions: ['applescript', 'ipa'] },
        { name: 'cake', fileExtensions: ['cake'] },
        { name: 'cucumber', fileExtensions: ['feature'] },
        { name: 'nim', fileExtensions: ['nim', 'nimble'] },
        { name: 'apiblueprint', fileExtensions: ['apib', 'apiblueprint'] },
        { name: 'riot', fileExtensions: ['riot', 'tag'] },
        { name: 'vfl', fileExtensions: ['vfl'], fileNames: ['.vfl'] },
        { name: 'kl', fileExtensions: ['kl'], fileNames: ['.kl'] },
        {
            name: 'postcss',
            fileExtensions: ['pcss', 'sss'],
            fileNames: [
                'postcss.config.js',
                '.postcssrc.js',
                '.postcssrc',
                '.postcssrc.json',
                '.postcssrc.yml',
            ],
        },
        { name: 'todo', fileExtensions: ['todo'] },
        { name: 'coldfusion', fileExtensions: ['cfml', 'cfc', 'lucee', 'cfm'] },
        { name: 'cabal', fileExtensions: ['cabal'] },
        { name: 'nix', fileExtensions: ['nix'] },
        { name: 'slim', fileExtensions: ['slim'] },
        { name: 'http', fileExtensions: ['http', 'rest'], fileNames: ['CNAME'] },
        { name: 'restql', fileExtensions: ['rql', 'restql'] },
        { name: 'kivy', fileExtensions: ['kv'] },
        {
            name: 'graphcool',
            fileExtensions: ['graphcool'],
            fileNames: ['project.graphcool'],
        },
        { name: 'sbt', fileExtensions: ['sbt'] },
        {
            name: 'webpack',
            fileNames: [
                'webpack.js',
                'webpack.ts',
                'webpack.base.js',
                'webpack.base.ts',
                'webpack.config.js',
                'webpack.config.ts',
                'webpack.common.js',
                'webpack.common.ts',
                'webpack.config.common.js',
                'webpack.config.common.ts',
                'webpack.config.common.babel.js',
                'webpack.config.common.babel.ts',
                'webpack.dev.js',
                'webpack.dev.ts',
                'webpack.development.js',
                'webpack.development.ts',
                'webpack.config.dev.js',
                'webpack.config.dev.ts',
                'webpack.config.dev.babel.js',
                'webpack.config.dev.babel.ts',
                'webpack.prod.js',
                'webpack.prod.ts',
                'webpack.production.js',
                'webpack.production.ts',
                'webpack.server.js',
                'webpack.server.ts',
                'webpack.client.js',
                'webpack.client.ts',
                'webpack.config.server.js',
                'webpack.config.server.ts',
                'webpack.config.client.js',
                'webpack.config.client.ts',
                'webpack.config.production.babel.js',
                'webpack.config.production.babel.ts',
                'webpack.config.prod.babel.js',
                'webpack.config.prod.babel.ts',
                'webpack.config.prod.js',
                'webpack.config.prod.ts',
                'webpack.config.production.js',
                'webpack.config.production.ts',
                'webpack.config.staging.js',
                'webpack.config.staging.ts',
                'webpack.config.babel.js',
                'webpack.config.babel.ts',
                'webpack.config.base.babel.js',
                'webpack.config.base.babel.ts',
                'webpack.config.base.js',
                'webpack.config.base.ts',
                'webpack.config.staging.babel.js',
                'webpack.config.staging.babel.ts',
                'webpack.config.coffee',
                'webpack.config.test.js',
                'webpack.config.test.ts',
                'webpack.config.vendor.js',
                'webpack.config.vendor.ts',
                'webpack.config.vendor.production.js',
                'webpack.config.vendor.production.ts',
                'webpack.test.js',
                'webpack.test.ts',
                'webpack.dist.js',
                'webpack.dist.ts',
                'webpackfile.js',
                'webpackfile.ts',
            ],
        },
        { name: 'ionic', fileNames: ['ionic.config.json', '.io-config.json'] },
        {
            name: 'gulp',
            fileNames: [
                'gulpfile.js',
                'gulpfile.mjs',
                'gulpfile.ts',
                'gulpfile.babel.js',
            ],
        },
        {
            name: 'nodejs',
            fileNames: [
                'package.json',
                'package-lock.json',
                '.nvmrc',
                '.esmrc',
                '.node-version',
            ],
        },
        { name: 'npm', fileNames: ['.npmignore', '.npmrc'] },
        {
            name: 'yarn',
            fileNames: [
                '.yarnrc',
                'yarn.lock',
                '.yarnclean',
                '.yarn-integrity',
                'yarn-error.log',
                '.yarnrc.yml',
                '.yarnrc.yaml',
            ],
        },
        {
            name: 'android',
            fileNames: ['androidmanifest.xml'],
            fileExtensions: ['apk'],
        },
        {
            name: 'tune',
            fileExtensions: ['env'],
            fileNames: [
                '.env.defaults',
                '.env.example',
                '.env.sample',
                '.env.schema',
                '.env.local',
                '.env.dev',
                '.env.development',
                '.env.qa',
                '.env.prod',
                '.env.production',
                '.env.staging',
                '.env.preview',
                '.env.test',
                '.env.testing',
                '.env.development.local',
                '.env.qa.local',
                '.env.production.local',
                '.env.staging.local',
                '.env.test.local',
            ],
        },
        {
            name: 'babel',
            fileNames: [
                '.babelrc',
                '.babelrc.js',
                '.babelrc.json',
                'babel.config.json',
                'babel.config.js',
            ],
        },
        {
            name: 'contributing',
            fileNames: ['contributing.md'],
        },
        { name: 'readme', fileNames: ['readme.md', 'readme.txt', 'readme'] },
        {
            name: 'changelog',
            fileNames: [
                'changelog',
                'changelog.md',
                'changelog.txt',
                'changes',
                'changes.md',
                'changes.txt',
            ],
        },
        {
            name: 'credits',
            fileNames: ['credits', 'credits.txt', 'credits.md'],
        },
        {
            name: 'authors',
            fileNames: ['authors', 'authors.md', 'authors.txt'],
        },
        { name: 'flow', fileNames: ['.flowconfig'] },
        { name: 'favicon', fileNames: ['favicon.ico'] },
        {
            name: 'karma',
            fileNames: [
                'karma.conf.js',
                'karma.conf.ts',
                'karma.conf.coffee',
                'karma.config.js',
                'karma.config.ts',
                'karma-main.js',
                'karma-main.ts',
            ],
        },
        { name: 'bithound', fileNames: ['.bithoundrc'] },
        { name: 'appveyor', fileNames: ['.appveyor.yml', 'appveyor.yml'] },
        { name: 'travis', fileNames: ['.travis.yml'] },
        { name: 'codecov', fileNames: ['.codecov.yml', 'codecov.yml'] },
        {
            name: 'protractor',
            fileNames: [
                'protractor.conf.js',
                'protractor.conf.ts',
                'protractor.conf.coffee',
                'protractor.config.js',
                'protractor.config.ts',
            ],
        },
        { name: 'fusebox', fileNames: ['fuse.js'] },
        { name: 'heroku', fileNames: ['procfile', 'procfile.windows'] },
        { name: 'editorconfig', fileNames: ['.editorconfig'] },
        { name: 'gitlab', fileExtensions: ['gitlab-ci.yml'] },
        { name: 'bower', fileNames: ['.bowerrc', 'bower.json'] },
        {
            name: 'eslint',
            fileNames: [
                '.eslintrc.js',
                '.eslintrc.cjs',
                '.eslintrc.yaml',
                '.eslintrc.yml',
                '.eslintrc.json',
                '.eslintrc',
                '.eslintignore',
                '.eslintcache',
            ],
        },
        {
            name: 'conduct',
            fileNames: ['code_of_conduct.md', 'code_of_conduct.txt'],
        },
        { name: 'watchman', fileNames: ['.watchmanconfig'] },
        { name: 'aurelia', fileNames: ['aurelia.json'] },
        {
            name: 'mocha',
            fileNames: [
                'mocha.opts',
                '.mocharc.yml',
                '.mocharc.yaml',
                '.mocharc.js',
                '.mocharc.json',
                '.mocharc.jsonc',
            ],
        },
        {
            name: 'jenkins',
            fileNames: ['jenkinsfile'],
            fileExtensions: ['jenkinsfile', 'jenkins'],
        },
        {
            name: 'firebase',
            fileNames: [
                'firebase.json',
                '.firebaserc',
                'firestore.rules',
                'firestore.indexes.json',
            ],
        },
        {
            name: 'rollup',
            fileNames: [
                'rollup.config.js',
                'rollup.config.ts',
                'rollup-config.js',
                'rollup-config.ts',
                'rollup.config.common.js',
                'rollup.config.common.ts',
                'rollup.config.base.js',
                'rollup.config.base.ts',
                'rollup.config.prod.js',
                'rollup.config.prod.ts',
                'rollup.config.dev.js',
                'rollup.config.dev.ts',
                'rollup.config.prod.vendor.js',
                'rollup.config.prod.vendor.ts',
            ],
        },
        { name: 'hack', fileNames: ['.hhconfig'] },
        {
            name: 'stylelint',
            fileNames: [
                '.stylelintrc',
                'stylelint.config.js',
                '.stylelintrc.json',
                '.stylelintrc.yaml',
                '.stylelintrc.yml',
                '.stylelintrc.js',
                '.stylelintignore',
            ],
            light: true,
        },
        { name: 'code-climate', fileNames: ['.codeclimate.yml'], light: true },
        {
            name: 'prettier',
            fileNames: [
                '.prettierrc',
                'prettier.config.js',
                '.prettierrc.js',
                '.prettierrc.json',
                '.prettierrc.yaml',
                '.prettierrc.yml',
                '.prettierignore',
            ],
        },
        { name: 'apollo', fileNames: ['apollo.config.js'] },
        { name: 'nodemon', fileNames: ['nodemon.json', 'nodemon-debug.json'] },
        {
            name: 'ngrx-reducer',
            fileExtensions: ['reducer.ts', 'rootReducer.ts'],
            enabledFor: [index_1.IconPack.Ngrx],
        },
        {
            name: 'ngrx-state',
            fileExtensions: ['state.ts'],
            enabledFor: [index_1.IconPack.Ngrx],
        },
        {
            name: 'ngrx-actions',
            fileExtensions: ['actions.ts'],
            enabledFor: [index_1.IconPack.Ngrx],
        },
        {
            name: 'ngrx-effects',
            fileExtensions: ['effects.ts'],
            enabledFor: [index_1.IconPack.Ngrx],
        },
        {
            name: 'ngrx-entity',
            fileNames: ['.entity'],
            enabledFor: [index_1.IconPack.Ngrx],
        },
        { name: 'webhint', fileNames: ['.hintrc'] },
        {
            name: 'browserlist',
            fileNames: ['browserslist', '.browserslistrc'],
            light: true,
        },
        { name: 'crystal', fileExtensions: ['cr', 'ecr'], light: true },
        { name: 'snyk', fileNames: ['.snyk'] },
        {
            name: 'drone',
            fileExtensions: ['drone.yml'],
            fileNames: ['.drone.yml'],
            light: true,
        },
        { name: 'cuda', fileExtensions: ['cu', 'cuh'] },
        { name: 'log', fileExtensions: ['log'] },
        { name: 'dotjs', fileExtensions: ['def', 'dot', 'jst'] },
        { name: 'ejs', fileExtensions: ['ejs'] },
        { name: 'sequelize', fileNames: ['.sequelizerc'] },
        {
            name: 'gatsby',
            fileNames: [
                'gatsby.config.js',
                'gatsby-config.js',
                'gatsby-node.js',
                'gatsby-browser.js',
                'gatsby-ssr.js',
            ],
        },
        {
            name: 'wakatime',
            fileNames: ['.wakatime-project'],
            fileExtensions: ['.wakatime-project'],
            light: true,
        },
        { name: 'circleci', fileNames: ['circle.yml'], light: true },
        { name: 'cloudfoundry', fileNames: ['.cfignore'] },
        {
            name: 'grunt',
            fileNames: [
                'gruntfile.js',
                'gruntfile.ts',
                'gruntfile.coffee',
                'gruntfile.babel.js',
                'gruntfile.babel.ts',
                'gruntfile.babel.coffee',
            ],
        },
        {
            name: 'jest',
            fileNames: [
                'jest.config.js',
                'jest.config.ts',
                'jest.config.cjs',
                'jest.config.mjs',
                'jest.config.json',
                'jest.e2e.config.js',
                'jest.e2e.config.ts',
                'jest.e2e.config.cjs',
                'jest.e2e.config.mjs',
                'jest.e2e.config.json',
                'jest.setup.js',
                'jest.setup.ts',
                'jest.json',
                '.jestrc',
                '.jestrc.js',
                '.jestrc.json',
                'jest.teardown.js',
            ],
        },
        { name: 'processing', fileExtensions: ['pde'], light: true },
        {
            name: 'storybook',
            fileExtensions: [
                'stories.js',
                'stories.jsx',
                'story.js',
                'story.jsx',
                'stories.ts',
                'stories.tsx',
                'story.ts',
                'story.tsx',
            ],
        },
        { name: 'wepy', fileExtensions: ['wpy'] },
        { name: 'fastlane', fileNames: ['fastfile', 'appfile'] },
        { name: 'hcl', fileExtensions: ['hcl'], light: true },
        { name: 'helm', fileNames: ['.helmignore'] },
        { name: 'san', fileExtensions: ['san'] },
        { name: 'wallaby', fileNames: ['wallaby.js', 'wallaby.conf.js'] },
        { name: 'django', fileExtensions: ['djt'] },
        { name: 'stencil', fileNames: ['stencil.config.js', 'stencil.config.ts'] },
        { name: 'red', fileExtensions: ['red'] },
        { name: 'makefile', fileNames: ['makefile'] },
        { name: 'foxpro', fileExtensions: ['fxp', 'prg'] },
        { name: 'i18n', fileExtensions: ['pot', 'po', 'mo'] },
        { name: 'webassembly', fileExtensions: ['wat', 'wasm'] },
        {
            name: 'semantic-release',
            light: true,
            fileNames: [
                '.releaserc',
                '.releaserc.yaml',
                '.releaserc.yml',
                '.releaserc.json',
                '.releaserc.js',
                'release.config.js',
            ],
        },
        {
            name: 'bitbucket',
            fileNames: ['bitbucket-pipelines.yaml', 'bitbucket-pipelines.yml'],
        },
        { name: 'jupyter', fileExtensions: ['ipynb'] },
        { name: 'd', fileExtensions: ['d'] },
        { name: 'mdx', fileExtensions: ['mdx'] },
        { name: 'ballerina', fileExtensions: ['bal', 'balx'] },
        { name: 'racket', fileExtensions: ['rkt'] },
        {
            name: 'bazel',
            fileExtensions: ['bzl', 'bazel'],
            fileNames: ['.bazelignore', '.bazelrc'],
        },
        { name: 'mint', fileExtensions: ['mint'] },
        { name: 'velocity', fileExtensions: ['vm', 'fhtml', 'vtl'] },
        { name: 'godot', fileExtensions: ['gd'] },
        { name: 'godot-assets', fileExtensions: ['godot', 'tres', 'tscn'] },
        {
            name: 'azure-pipelines',
            fileNames: ['azure-pipelines.yml', 'azure-pipelines.yaml'],
            fileExtensions: ['azure-pipelines.yml', 'azure-pipelines.yaml'],
        },
        { name: 'azure', fileExtensions: ['azcli'] },
        {
            name: 'vagrant',
            fileNames: ['vagrantfile'],
            fileExtensions: ['vagrantfile'],
        },
        { name: 'prisma', fileNames: ['prisma.yml'], fileExtensions: ['prisma'] },
        { name: 'razor', fileExtensions: ['cshtml', 'vbhtml'] },
        { name: 'abc', fileExtensions: ['abc'] },
        { name: 'asciidoc', fileExtensions: ['ad', 'adoc', 'asciidoc'] },
        { name: 'istanbul', fileNames: ['.nycrc', '.nycrc.json'] },
        { name: 'edge', fileExtensions: ['edge'] },
        { name: 'scheme', fileExtensions: ['ss', 'scm'] },
        { name: 'lisp', fileExtensions: ['lisp', 'lsp', 'cl', 'fast'] },
        { name: 'tailwindcss', fileNames: ['tailwind.js', 'tailwind.config.js'] },
        {
            name: '3d',
            fileExtensions: [
                'stl',
                'obj',
                'ac',
                'blend',
                'mesh',
                'mqo',
                'pmd',
                'pmx',
                'skp',
                'vac',
                'vdp',
                'vox',
            ],
        },
        { name: 'buildkite', fileNames: ['buildkite.yml', 'buildkite.yaml'] },
        {
            name: 'netlify',
            fileNames: [
                'netlify.json',
                'netlify.yml',
                'netlify.yaml',
                'netlify.toml',
            ],
        },
        { name: 'svg', fileExtensions: ['svg'] },
        {
            name: 'svelte',
            fileExtensions: ['svelte'],
            fileNames: ['svelte.config.js'],
        },
        { name: 'vim', fileExtensions: ['vimrc', 'gvimrc', 'exrc'] },
        {
            name: 'nest',
            fileNames: [
                'nest-cli.json',
                '.nest-cli.json',
                'nestconfig.json',
                '.nestconfig.json',
            ],
        },
        {
            name: 'nest-controller',
            fileExtensions: ['controller.ts', 'controller.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-middleware',
            fileExtensions: ['middleware.ts', 'middleware.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-module',
            fileExtensions: ['module.ts', 'module.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-service',
            fileExtensions: ['service.ts', 'service.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-decorator',
            fileExtensions: ['decorator.ts', 'decorator.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-pipe',
            fileExtensions: ['pipe.ts', 'pipe.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-filter',
            fileExtensions: ['filter.ts', 'filter.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-gateway',
            fileExtensions: ['gateway.ts', 'gateway.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-guard',
            fileExtensions: ['guard.ts', 'guard.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        {
            name: 'nest-resolver',
            fileExtensions: ['resolver.ts', 'resolver.js'],
            enabledFor: [index_1.IconPack.Nest],
        },
        { name: 'moonscript', fileExtensions: ['moon'] },
        { name: 'percy', fileNames: ['.percy.yml'] },
        { name: 'gitpod', fileNames: ['.gitpod.yml'] },
        { name: 'advpl_prw', fileExtensions: ['prw', 'prx'] },
        { name: 'advpl_ptm', fileExtensions: ['ptm'] },
        { name: 'advpl_tlpp', fileExtensions: ['tlpp'] },
        { name: 'advpl_include', fileExtensions: ['ch'] },
        { name: 'codeowners', fileNames: ['codeowners'] },
        { name: 'gcp', fileNames: ['.gcloudignore'] },
        { name: 'disc', fileExtensions: ['iso'] },
        {
            name: 'fortran',
            fileExtensions: ['f', 'f77', 'f90', 'f95', 'f03', 'f08'],
        },
        { name: 'tcl', fileExtensions: ['tcl'] },
        { name: 'liquid', fileExtensions: ['liquid'] },
        { name: 'prolog', fileExtensions: ['p', 'pro'] },
        {
            name: 'husky',
            fileNames: [
                '.huskyrc',
                'husky.config.js',
                '.huskyrc.json',
                '.huskyrc.js',
                '.huskyrc.yaml',
                '.huskyrc.yml',
            ],
        },
        { name: 'coconut', fileExtensions: ['coco'] },
        { name: 'tilt', fileNames: ['tiltfile'] },
        { name: 'capacitor', fileNames: ['capacitor.config.json'] },
        { name: 'sketch', fileExtensions: ['sketch'] },
        { name: 'pawn', fileExtensions: ['pwn', 'amx'] },
        { name: 'adonis', fileNames: ['.adonisrc.json', 'ace'] },
        { name: 'forth', fileExtensions: ['4th', 'fth', 'frt'] },
        {
            name: 'uml',
            fileExtensions: ['iuml', 'pu', 'puml', 'plantuml', 'wsd'],
            light: true,
        },
        { name: 'meson', fileNames: ['meson.build'] },
        {
            name: 'commitlint',
            fileNames: [
                '.commitlintrc',
                '.commitlintrc.js',
                'commitlint.config.js',
                '.commitlintrc.json',
                '.commitlint.yaml',
                '.commitlint.yml',
            ],
        },
        { name: 'buck', fileNames: ['.buckconfig'] },
        { name: 'dhall', fileExtensions: ['dhall', 'dhallb'] },
        {
            name: 'sml',
            fileExtensions: [
                'sml',
                'mlton',
                'mlb',
                'sig',
                'fun',
                'cm',
                'lex',
                'use',
                'grm',
            ],
        },
        { name: 'nrwl', fileNames: ['nx.json'] },
        { name: 'opam', fileExtensions: ['opam'] },
        { name: 'dune', fileNames: ['dune', 'dune-project'] },
        { name: 'imba', fileExtensions: ['imba'] },
        { name: 'drawio', fileExtensions: ['drawio', 'dio'] },
        { name: 'pascal', fileExtensions: ['pas'] },
        { name: 'shaderlab', fileExtensions: ['unity'] },
        {
            name: 'roadmap',
            fileNames: [
                'roadmap.md',
                'roadmap.txt',
                'timeline.md',
                'timeline.txt',
                'milestones.md',
                'milestones.txt',
            ],
        },
        {
            name: 'sas',
            fileExtensions: ['sas', 'sas7bdat', 'sashdat', 'astore', 'ast', 'sast'],
        },
        {
            name: 'nuget',
            fileNames: ['nuget.config', '.nuspec', 'nuget.exe'],
            fileExtensions: ['nupkg'],
        },
        { name: 'command', fileExtensions: ['command'] },
        { name: 'stryker', fileNames: ['stryker.conf.js', 'stryker.conf.json'] },
        { name: 'denizenscript', fileExtensions: ['dsc'] },
        {
            name: 'modernizr',
            fileNames: ['.modernizrrc', '.modernizrrc.js', '.modernizrrc.json'],
        },
        { name: 'slug', fileNames: ['.slugignore'] },
        { name: 'search', fileExtensions: ['code-search'] },
        { name: 'nginx', fileNames: ['nginx.conf'] },
    ],
};


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.folderIcons = void 0;
const index_1 = __webpack_require__(13);
/**
 * Defines folder icons
 */
exports.folderIcons = [
    {
        name: 'specific',
        defaultIcon: { name: 'folder' },
        rootFolder: { name: 'folder-root' },
        icons: [
            { name: 'folder-src', folderNames: ['src', 'source', 'sources', 'code'] },
            {
                name: 'folder-dist',
                folderNames: ['dist', 'out', 'build', 'release', 'bin'],
            },
            {
                name: 'folder-css',
                folderNames: ['css', 'stylesheet', 'stylesheets', 'style', 'styles'],
            },
            { name: 'folder-sass', folderNames: ['sass', '_sass', 'scss', '_scss'] },
            {
                name: 'folder-images',
                folderNames: [
                    'images',
                    'image',
                    'img',
                    'icons',
                    'icon',
                    'ico',
                    'screenshot',
                    'screenshots',
                ],
            },
            { name: 'folder-scripts', folderNames: ['script', 'scripts'] },
            { name: 'folder-node', folderNames: ['node_modules'] },
            {
                name: 'folder-javascript',
                folderNames: ['js', 'javascript', 'javascripts'],
            },
            { name: 'folder-json', folderNames: ['json'] },
            { name: 'folder-font', folderNames: ['font', 'fonts'] },
            { name: 'folder-bower', folderNames: ['bower_components'] },
            {
                name: 'folder-test',
                folderNames: [
                    'test',
                    'tests',
                    'testing',
                    '__tests__',
                    '__snapshots__',
                    '__mocks__',
                    '__test__',
                    'spec',
                    'specs',
                ],
            },
            {
                name: 'folder-jinja',
                folderNames: ['jinja', 'jinja2', 'j2'],
                light: true,
            },
            { name: 'folder-markdown', folderNames: ['markdown', 'md'] },
            { name: 'folder-php', folderNames: ['php'] },
            { name: 'folder-phpmailer', folderNames: ['phpmailer'] },
            { name: 'folder-sublime', folderNames: ['sublime'] },
            {
                name: 'folder-docs',
                folderNames: [
                    'doc',
                    'docs',
                    'documents',
                    'documentation',
                    'post',
                    'posts',
                ],
            },
            {
                name: 'folder-git',
                folderNames: [
                    '.git',
                    'githooks',
                    '.githooks',
                    'submodules',
                    '.submodules',
                ],
            },
            { name: 'folder-github', folderNames: ['.github'] },
            { name: 'folder-gitlab', folderNames: ['.gitlab'] },
            { name: 'folder-vscode', folderNames: ['.vscode', '.vscode-test'] },
            {
                name: 'folder-views',
                folderNames: [
                    'view',
                    'views',
                    'screen',
                    'screens',
                    'page',
                    'pages',
                    'html',
                ],
            },
            { name: 'folder-vue', folderNames: ['vue'] },
            { name: 'folder-expo', folderNames: ['.expo', '.expo-shared'] },
            {
                name: 'folder-config',
                folderNames: [
                    'config',
                    'configs',
                    'configuration',
                    'configurations',
                    'setting',
                    '.setting',
                    'settings',
                    '.settings',
                    'META-INF',
                ],
            },
            {
                name: 'folder-i18n',
                folderNames: [
                    'i18n',
                    'internationalization',
                    'lang',
                    'language',
                    'languages',
                    'locale',
                    'locales',
                    'l10n',
                    'localization',
                    'translation',
                    'translate',
                    'translations',
                    '.tx',
                ],
            },
            {
                name: 'folder-components',
                folderNames: ['components', 'widget', 'widgets'],
            },
            { name: 'folder-aurelia', folderNames: ['aurelia_project'] },
            {
                name: 'folder-resource',
                folderNames: [
                    'resource',
                    'resources',
                    'res',
                    'asset',
                    'assets',
                    'static',
                    'report',
                    'reports',
                ],
            },
            {
                name: 'folder-lib',
                folderNames: [
                    'lib',
                    'libs',
                    'library',
                    'libraries',
                    'vendor',
                    'vendors',
                    'third-party',
                ],
            },
            {
                name: 'folder-theme',
                folderNames: [
                    'themes',
                    'theme',
                    'color',
                    'colors',
                    'design',
                    'designs',
                ],
            },
            { name: 'folder-webpack', folderNames: ['webpack', '.webpack'] },
            { name: 'folder-global', folderNames: ['global'] },
            {
                name: 'folder-public',
                folderNames: ['public', 'www', 'wwwroot', 'web', 'website'],
            },
            {
                name: 'folder-include',
                folderNames: ['include', 'includes', '_includes'],
            },
            {
                name: 'folder-docker',
                folderNames: ['docker', 'dockerfiles', '.docker'],
            },
            {
                name: 'folder-ngrx-effects',
                folderNames: ['effects'],
                enabledFor: [index_1.IconPack.Ngrx],
            },
            {
                name: 'folder-ngrx-store',
                folderNames: ['store'],
                enabledFor: [index_1.IconPack.Ngrx],
            },
            {
                name: 'folder-ngrx-state',
                folderNames: ['states', 'state'],
                enabledFor: [index_1.IconPack.Ngrx],
            },
            {
                name: 'folder-ngrx-reducer',
                folderNames: ['reducers', 'reducer'],
                enabledFor: [index_1.IconPack.Ngrx],
            },
            {
                name: 'folder-ngrx-actions',
                folderNames: ['actions'],
                enabledFor: [index_1.IconPack.Ngrx],
            },
            {
                name: 'folder-ngrx-entities',
                folderNames: ['entities'],
                enabledFor: [index_1.IconPack.Ngrx],
            },
            {
                name: 'folder-redux-reducer',
                folderNames: ['reducers', 'reducer'],
                enabledFor: [index_1.IconPack.Redux],
            },
            {
                name: 'folder-redux-actions',
                folderNames: ['actions'],
                enabledFor: [index_1.IconPack.Redux],
            },
            {
                name: 'folder-redux-store',
                folderNames: ['store'],
                enabledFor: [index_1.IconPack.Redux],
            },
            {
                name: 'folder-react-components',
                folderNames: ['components'],
                enabledFor: [index_1.IconPack.React, index_1.IconPack.Redux],
            },
            {
                name: 'folder-database',
                folderNames: ['db', 'database', 'databases', 'sql', 'data', '_data'],
            },
            { name: 'folder-log', folderNames: ['log', 'logs'] },
            {
                name: 'folder-temp',
                folderNames: [
                    'temp',
                    '.temp',
                    'tmp',
                    '.tmp',
                    'cached',
                    'cache',
                    '.cache',
                ],
            },
            { name: 'folder-aws', folderNames: ['aws', '.aws'] },
            {
                name: 'folder-audio',
                folderNames: ['audio', 'audios', 'music', 'sound', 'sounds'],
            },
            {
                name: 'folder-video',
                folderNames: ['video', 'videos', 'movie', 'movies'],
            },
            { name: 'folder-kubernetes', folderNames: ['kubernetes', 'k8s'] },
            { name: 'folder-import', folderNames: ['import', 'imports', 'imported'] },
            { name: 'folder-export', folderNames: ['export', 'exports', 'exported'] },
            { name: 'folder-wakatime', folderNames: ['wakatime'] },
            { name: 'folder-circleci', folderNames: ['.circleci'] },
            { name: 'folder-wordpress', folderNames: ['wp-content'] },
            { name: 'folder-gradle', folderNames: ['gradle', '.gradle'] },
            {
                name: 'folder-coverage',
                folderNames: [
                    'coverage',
                    '.nyc-output',
                    '.nyc_output',
                    'e2e',
                    'it',
                    'integration-test',
                    'integration-tests',
                ],
            },
            {
                name: 'folder-class',
                folderNames: ['class', 'classes', 'model', 'models'],
            },
            {
                name: 'folder-other',
                folderNames: [
                    'other',
                    'others',
                    'misc',
                    'miscellaneous',
                    'extra',
                    'extras',
                ],
            },
            {
                name: 'folder-typescript',
                folderNames: ['typescript', 'ts', 'typings', '@types'],
            },
            { name: 'folder-graphql', folderNames: ['graphql', 'gql'] },
            { name: 'folder-routes', folderNames: ['routes', 'router', 'routers'] },
            { name: 'folder-ci', folderNames: ['.ci', 'ci'] },
            {
                name: 'folder-benchmark',
                folderNames: [
                    'benchmark',
                    'benchmarks',
                    'performance',
                    'measure',
                    'measures',
                    'measurement',
                ],
            },
            {
                name: 'folder-messages',
                folderNames: [
                    'messages',
                    'forum',
                    'chat',
                    'chats',
                    'conversation',
                    'conversations',
                ],
            },
            { name: 'folder-less', folderNames: ['less'] },
            {
                name: 'folder-python',
                folderNames: ['python', '__pycache__', '.pytest_cache'],
            },
            { name: 'folder-debug', folderNames: ['debug', 'debugging'] },
            { name: 'folder-fastlane', folderNames: ['fastlane'] },
            {
                name: 'folder-plugin',
                folderNames: [
                    'plugin',
                    'plugins',
                    '_plugins',
                    'extension',
                    'extensions',
                    'addon',
                    'addons',
                ],
            },
            { name: 'folder-middleware', folderNames: ['middleware', 'middlewares'] },
            {
                name: 'folder-controller',
                folderNames: [
                    'controller',
                    'controllers',
                    'service',
                    'services',
                    'provider',
                    'providers',
                ],
            },
            { name: 'folder-ansible', folderNames: ['ansible'] },
            { name: 'folder-server', folderNames: ['server', 'servers', 'backend'] },
            { name: 'folder-client', folderNames: ['client', 'clients', 'frontend'] },
            { name: 'folder-tasks', folderNames: ['tasks', 'tickets'] },
            { name: 'folder-android', folderNames: ['android'] },
            { name: 'folder-ios', folderNames: ['ios'] },
            { name: 'folder-upload', folderNames: ['uploads', 'upload'] },
            { name: 'folder-download', folderNames: ['downloads', 'download'] },
            { name: 'folder-tools', folderNames: ['tools'] },
            { name: 'folder-helper', folderNames: ['helpers', 'helper'] },
            { name: 'folder-serverless', folderNames: ['.serverless', 'serverless'] },
            { name: 'folder-api', folderNames: ['api', 'apis'] },
            { name: 'folder-app', folderNames: ['app', 'apps'] },
            {
                name: 'folder-apollo',
                folderNames: [
                    'apollo',
                    'apollo-client',
                    'apollo-cache',
                    'apollo-config',
                ],
            },
            {
                name: 'folder-archive',
                folderNames: [
                    'archive',
                    'archives',
                    'archival',
                    'backup',
                    'backups',
                    'back-up',
                    'back-ups',
                ],
            },
            { name: 'folder-batch', folderNames: ['batch', 'batchs', 'batches'] },
            { name: 'folder-cluster', folderNames: ['cluster', 'clusters'] },
            {
                name: 'folder-command',
                folderNames: ['command', 'commands', 'cli', 'clis'],
            },
            { name: 'folder-constant', folderNames: ['constant', 'constants'] },
            {
                name: 'folder-container',
                folderNames: ['container', 'containers', '.devcontainer'],
            },
            { name: 'folder-content', folderNames: ['content', 'contents'] },
            { name: 'folder-core', folderNames: ['core'] },
            { name: 'folder-delta', folderNames: ['delta', 'deltas', 'changes'] },
            { name: 'folder-dump', folderNames: ['dump', 'dumps'] },
            {
                name: 'folder-examples',
                folderNames: [
                    'example',
                    'examples',
                    'sample',
                    'samples',
                    'demo',
                    'demos',
                ],
            },
            {
                name: 'folder-environment',
                folderNames: [
                    '.env',
                    '.environment',
                    'env',
                    'environment',
                    'environments',
                ],
            },
            {
                name: 'folder-functions',
                folderNames: [
                    'function',
                    'functions',
                    'lambda',
                    'lambdas',
                    'logic',
                    'math',
                    'calc',
                    'calculation',
                    'calculations',
                ],
            },
            {
                name: 'folder-generator',
                folderNames: [
                    'generator',
                    'generators',
                    'generated',
                    'cfn-gen',
                    'gen',
                    'gens',
                    'auto',
                ],
            },
            {
                name: 'folder-hook',
                folderNames: ['hook', 'hooks', 'trigger', 'triggers'],
            },
            { name: 'folder-job', folderNames: ['job', 'jobs'] },
            { name: 'folder-keys', folderNames: ['keys', 'key', 'token', 'tokens'] },
            { name: 'folder-layout', folderNames: ['layout', 'layouts'] },
            {
                name: 'folder-mail',
                folderNames: ['mail', 'mails', 'email', 'emails', 'smtp'],
            },
            { name: 'folder-mappings', folderNames: ['mappings', 'mapping'] },
            { name: 'folder-meta', folderNames: ['meta'] },
            { name: 'folder-packages', folderNames: ['package', 'packages'] },
            { name: 'folder-shared', folderNames: ['shared', 'common'] },
            { name: 'folder-stack', folderNames: ['stack', 'stacks'] },
            { name: 'folder-template', folderNames: ['template', 'templates'] },
            {
                name: 'folder-utils',
                folderNames: ['util', 'utils', 'utility', 'utilities'],
            },
            { name: 'folder-private', folderNames: ['private', '.private'] },
            { name: 'folder-error', folderNames: ['error', 'errors', 'err'] },
            { name: 'folder-event', folderNames: ['event', 'events'] },
            {
                name: 'folder-secure',
                folderNames: [
                    'auth',
                    'authentication',
                    'secure',
                    'security',
                    'cert',
                    'certs',
                    'certificate',
                    'certificates',
                    'ssl',
                ],
            },
            { name: 'folder-custom', folderNames: ['custom', 'customs'] },
            {
                name: 'folder-mock',
                folderNames: [
                    'mock',
                    'mocks',
                    'draft',
                    'drafts',
                    'concept',
                    'concepts',
                    'sketch',
                    'sketches',
                ],
            },
            {
                name: 'folder-syntax',
                folderNames: ['syntax', 'syntaxes', 'spellcheck'],
            },
            { name: 'folder-vm', folderNames: ['vm', 'vms'] },
            { name: 'folder-stylus', folderNames: ['stylus'] },
            { name: 'folder-flow', folderNames: ['flow-typed'] },
            {
                name: 'folder-rules',
                folderNames: [
                    'rule',
                    'rules',
                    'validation',
                    'validations',
                    'validator',
                    'validators',
                ],
            },
            {
                name: 'folder-review',
                folderNames: ['review', 'reviews', 'revisal', 'revisals', 'reviewed'],
            },
            {
                name: 'folder-animation',
                folderNames: ['animation', 'animations', 'animated'],
            },
            { name: 'folder-guard', folderNames: ['guard', 'guards'] },
            { name: 'folder-prisma', folderNames: ['prisma'] },
            { name: 'folder-pipe', folderNames: ['pipe', 'pipes'] },
            { name: 'folder-svg', folderNames: ['svg', 'svgs'] },
            {
                name: 'folder-vuex-store',
                folderNames: ['store'],
                enabledFor: [index_1.IconPack.Vuex],
            },
            {
                name: 'folder-nuxt',
                folderNames: ['nuxt', '.nuxt'],
                enabledFor: [index_1.IconPack.Vuex, index_1.IconPack.Vue],
            },
            {
                name: 'folder-vue-directives',
                folderNames: ['directives'],
                enabledFor: [index_1.IconPack.Vuex, index_1.IconPack.Vue],
            },
            {
                name: 'folder-vue',
                folderNames: ['components'],
                enabledFor: [index_1.IconPack.Vuex, index_1.IconPack.Vue],
            },
            { name: 'folder-terraform', folderNames: ['terraform'] },
            {
                name: 'folder-mobile',
                folderNames: ['mobile', 'mobiles', 'portable', 'portability'],
            },
            { name: 'folder-stencil', folderNames: ['.stencil'] },
            { name: 'folder-firebase', folderNames: ['.firebase'] },
            { name: 'folder-svelte', folderNames: ['svelte'] },
            {
                name: 'folder-update',
                folderNames: ['update', 'updates', 'upgrade', 'upgrades'],
            },
            { name: 'folder-intellij', folderNames: ['.idea'], light: true },
            {
                name: 'folder-azure-pipelines',
                folderNames: ['.azure-pipelines', '.azure-pipelines-ci'],
            },
            { name: 'folder-mjml', folderNames: ['mjml'] },
        ],
    },
    {
        name: 'classic',
        defaultIcon: { name: 'folder' },
        rootFolder: { name: 'folder-root' },
    },
    { name: 'none', defaultIcon: { name: '' } },
];


/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.languageIcons = void 0;
/**
 * Defines icons for language ids
 */
exports.languageIcons = [
    { icon: { name: 'git' }, ids: ['git', 'git-commit', 'git-rebase', 'ignore'] },
    { icon: { name: 'c' }, ids: ['c', 'objective-c', 'objective-cpp'] },
    { icon: { name: 'yaml' }, ids: ['yaml'] },
    { icon: { name: 'xml' }, ids: ['xml', 'xquery', 'xsl'] },
    { icon: { name: 'matlab' }, ids: ['matlab'] },
    {
        icon: { name: 'settings' },
        ids: ['makefile', 'toml', 'ini', 'properties'],
    },
    { icon: { name: 'shaderlab' }, ids: ['shaderlab'] },
    { icon: { name: 'diff' }, ids: ['diff'] },
    { icon: { name: 'json' }, ids: ['json', 'jsonc', 'json5'] },
    { icon: { name: 'blink' }, ids: ['blink'] },
    { icon: { name: 'java' }, ids: ['java'] },
    { icon: { name: 'razor' }, ids: ['razor', 'aspnetcorerazor'] },
    { icon: { name: 'python' }, ids: ['python'] },
    { icon: { name: 'javascript' }, ids: ['javascript'] },
    { icon: { name: 'typescript' }, ids: ['typescript'] },
    { icon: { name: 'scala' }, ids: ['scala'] },
    { icon: { name: 'handlebars' }, ids: ['handlebars'] },
    { icon: { name: 'perl' }, ids: ['perl', 'perl6'] },
    { icon: { name: 'haxe' }, ids: ['haxe', 'hxml'] },
    { icon: { name: 'puppet' }, ids: ['puppet'] },
    { icon: { name: 'elixir' }, ids: ['elixir'] },
    { icon: { name: 'livescript' }, ids: ['livescript'] },
    { icon: { name: 'erlang' }, ids: ['erlang'] },
    { icon: { name: 'twig' }, ids: ['twig'] },
    { icon: { name: 'julia' }, ids: ['julia'] },
    { icon: { name: 'elm' }, ids: ['elm'] },
    { icon: { name: 'purescript' }, ids: ['purescript'] },
    { icon: { name: 'stylus' }, ids: ['stylus'] },
    { icon: { name: 'nunjucks' }, ids: ['nunjucks'] },
    { icon: { name: 'pug' }, ids: ['pug'] },
    { icon: { name: 'robot' }, ids: ['robotframework'] },
    { icon: { name: 'sass' }, ids: ['sass', 'scss'] },
    { icon: { name: 'less' }, ids: ['less'] },
    { icon: { name: 'css' }, ids: ['css'] },
    { icon: { name: 'visualstudio' }, ids: ['testOutput', 'vb'] },
    { icon: { name: 'angular' }, ids: ['ng-template'] },
    { icon: { name: 'graphql' }, ids: ['graphql'] },
    { icon: { name: 'solidity' }, ids: ['solidity'] },
    { icon: { name: 'autoit' }, ids: ['autoit'] },
    { icon: { name: 'haml' }, ids: ['haml'] },
    { icon: { name: 'yang' }, ids: ['yang'] },
    { icon: { name: 'terraform' }, ids: ['terraform'] },
    { icon: { name: 'applescript' }, ids: ['applescript'] },
    { icon: { name: 'cake' }, ids: ['cake'] },
    { icon: { name: 'cucumber' }, ids: ['cucumber'] },
    { icon: { name: 'nim' }, ids: ['nim', 'nimble'] },
    { icon: { name: 'apiblueprint' }, ids: ['apiblueprint'] },
    { icon: { name: 'riot' }, ids: ['riot'] },
    { icon: { name: 'postcss' }, ids: ['postcss'] },
    { icon: { name: 'coldfusion' }, ids: ['lang-cfml'] },
    { icon: { name: 'haskell' }, ids: ['haskell'] },
    { icon: { name: 'dhall' }, ids: ['dhall'] },
    { icon: { name: 'cabal' }, ids: ['cabal'] },
    { icon: { name: 'nix' }, ids: ['nix'] },
    { icon: { name: 'ruby' }, ids: ['ruby'] },
    { icon: { name: 'slim' }, ids: ['slim'] },
    { icon: { name: 'php' }, ids: ['php'] },
    { icon: { name: 'php_elephant' }, ids: [] },
    { icon: { name: 'hack' }, ids: ['hack'] },
    { icon: { name: 'react' }, ids: ['javascriptreact'] },
    { icon: { name: 'mjml' }, ids: ['mjml'] },
    { icon: { name: 'processing' }, ids: ['processing'] },
    { icon: { name: 'hcl' }, ids: ['hcl'] },
    { icon: { name: 'go' }, ids: ['go'] },
    { icon: { name: 'go_gopher' }, ids: [] },
    { icon: { name: 'nodejs_alt' }, ids: [] },
    { icon: { name: 'django' }, ids: ['django-html', 'django-txt'] },
    { icon: { name: 'html' }, ids: ['html'] },
    { icon: { name: 'godot' }, ids: ['gdscript'] },
    { icon: { name: 'vim' }, ids: ['viml'] },
    { icon: { name: 'silverstripe' }, ids: [] },
    { icon: { name: 'prolog' }, ids: ['prolog'] },
    { icon: { name: 'pawn' }, ids: ['pawn'] },
    { icon: { name: 'reason' }, ids: ['reason', 'reason_lisp'] },
    { icon: { name: 'sml' }, ids: ['sml'] },
    { icon: { name: 'tex' }, ids: ['tex', 'doctex', 'latex', 'latex-expl3'] },
    { icon: { name: 'salesforce' }, ids: ['apex'] },
    { icon: { name: 'sas' }, ids: ['sas'] },
    { icon: { name: 'docker' }, ids: ['dockerfile'] },
    { icon: { name: 'table' }, ids: ['csv', 'tsv'] },
    { icon: { name: 'csharp' }, ids: ['csharp'] },
    { icon: { name: 'console' }, ids: ['bat', 'awk', 'shellscript'] },
    { icon: { name: 'cpp' }, ids: ['cpp'] },
    { icon: { name: 'coffee' }, ids: ['coffeescript'] },
    { icon: { name: 'fsharp' }, ids: ['fsharp'] },
    { icon: { name: 'editorconfig' }, ids: ['editorconfig'] },
    { icon: { name: 'clojure' }, ids: ['clojure'] },
    { icon: { name: 'groovy' }, ids: ['groovy'] },
    { icon: { name: 'markdown' }, ids: ['markdown'] },
    { icon: { name: 'jinja' }, ids: ['jinja'] },
    { icon: { name: 'python-misc' }, ids: ['pip-requirements'] },
    { icon: { name: 'vue' }, ids: ['vue', 'vue-postcss', 'vue-html'] },
    { icon: { name: 'lua' }, ids: ['lua'] },
    { icon: { name: 'lib' }, ids: ['bibtex', 'bibtex-style'] },
    { icon: { name: 'log' }, ids: ['log'] },
    { icon: { name: 'jupyter' }, ids: ['jupyter'] },
    { icon: { name: 'document' }, ids: ['plaintext'] },
    { icon: { name: 'pdf' }, ids: ['pdf'] },
    { icon: { name: 'powershell' }, ids: ['powershell'] },
    { icon: { name: 'pug' }, ids: ['jade'] },
    { icon: { name: 'r' }, ids: ['r', 'rsweave'] },
    { icon: { name: 'rust' }, ids: ['rust'] },
    { icon: { name: 'database' }, ids: ['sql'] },
    { icon: { name: 'lock' }, ids: ['ssh_config'] },
    { icon: { name: 'svg' }, ids: ['svg'] },
    { icon: { name: 'swift' }, ids: ['swift'] },
    { icon: { name: 'react_ts' }, ids: ['typescriptreact'] },
    { icon: { name: 'search' }, ids: ['search-result'] },
];


/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOpacityValue = exports.setIconOpacity = void 0;
const fs = __webpack_require__(5);
const path = __webpack_require__(6);
const customIcons_1 = __webpack_require__(33);
/**
 * Changes the opacity of all icons in the set.
 * @param options Icon JSON options which include the opacity value.
 * @param fileNames Only change the opacity of certain file names.
 */
exports.setIconOpacity = (options, fileNames) => {
    if (!exports.validateOpacityValue(options.opacity)) {
        return console.error('Invalid opacity value! Opacity must be a decimal number between 0 and 1!');
    }
    let iconsPath;
    if (path.basename(__dirname) === 'dist' || path.basename(__dirname) === 'out') {
        iconsPath = path.join(__dirname, '..', 'icons');
    }
    else {
        // executed via script
        iconsPath = path.join(__dirname, '..', '..', '..', 'icons');
    }
    const customIconPaths = customIcons_1.getCustomIconPaths(options);
    const iconFiles = fs.readdirSync(iconsPath);
    try {
        // read all icon files from the icons folder
        (fileNames || iconFiles).forEach(adjustOpacity(iconsPath, options));
        customIconPaths.forEach((iconPath) => {
            const customIcons = fs.readdirSync(iconPath);
            customIcons.forEach(adjustOpacity(iconPath, options));
        });
    }
    catch (error) {
        console.error(error);
    }
};
/**
 * Validate the opacity value.
 * @param opacity Opacity value
 */
exports.validateOpacityValue = (opacity) => {
    return opacity !== undefined && opacity <= 1 && opacity >= 0;
};
/**
 * Get the SVG root element.
 * @param svg SVG file as string.
 */
const getSVGRootElement = (svg) => {
    const result = new RegExp(/<svg[^>]*>/).exec(svg);
    return result === null || result === void 0 ? void 0 : result[0];
};
/**
 * Add an opacity attribute to the SVG icon to control the opacity of the icon.
 * @param svgRoot Root element of the SVG icon.
 * @param opacity Opacity value.
 */
const addOpacityAttribute = (svgRoot, opacity) => {
    const pattern = new RegExp(/\sopacity="[\d.]+"/);
    // if the opacity attribute already exists
    if (pattern.test(svgRoot)) {
        return svgRoot.replace(pattern, ` opacity="${opacity}"`);
    }
    else {
        return svgRoot.replace(/^<svg/, `<svg opacity="${opacity}"`);
    }
};
/**
 * Remove the opacity attribute of the SVG icon.
 * @param svgRoot Root element of the SVG icon.
 */
const removeOpacityAttribute = (svgRoot) => {
    const pattern = new RegExp(/\sopacity="[\d.]+"/);
    return svgRoot.replace(pattern, '');
};
const adjustOpacity = (iconPath, options) => {
    return (iconFileName) => {
        const svgFilePath = path.join(iconPath, iconFileName);
        // Read SVG file
        const svg = fs.readFileSync(svgFilePath, 'utf-8');
        // Get the root element of the SVG file
        const svgRootElement = getSVGRootElement(svg);
        if (!svgRootElement)
            return;
        let updatedRootElement;
        if (options.opacity < 1) {
            updatedRootElement = addOpacityAttribute(svgRootElement, options.opacity);
        }
        else {
            updatedRootElement = removeOpacityAttribute(svgRootElement);
        }
        const updatedSVG = svg.replace(/<svg[^>]*>/, updatedRootElement);
        fs.writeFileSync(svgFilePath, updatedSVG);
    };
};


/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSaturationValue = exports.setIconSaturation = void 0;
const fs = __webpack_require__(5);
const path = __webpack_require__(6);
const customIcons_1 = __webpack_require__(33);
/**
 * Changes saturation of all icons in the set.
 * @param options Icon JSON options which include the saturation value.
 * @param fileNames Only change the saturation of certain file names.
 */
exports.setIconSaturation = (options, fileNames) => {
    if (!exports.validateSaturationValue(options.saturation)) {
        return console.error('Invalid saturation value! Saturation must be a decimal number between 0 and 1!');
    }
    let iconsPath;
    if (path.basename(__dirname) === 'dist' || path.basename(__dirname) === 'out') {
        iconsPath = path.join(__dirname, '..', 'icons');
    }
    else {
        // executed via script
        iconsPath = path.join(__dirname, '..', '..', '..', 'icons');
    }
    const customIconPaths = customIcons_1.getCustomIconPaths(options);
    const iconFiles = fs.readdirSync(iconsPath);
    // read all icon files from the icons folder
    try {
        (fileNames || iconFiles).forEach(adjustSaturation(iconsPath, options));
        customIconPaths.forEach((iconPath) => {
            const customIcons = fs.readdirSync(iconPath);
            customIcons.forEach(adjustSaturation(iconPath, options));
        });
    }
    catch (error) {
        console.error(error);
    }
};
/**
 * Get the SVG root element.
 * @param svg SVG file as string.
 */
const getSVGRootElement = (svg) => {
    const result = new RegExp(/<svg[^>]*>/).exec(svg);
    return result === null || result === void 0 ? void 0 : result[0];
};
/**
 * Add an filter attribute to the SVG icon.
 * @param svgRoot Root element of the SVG icon.
 */
const addFilterAttribute = (svgRoot) => {
    const pattern = new RegExp(/\sfilter="[^"]+?"/);
    // if the filter attribute already exists
    if (pattern.test(svgRoot)) {
        return svgRoot.replace(pattern, ' filter="url(#saturation)"');
    }
    else {
        return svgRoot.replace(/^<svg/, '<svg filter="url(#saturation)"');
    }
};
/**
 * Remove the filter attribute of the SVG icon.
 * @param svgRoot Root element of the SVG icon.
 */
const removeFilterAttribute = (svgRoot) => {
    const pattern = new RegExp(/\sfilter="[^"]+?"/);
    return svgRoot.replace(pattern, '');
};
/**
 * Add filter element to the SVG icon.
 * @param svg SVG file as string.
 */
const addFilterElement = (svg, value) => {
    const pattern = new RegExp(/<filter id="saturation".+<\/filter>(.*<\/svg>)/);
    const filterElement = `<filter id="saturation"><feColorMatrix type="saturate" values="${value}"/></filter>`;
    if (pattern.test(svg)) {
        return svg.replace(pattern, `${filterElement}$1`);
    }
    else {
        return svg.replace(/<\/svg>/, `${filterElement}</svg>`);
    }
};
/**
 * Remove filter element from the SVG icon.
 * @param svg SVG file as string.
 */
const removeFilterElement = (svg) => {
    const pattern = new RegExp(/<filter id="saturation".+<\/filter>(.*<\/svg>)/);
    return svg.replace(pattern, '$1');
};
/**
 * Validate the saturation value.
 * @param saturation Saturation value
 */
exports.validateSaturationValue = (saturation) => {
    return saturation !== undefined && saturation <= 1 && saturation >= 0;
};
const adjustSaturation = (iconsPath, options) => {
    return (iconFileName) => {
        const svgFilePath = path.join(iconsPath, iconFileName);
        // Read SVG file
        const svg = fs.readFileSync(svgFilePath, 'utf-8');
        // Get the root element of the SVG file
        const svgRootElement = getSVGRootElement(svg);
        if (!svgRootElement)
            return;
        let updatedRootElement;
        if (options.saturation < 1) {
            updatedRootElement = addFilterAttribute(svgRootElement);
        }
        else {
            updatedRootElement = removeFilterAttribute(svgRootElement);
        }
        let updatedSVG = svg.replace(/<svg[^>]*>/, updatedRootElement);
        if (options.saturation < 1) {
            updatedSVG = addFilterElement(updatedSVG, options.saturation);
        }
        else {
            updatedSVG = removeFilterElement(updatedSVG);
        }
        fs.writeFileSync(svgFilePath, updatedSVG);
    };
};


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showConfirmToReloadMessage = void 0;
const vscode = __webpack_require__(1);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** User has to confirm if he wants to reload the editor */
exports.showConfirmToReloadMessage = () => __awaiter(void 0, void 0, void 0, function* () {
    // if the user does not want to see the reload message
    if (helpers.getThemeConfig('showReloadMessage').globalValue === false)
        return;
    const response = yield vscode.window.showInformationMessage(i18n.translate('confirmReload'), i18n.translate('reload'), i18n.translate('neverShowAgain'));
    switch (response) {
        case i18n.translate('reload'):
            return true;
        case i18n.translate('neverShowAgain'):
            disableReloadMessage();
            return false;
        default:
            return false;
    }
});
/** Disable the reload message in the global settings */
const disableReloadMessage = () => {
    helpers.setThemeConfig('showReloadMessage', false, true);
};


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replace = exports.translate = exports.getTranslationValue = exports.initTranslations = exports.getCurrentLanguage = void 0;
const vscode = __webpack_require__(1);
const objects_1 = __webpack_require__(41);
// Get current language of the vs code workspace
exports.getCurrentLanguage = () => vscode.env.language;
let currentTranslation;
let fallbackTranslation; // default: en
const placeholder = '%';
/** Initialize the translations */
exports.initTranslations = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        currentTranslation = yield loadTranslation(exports.getCurrentLanguage());
        fallbackTranslation = yield loadTranslation('en');
    }
    catch (error) {
        console.error(error);
    }
});
/** Load the required translation */
const loadTranslation = (language) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield getTranslationObject(language);
    }
    catch (error) {
        return yield getTranslationObject('en');
    }
});
/** Get the translation object of the separated translation files */
const getTranslationObject = (language) => __awaiter(void 0, void 0, void 0, function* () {
    const lang = yield Promise.resolve().then(() => __webpack_require__(42)(`./lang-${language}`));
    return lang.translation;
});
/**
 * We look up the matching translation in the translation files.
 * If we cannot find a matching key in the file we use the fallback.
 * With optional parameters you can configure both the translations
 * and the fallback (required for testing purposes).
 * */
exports.getTranslationValue = (key, translations = currentTranslation, fallback = fallbackTranslation) => {
    return (objects_1.getObjectPropertyValue(translations, key) ||
        objects_1.getObjectPropertyValue(fallback, key) ||
        undefined);
};
/**
 * The instant method is required for the translate pipe.
 * It helps to translate a word instantly.
 */
exports.translate = (key, words) => {
    const translation = exports.getTranslationValue(key);
    if (!words)
        return translation;
    return exports.replace(translation, words);
};
/**
 * The replace function will replace the current placeholder with the
 * data parameter from the translation. You can give it one or more optional
 * parameters ('words').
 */
exports.replace = (value = '', words) => {
    let translation = value;
    const values = [].concat(words);
    values.forEach((e, i) => {
        translation = translation.replace(placeholder.concat(i), e);
    });
    return translation;
};


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.setObjectPropertyValue = exports.getObjectPropertyValue = void 0;
/**
 * Get the nested properties of an object.
 * This solution is lighter than the lodash get-version.
 * Source: http://stackoverflow.com/a/6491621/6942210
 */
exports.getObjectPropertyValue = (obj, path) => {
    const pathArray = path
        .replace(/\[(\w+)\]/g, '.$1') // convert indexes to properties
        .replace(/^\./, '') // strip a leading dot
        .split('.'); // separate paths in array
    /** Avoid errors in the getValue function. */
    const isObject = (object) => {
        return object === Object(object);
    };
    let result = JSON.parse(JSON.stringify(obj));
    for (let i = 0; i < pathArray.length; ++i) {
        const k = pathArray[i];
        if (isObject(result) && k in result) {
            result = result[k];
        }
        else {
            return;
        }
    }
    return result;
};
/**
 * Set a value for a nested object property.
 * @param obj Object
 * @param path Properties as string e.g. `'a.b.c'`
 * @param value Value to be set for the given property
 * Source: https://stackoverflow.com/a/13719799/6942210
 */
exports.setObjectPropertyValue = (obj, path, value) => {
    if (typeof path === 'string') {
        path = path.split('.');
    }
    if (path.length > 1) {
        const e = path.shift();
        exports.setObjectPropertyValue((obj[e] =
            Object.prototype.toString.call(obj[e]) === '[object Object]'
                ? obj[e]
                : {}), path, value);
    }
    else {
        obj[path[0]] = value;
    }
};


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./lang-de": 43,
	"./lang-de.ts": 43,
	"./lang-en": 44,
	"./lang-en.ts": 44,
	"./lang-es": 45,
	"./lang-es.ts": 45,
	"./lang-fr": 46,
	"./lang-fr.ts": 46,
	"./lang-nl": 47,
	"./lang-nl.ts": 47,
	"./lang-pl": 48,
	"./lang-pl.ts": 48,
	"./lang-pt-br": 49,
	"./lang-pt-br.ts": 49,
	"./lang-pt-pt": 50,
	"./lang-pt-pt.ts": 50,
	"./lang-ru": 51,
	"./lang-ru.ts": 51,
	"./lang-uk": 52,
	"./lang-uk.ts": 52,
	"./lang-zh-cn": 53,
	"./lang-zh-cn.ts": 53
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 42;

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material Icon Theme wurde installiert.',
    howToActivate: 'Wie Icons aktivieren?',
    activate: 'Aktivieren',
    activated: 'Material Icon Theme ist jetzt aktiviert.',
    neverShowAgain: 'Nicht mehr zeigen',
    themeUpdated: 'Das Material Icon Theme wurde aktualisiert.',
    readChangelog: 'Änderungsprotokoll lesen',
    iconPacks: {
        selectPack: 'Icon Pack auswählen',
        description: "Das '%0' Icon Pack auswählen",
        disabled: 'Icon Packs deaktivieren',
    },
    folders: {
        toggleIcons: 'Wähle ein Ordner Design',
        color: 'Wähle eine Ordner Farbe',
        hexCode: 'Gebe einen HEX Farbcode ein',
        wrongHexCode: 'Ungültiger HEX Farbcode',
        disabled: 'Keine Ordner Icons',
        theme: {
            description: "Wähle das '%0' Design",
        },
    },
    opacity: {
        inputPlaceholder: 'Wert der Deckkraft (zwischen 0 und 1)',
        wrongValue: 'Der Wert muss zwischen 0 und 1 liegen!',
    },
    toggleSwitch: {
        on: 'EIN',
        off: 'AUS',
    },
    explorerArrows: {
        toggle: 'Pfeile im Explorer anpassen',
        enable: 'Explorer Pfeile anzeigen',
        disable: 'Explorer Pfeile ausblenden',
    },
    grayscale: {
        toggle: 'Schaltet graustufige Icons um',
        enable: 'Aktiviert graustufige Icons',
        disable: 'Deaktiviert graustufige Icons',
    },
    saturation: {
        inputPlaceholder: 'Wert der Sättigung (zwischen 0 und 1)',
        wrongValue: 'Der Wert muss zwischen 0 und 1 liegen!',
    },
    confirmReload: 'VS Code muss neu gestartet werden, um die Änderungen an den Icons zu aktivieren.',
    reload: 'Neu starten',
    outdatedVersion: 'VS Code muss aktualisiert werden, um diesen Befehl auszuführen.',
    updateVSCode: 'VS Code aktualisieren',
};


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material Icon Theme has been installed.',
    howToActivate: 'How to activate icons',
    activate: 'Activate',
    activated: 'Material Icon Theme is active.',
    neverShowAgain: 'Never show again',
    themeUpdated: 'Material Icon Theme has been updated.',
    readChangelog: 'Read changelog',
    iconPacks: {
        selectPack: 'Select an icon pack',
        description: "Select the '%0' icon pack",
        disabled: 'Disable icon packs',
    },
    folders: {
        toggleIcons: 'Pick a folder theme',
        color: 'Choose a folder color',
        hexCode: 'Insert a HEX color code',
        wrongHexCode: 'Invalid HEX color code!',
        disabled: 'No folder icons',
        theme: {
            description: "Select the '%0' folder theme",
        },
    },
    opacity: {
        inputPlaceholder: 'Opacity value (between 0 and 1)',
        wrongValue: 'The value must be between 0 and 1!',
    },
    toggleSwitch: {
        on: 'ON',
        off: 'OFF',
    },
    explorerArrows: {
        toggle: 'Toggle folder arrows',
        enable: 'Show folder arrows',
        disable: 'Hide folder arrows',
    },
    confirmReload: 'You have to restart VS Code to activate the changes to the icons.',
    reload: 'Restart',
    outdatedVersion: 'You have to update VS Code to use this command.',
    updateVSCode: 'Update VS Code',
    grayscale: {
        toggle: 'Toggle grayscale icons',
        enable: 'Enable grayscale icons',
        disable: 'Disable grayscale icons',
    },
    saturation: {
        inputPlaceholder: 'Saturation value (between 0 and 1)',
        wrongValue: 'The value must be between 0 and 1!',
    },
};


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material Icon Theme se ha instalado.',
    howToActivate: 'Cómo activar los iconos',
    activate: 'Activar',
    activated: 'Material Icon Theme está activado.',
    neverShowAgain: 'No mostrar más',
    themeUpdated: 'Material Icon Theme se ha actualizado.',
    readChangelog: 'Leer changelog',
    iconPacks: {
        selectPack: 'Seleccione un paquete de iconos',
        description: "Seleccione el paquete de iconos '%0'",
        disabled: 'Desactivar paquetes de iconos',
    },
    folders: {
        toggleIcons: 'Cambiar activación de iconos de carpetas',
        color: 'Elija un color de carpeta',
        hexCode: 'Insertar un código de color HEX',
        wrongHexCode: 'Código de color HEX inválido!',
        disabled: 'Sin iconos de carpeta',
        theme: {
            description: "Iconos de carpeta '%0'",
        },
    },
    opacity: {
        inputPlaceholder: 'Valor de opacidad (entre 0 y 1)',
        wrongValue: 'El valor debe estar entre 0 y 1!',
    },
    toggleSwitch: {
        on: 'ON',
        off: 'OFF',
    },
    explorerArrows: {
        toggle: 'Conmutar las flechas de carpetas',
        enable: 'Mostrar flechas de carpeta',
        disable: 'Ocultar las flechas de carpetas',
    },
    confirmReload: 'Debe reiniciar VS Code para activar los cambios en los iconos.',
    reload: 'Reiniciar',
    outdatedVersion: 'Debe actualizar VS Code para utilizar este comando.',
    updateVSCode: 'Actualizar VS Code',
};


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material Icon Theme a été installé.',
    howToActivate: 'Comment activer les icônes',
    activate: 'Activer',
    activated: 'Material Icon Theme est actif.',
    neverShowAgain: 'Ne plus afficher',
    themeUpdated: 'Material Icon Theme a été mis à jour.',
    readChangelog: 'Lire la liste des changements',
    iconPacks: {
        selectPack: "Sélectionnez un pack d'icônes",
        description: "Sélectionner le pack d'icônes '%0'",
        disabled: "Désactiver les paquets d'icônes",
    },
    folders: {
        toggleIcons: 'Basculer les icônes de dossiers',
        color: 'Choisissez une couleur de dossier',
        hexCode: 'Insérer un code couleur HEX',
        wrongHexCode: 'Code couleur HEX non valide!',
        disabled: 'Aucune icônes de dossiers',
        theme: {
            description: "Icônes de dossiers '%0'",
        },
    },
    opacity: {
        inputPlaceholder: "Valeur d'opacité (entre 0 et 1)",
        wrongValue: 'La valeur doit être comprise entre 0 et 1!',
    },
    toggleSwitch: {
        on: 'ON',
        off: 'OFF',
    },
    explorerArrows: {
        toggle: 'Basculer les flèches du dossier',
        enable: 'Afficher les flèches du dossier',
        disable: 'Cacher les flèches de dossier',
    },
    confirmReload: 'Veuillez redémarrer VS Code pour activer les icônes',
    reload: 'Redémarrer',
    outdatedVersion: 'Vous devez mettre VS Code à jour pour utiliser cette commande.',
    updateVSCode: 'Mettre VS Code à jour.',
};


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material Icon Thema is geïnstalleerd.',
    howToActivate: 'Hoe je icons activeert',
    activate: 'Activeer',
    activated: 'Material Icon Thema is actief.',
    neverShowAgain: 'Nooit meer laten zien',
    themeUpdated: 'Material Icon Thema is geüpdated.',
    readChangelog: 'Lees de changelog',
    iconPacks: {
        selectPack: 'Selecteer een iconpakket',
        description: "Selecteer het '%0' iconpakket",
        disabled: 'Zet iconpaketten uit',
    },
    folders: {
        toggleIcons: 'Kies een folderthema',
        color: 'Kies een folderkleur',
        hexCode: 'Voeg een HEX kleurcode in',
        wrongHexCode: 'Ongeldige HEX kleurcode!',
        disabled: 'Geen foldericons',
        theme: {
            description: "Selecteer het '%0' folderthema",
        },
    },
    opacity: {
        inputPlaceholder: 'Doorzichtbaarheidswaarde (tussen 0 en 1)',
        wrongValue: 'De waarde moet tussen de 0 en 1 zijn!',
    },
    toggleSwitch: {
        on: 'AAN',
        off: 'UIT',
    },
    explorerArrows: {
        toggle: 'Zet folderpijlen aan of uit',
        enable: 'Laat folderpijlen zien',
        disable: 'Verberg folderpijlen',
    },
    confirmReload: 'Je moet VS Code herstarten om de veranderingen in icons te activeren.',
    reload: 'Herstart',
    outdatedVersion: 'Je moet VS Code updaten om dit commando te kunnen gebruiken.',
    updateVSCode: 'Update VS Code',
    grayscale: {
        toggle: 'Zet grijsgetinte icons aan of uit',
        enable: 'Zet grijsgetinte icons aan',
        disable: 'Zet grijsgetinte icons uit',
    },
    saturation: {
        inputPlaceholder: 'Saturatiewaarde (tussen 0 en 1)',
        wrongValue: 'De waarde moet tussen de 0 en 1 zijn!',
    },
};


/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Motyw Material Icon został zainstalowany.',
    howToActivate: 'Jak aktywować ikony',
    activate: 'Aktywuj',
    activated: 'Motyw Material Icon jest aktywny.',
    neverShowAgain: 'Nigdy więcej nie pokazuj',
    themeUpdated: 'Motyw Material Icon został zaktualizowany.',
    readChangelog: 'Przeczytaj listę zmian',
    iconPacks: {
        selectPack: 'Wybierz paczkę ikon',
        description: "Wybierz paczkę ikon '%0'",
        disabled: 'Wyłącz paczki ikon',
    },
    folders: {
        toggleIcons: 'Wybierz motyw folderów',
        color: 'Wybierz kolor folderów',
        hexCode: 'Podaj kolor w formacie HEX',
        wrongHexCode: 'Nieprawidłowy kolor HEX!',
        disabled: 'Brak ikon folderów',
        theme: {
            description: "Wybierz motyw folderów '%0'",
        },
    },
    opacity: {
        inputPlaceholder: 'Wartość przezroczystości (pomiędzy 0 a 1)',
        wrongValue: 'Wartość musi być pomiędzy 0 i 1!',
    },
    toggleSwitch: {
        on: 'WŁĄCZONE',
        off: 'WYŁĄCZONE',
    },
    explorerArrows: {
        toggle: 'Przełącz strzałki przy folderach',
        enable: 'Pokaż strzałki przy folderach',
        disable: 'Schowaj strzałki przy folderach',
    },
    confirmReload: 'Musisz zrestartować VS Code, aby uaktywnić zmiany ikon.',
    reload: 'Restartuj',
    outdatedVersion: 'Musisz zaktualizować VS Code, aby użyć tej komendy.',
    updateVSCode: 'Zaktualizuj VS Code',
    grayscale: {
        toggle: 'Przełącz czarno-białe ikony',
        enable: 'Włącz czarno-białe ikony',
        disable: 'Wyłącz czarno-białe ikony',
    },
    saturation: {
        inputPlaceholder: 'Wartość nasycenia (pomiędzy 0 a 1)',
        wrongValue: 'Wartość musi być pomiędzy 0 i 1!',
    },
};


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'O Material Icon Theme foi instalado.',
    howToActivate: 'Como ativar os ícones',
    activate: 'Ativar',
    activated: 'O Material Icon Theme está ativo.',
    neverShowAgain: 'Não mostrar novamente',
    themeUpdated: 'O Material Icon Theme foi atualizado.',
    readChangelog: 'Ler changelog',
    iconPacks: {
        selectPack: 'Selecione um pacote de ícones',
        description: "Selecionar o pacote de ícones '%0'",
        disabled: 'Desabilitar pacotes de ícones',
    },
    folders: {
        toggleIcons: 'Escolha um tema para as pastas',
        color: 'Escolha uma cor para as pastas',
        hexCode: 'Insira um código de cor hexadecimal',
        wrongHexCode: 'Código de cor hexadecimal inválido!',
        disabled: 'Nenhum ícone de pasta',
        theme: {
            description: "Selecionar o tema para pastas '%0'",
        },
    },
    opacity: {
        inputPlaceholder: 'Valor de opacidade (entre 0 e 1)',
        wrongValue: 'O valor deve estar entre 0 e 1!',
    },
    toggleSwitch: {
        on: 'ON',
        off: 'OFF',
    },
    explorerArrows: {
        toggle: 'Alternar setas do explorador de arquivos',
        enable: 'Exibir setas do explorador de arquivos',
        disable: 'Ocultar setas do explorador de arquivos',
    },
    confirmReload: 'Você precisa reiniciar o VS Code para ativar a mudança de ícones.',
    reload: 'Reiniciar',
    outdatedVersion: 'Você precisa atualizar o VS Code para usar esse comando.',
    updateVSCode: 'Atualizar VS Code',
};


/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'O Material Icon Theme foi instalado.',
    howToActivate: 'Como habilitar os ícones',
    activate: 'Habilitar',
    activated: 'O Material Icon Theme está habilitado.',
    neverShowAgain: 'Não mostrar novamente',
    themeUpdated: 'O Material Icon Theme foi atualizado.',
    readChangelog: 'Ler registos',
    iconPacks: {
        selectPack: 'Seleccione um pacote de ícones',
        description: "Seleccionar o pacote de ícones '%0'",
        disabled: 'Desabilitar pacotes de ícones',
    },
    folders: {
        toggleIcons: 'Escolhe um tema para os directórios',
        color: 'Escolhe uma cor para os directórios',
        hexCode: 'Insira um código de cor hexadecimal',
        wrongHexCode: 'Código de cor hexadecimal inválido!',
        disabled: 'Nenhum ícone do directório',
        theme: {
            description: "Seleccionar o tema para directórios '%0'",
        },
    },
    opacity: {
        inputPlaceholder: 'Valor de opacidade (entre 0 e 1)',
        wrongValue: 'O valor deve estar entre 0 e 1!',
    },
    toggleSwitch: {
        on: 'ON',
        off: 'OFF',
    },
    explorerArrows: {
        toggle: 'Alternar setas do explorador de ficheiros',
        enable: 'Exibir setas do explorador de ficheiros',
        disable: 'Ocultar setas do explorador de ficheiros',
    },
    confirmReload: 'Precisas reinicializar o VS Code para habilitar a alteração de ícones.',
    reload: 'Reiniciar',
    outdatedVersion: 'Precisas actualizar o VS Code para utilizar este comando.',
    updateVSCode: 'Actualizar o VS Code',
};


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material Icon Theme был установлен.',
    howToActivate: 'Как активировать иконки',
    activate: 'Активировать',
    activated: 'Material Icon Theme активен.',
    neverShowAgain: 'Никогда не показывать снова',
    themeUpdated: 'Material Icon Theme был обновлен.',
    readChangelog: 'Читать изменения версии',
    iconPacks: {
        selectPack: 'Выбрать набор иконок',
        description: "Выбрать '%0' набор иконок",
        disabled: 'Выключить набор иконок',
    },
    folders: {
        toggleIcons: 'Выбрать тему папки',
        color: 'Выбрать цвет папки',
        hexCode: 'Вставить HEX-код цвета',
        wrongHexCode: 'Неверный HEX-код цвета!',
        disabled: 'Нет иконки для папки',
        theme: {
            description: "Выбрать '%0' тему папки",
        },
    },
    opacity: {
        inputPlaceholder: 'Значение непрозрачности (от 0 до 1)',
        wrongValue: 'Значение должно быть от 0 до 1!',
    },
    toggleSwitch: {
        on: 'Включить',
        off: 'Выключить',
    },
    explorerArrows: {
        toggle: 'Показать/Скрыть стрелки у папок',
        enable: 'Показать стрелки у папок',
        disable: 'Скрыть стрелки у папок',
    },
    confirmReload: 'Нужно перезапустить VS Code для активации иконок.',
    reload: 'Перезагрузить',
    outdatedVersion: 'Нужно обновить VS Code чтобы использовать эту команду.',
    updateVSCode: 'Обновить VS Code',
};


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material Icon Theme був встановлений.',
    howToActivate: 'Як активувати значки',
    activate: 'Активувати',
    activated: 'Material Icon Theme активований.',
    neverShowAgain: 'Ніколи не показувати знову',
    themeUpdated: 'Material Icon Theme був оновлений.',
    readChangelog: 'Прочитати зміни',
    folders: {
        toggleIcons: 'Переключити теку icons',
    },
    toggleSwitch: {
        on: 'Включити',
        off: 'Відключити',
    },
    confirmReload: 'Необхідно перезавантажити VS Code, щоб активувати зміни значків.',
    reload: 'Перезавантажити',
    outdatedVersion: 'Ви повинні оновити VS Code, щоб використовувати цю команду.',
    updateVSCode: 'Оновити VS Code',
};


/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.translation = void 0;
exports.translation = {
    themeInstalled: 'Material主题图标已安装',
    howToActivate: '如何激活图标',
    activate: '激活',
    activated: 'Material主题图标已激活',
    neverShowAgain: '不再显示',
    themeUpdated: 'Material主题图标已更新',
    readChangelog: '阅读更新日志',
    iconPacks: {
        selectPack: '选择图标包',
        description: '选择％0符号',
        disabled: '禁用图标包',
    },
    folders: {
        toggleIcons: '切换文件夹图标的显示',
        color: '选择一个文件夹颜色',
        hexCode: '插入HEX颜色代码',
        wrongHexCode: '无效的HEX颜色代码！',
        disabled: '不显示文件夹图标',
        theme: {
            description: "'%0'主题的文件夹图标",
        },
    },
    opacity: {
        inputPlaceholder: '不透明度值（0和1之间）',
        wrongValue: '该值必须介于0和1之间！',
    },
    toggleSwitch: {
        on: 'ON',
        off: 'OFF',
    },
    explorerArrows: {
        toggle: '切换文件夹箭头',
        enable: '显示文件夹箭头',
        disable: '隐藏文件夹箭头',
    },
    confirmReload: '你必须重启VS Code来应用对图标的更改',
    reload: '重启',
    outdatedVersion: '你必须更新VS Code才能使用该命令',
    updateVSCode: '更新VS Code',
};


/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkArrowStatus = exports.toggleExplorerArrows = void 0;
const vscode = __webpack_require__(1);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Command to toggle the explorer arrows. */
exports.toggleExplorerArrows = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = exports.checkArrowStatus();
        const response = yield showQuickPickItems(status);
        return handleQuickPickActions(response);
    }
    catch (error) {
        console.error(error);
    }
});
/** Show QuickPick items to select preferred configuration for the explorer arrows. */
const showQuickPickItems = (status) => {
    const on = {
        description: i18n.translate('toggleSwitch.on'),
        detail: i18n.translate('explorerArrows.enable'),
        label: !status ? '\u2714' : '\u25FB',
    };
    const off = {
        description: i18n.translate('toggleSwitch.off'),
        detail: i18n.translate('explorerArrows.disable'),
        label: status ? '\u2714' : '\u25FB',
    };
    return vscode.window.showQuickPick([on, off], {
        placeHolder: i18n.translate('explorerArrows.toggle'),
        ignoreFocusOut: false,
        matchOnDescription: true,
    });
};
/** Handle the actions from the QuickPick. */
const handleQuickPickActions = (value) => {
    if (!value || !value.description)
        return;
    switch (value.description) {
        case i18n.translate('toggleSwitch.on'): {
            return helpers.setThemeConfig('hidesExplorerArrows', false, true);
        }
        case i18n.translate('toggleSwitch.off'): {
            return helpers.setThemeConfig('hidesExplorerArrows', true, true);
        }
        default:
            return;
    }
};
/** Are the arrows enabled? */
exports.checkArrowStatus = () => {
    return helpers.getMaterialIconsJSON().hidesExplorerArrows;
};


/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFolderColorStatus = exports.changeFolderColor = void 0;
const vscode = __webpack_require__(1);
const icons_1 = __webpack_require__(7);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
const iconPalette = [
    { label: 'Grey (Default)', hex: '#90a4ae' },
    { label: 'Blue', hex: '#42a5f5' },
    { label: 'Green', hex: '#7CB342' },
    { label: 'Teal', hex: '#26A69A' },
    { label: 'Red', hex: '#EF5350' },
    { label: 'Orange', hex: '#FF7043' },
    { label: 'Yellow', hex: '#FDD835' },
    { label: 'Custom Color', hex: 'Custom HEX Code' },
];
/** Command to toggle the folder icons. */
exports.changeFolderColor = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = exports.checkFolderColorStatus();
        const response = yield showQuickPickItems(status);
        handleQuickPickActions(response);
    }
    catch (error) {
        console.error(error);
    }
});
/** Show QuickPick items to select preferred color for the folder icons. */
const showQuickPickItems = (currentColor) => {
    const options = iconPalette.map((color) => ({
        description: color.label,
        label: isColorActive(color, currentColor) ? '\u2714' : '\u25FB',
    }));
    return vscode.window.showQuickPick(options, {
        placeHolder: i18n.translate('folders.color'),
        ignoreFocusOut: false,
        matchOnDescription: true,
    });
};
/** Handle the actions from the QuickPick. */
const handleQuickPickActions = (value) => {
    if (!value || !value.description)
        return;
    if (value.description === 'Custom Color') {
        vscode.window
            .showInputBox({
            placeHolder: i18n.translate('folders.hexCode'),
            ignoreFocusOut: true,
            validateInput: validateColorInput,
        })
            .then((value) => setColorConfig(value));
    }
    else {
        const hexCode = iconPalette.find((c) => c.label === value.description).hex;
        setColorConfig(hexCode);
    }
};
const validateColorInput = (colorInput) => {
    if (!icons_1.validateHEXColorCode(colorInput)) {
        return i18n.translate('folders.wrongHexCode');
    }
    return undefined;
};
/** Check status of the folder color */
exports.checkFolderColorStatus = () => {
    var _a;
    const defaultOptions = icons_1.getDefaultIconOptions();
    const config = helpers.getMaterialIconsJSON();
    return (_a = config.options.folders.color) !== null && _a !== void 0 ? _a : defaultOptions.folders.color;
};
const setColorConfig = (value) => {
    if (value) {
        helpers.setThemeConfig('folders.color', value.toLowerCase(), true);
    }
};
const isColorActive = (color, currentColor) => {
    if (color.label === 'Custom Color') {
        return !iconPalette.some((c) => c.hex.toLowerCase() === currentColor.toLowerCase());
    }
    return color.hex.toLowerCase() === currentColor.toLowerCase();
};


/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFolderIconsStatus = exports.changeFolderTheme = void 0;
const vscode = __webpack_require__(1);
const icons_1 = __webpack_require__(7);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Command to toggle the folder icons. */
exports.changeFolderTheme = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = exports.checkFolderIconsStatus();
        const response = yield showQuickPickItems(status);
        handleQuickPickActions(response);
    }
    catch (error) {
        console.error(error);
    }
});
/** Show QuickPick items to select preferred configuration for the folder icons. */
const showQuickPickItems = (activeTheme) => {
    const options = icons_1.folderIcons.map((theme) => ({
        description: helpers.capitalizeFirstLetter(theme.name),
        detail: theme.name === 'none'
            ? i18n.translate('folders.disabled')
            : i18n.translate('folders.theme.description', helpers.capitalizeFirstLetter(theme.name)),
        label: theme.name === activeTheme ? '\u2714' : '\u25FB',
    }));
    return vscode.window.showQuickPick(options, {
        placeHolder: i18n.translate('folders.toggleIcons'),
        ignoreFocusOut: false,
        matchOnDescription: true,
    });
};
/** Handle the actions from the QuickPick. */
const handleQuickPickActions = (value) => {
    if (!value || !value.description)
        return;
    return helpers.setThemeConfig('folders.theme', value.description.toLowerCase(), true);
};
/** Are the folder icons enabled? */
exports.checkFolderIconsStatus = () => {
    return helpers.getMaterialIconsJSON().options.folders.theme;
};


/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGrayscaleStatus = exports.toggleGrayscale = void 0;
const vscode = __webpack_require__(1);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Command to toggle grayscale. */
exports.toggleGrayscale = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = exports.checkGrayscaleStatus();
        const response = yield showQuickPickItems(status);
        handleQuickPickActions(response);
    }
    catch (error) {
        console.error(error);
    }
});
/** Show QuickPick items to select preferred configuration for grayscale icons. */
const showQuickPickItems = (status) => {
    const on = {
        description: i18n.translate('toggleSwitch.on'),
        detail: i18n.translate('grayscale.enable'),
        label: status ? '\u2714' : '\u25FB',
    };
    const off = {
        description: i18n.translate('toggleSwitch.off'),
        detail: i18n.translate('grayscale.disable'),
        label: !status ? '\u2714' : '\u25FB',
    };
    return vscode.window.showQuickPick([on, off], {
        placeHolder: i18n.translate('grayscale.toggle'),
        ignoreFocusOut: false,
        matchOnDescription: true,
    });
};
/** Handle the actions from the QuickPick. */
const handleQuickPickActions = (value) => {
    if (!value || !value.description)
        return;
    switch (value.description) {
        case i18n.translate('toggleSwitch.on'): {
            return helpers.setThemeConfig('saturation', 0, true);
        }
        case i18n.translate('toggleSwitch.off'): {
            return helpers.setThemeConfig('saturation', 1, true);
        }
        default:
            return;
    }
};
/** Is grayscale icons enabled? */
exports.checkGrayscaleStatus = () => {
    return helpers.getMaterialIconsJSON().options.saturation === 0;
};


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllIconPacks = exports.toggleIconPacks = void 0;
const vscode = __webpack_require__(1);
const index_1 = __webpack_require__(13);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Command to toggle the icons packs */
exports.toggleIconPacks = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeIconPack = getActiveIconPack();
        const response = yield showQuickPickItems(activeIconPack);
        handleQuickPickActions(response);
    }
    catch (error) {
        console.error(error);
    }
});
/** Show QuickPick items to select preferred configuration for the icon packs. */
const showQuickPickItems = (activePack) => {
    const packs = [...exports.getAllIconPacks().sort(), 'none'];
    const options = packs.map((pack) => {
        const packLabel = helpers.toTitleCase(pack.replace('_', ' + '));
        const active = isPackActive(activePack, pack);
        const iconPacksDeactivated = pack === 'none' && activePack === '';
        return {
            description: packLabel,
            detail: i18n.translate(`iconPacks.${pack === 'none' ? 'disabled' : 'description'}`, packLabel),
            label: iconPacksDeactivated ? '\u2714' : active ? '\u2714' : '\u25FB',
        };
    });
    return vscode.window.showQuickPick(options, {
        placeHolder: i18n.translate('iconPacks.selectPack'),
        ignoreFocusOut: false,
        matchOnDescription: true,
        matchOnDetail: true,
    });
};
/** Handle the actions from the QuickPick. */
const handleQuickPickActions = (value) => {
    if (!value || !value.description)
        return;
    const decision = value.description.replace(' + ', '_').toLowerCase();
    helpers.setThemeConfig('activeIconPack', decision === 'none' ? '' : decision, true);
};
const getActiveIconPack = () => {
    return helpers.getMaterialIconsJSON().options.activeIconPack;
};
/** Get all packs that can be used in this icon theme. */
exports.getAllIconPacks = () => {
    const packs = [];
    for (const item in index_1.IconPack) {
        if (isNaN(Number(item))) {
            packs.push(index_1.IconPack[item].toLowerCase());
        }
    }
    return packs;
};
const isPackActive = (activePack, pack) => {
    return activePack.toLowerCase() === pack.toLowerCase();
};


/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentOpacityValue = exports.changeOpacity = void 0;
const vscode = __webpack_require__(1);
const icons_1 = __webpack_require__(7);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Command to toggle the folder icons. */
exports.changeOpacity = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentOpacityValue = exports.getCurrentOpacityValue();
        const response = Number(yield showInput(currentOpacityValue));
        return setOpacityConfig(response);
    }
    catch (error) {
        console.error(error);
    }
});
/** Show input to enter the opacity value. */
const showInput = (opacity) => {
    return vscode.window.showInputBox({
        placeHolder: i18n.translate('opacity.inputPlaceholder'),
        ignoreFocusOut: true,
        value: String(opacity),
        validateInput: validateOpacityInput,
    });
};
/** Validate the opacity value which was inserted by the user. */
const validateOpacityInput = (opacityInput) => {
    if (!icons_1.validateOpacityValue(+opacityInput)) {
        return i18n.translate('opacity.wrongValue');
    }
    return undefined;
};
/** Get the current value of the opacity of the icons. */
exports.getCurrentOpacityValue = () => {
    var _a;
    const defaultOptions = icons_1.getDefaultIconOptions();
    const config = helpers.getMaterialIconsJSON();
    return (_a = config.options.opacity) !== null && _a !== void 0 ? _a : defaultOptions.opacity;
};
const setOpacityConfig = (opacity) => {
    if (opacity !== undefined) {
        return helpers.setThemeConfig('opacity', opacity, true);
    }
};


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreDefaultConfig = void 0;
const helpers = __webpack_require__(4);
/** Restore all configurations to default. */
exports.restoreDefaultConfig = () => {
    helpers.setThemeConfig('activeIconPack', undefined, true);
    helpers.setThemeConfig('folders.theme', undefined, true);
    helpers.setThemeConfig('folders.color', undefined, true);
    helpers.setThemeConfig('hidesExplorerArrows', undefined, true);
    helpers.setThemeConfig('opacity', undefined, true);
    helpers.setThemeConfig('saturation', undefined, true);
    helpers.setThemeConfig('files.associations', undefined, true);
    helpers.setThemeConfig('folders.associations', undefined, true);
    helpers.setThemeConfig('languages.associations', undefined, true);
};


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentSaturationValue = exports.changeSaturation = void 0;
const vscode = __webpack_require__(1);
const icons_1 = __webpack_require__(7);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Command to toggle the folder icons. */
exports.changeSaturation = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentSaturationValue = exports.getCurrentSaturationValue();
        const response = Number(yield showInput(currentSaturationValue));
        setSaturationConfig(response);
    }
    catch (error) {
        console.error(error);
    }
});
/** Show input to enter the saturation value. */
const showInput = (saturation) => {
    return vscode.window.showInputBox({
        placeHolder: i18n.translate('saturation.inputPlaceholder'),
        ignoreFocusOut: true,
        value: String(saturation),
        validateInput: validateSaturationInput,
    });
};
/** Validate the saturation value which was inserted by the user. */
const validateSaturationInput = (saturationInput) => {
    if (!icons_1.validateSaturationValue(+saturationInput)) {
        return i18n.translate('saturation.wrongValue');
    }
    return undefined;
};
/** Get the current value of the saturation of the icons. */
exports.getCurrentSaturationValue = () => {
    var _a;
    const defaultOptions = icons_1.getDefaultIconOptions();
    const config = helpers.getMaterialIconsJSON();
    return (_a = config.options.saturation) !== null && _a !== void 0 ? _a : defaultOptions.saturation;
};
const setSaturationConfig = (saturation) => {
    if (saturation !== undefined) {
        return helpers.setThemeConfig('saturation', saturation, true);
    }
};


/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.detectConfigChanges = void 0;
const _1 = __webpack_require__(4);
const index_1 = __webpack_require__(7);
const objects_1 = __webpack_require__(41);
/** Compare the workspace and the user configurations with the current setup of the icons. */
exports.detectConfigChanges = () => {
    const changes = compareConfigs();
    // if there's nothing to update
    if (Object.keys(changes.updatedConfigs).length === 0)
        return;
    try {
        // update icon json file with new options
        index_1.createIconFile(changes.updatedConfigs, changes.updatedJSONConfig);
    }
    catch (error) {
        console.error(error);
    }
};
/**
 * Compares a specific configuration in the settings with a current configuration state.
 * The current configuration state is read from the icons json file.
 * @returns List of configurations that needs to be updated.
 */
const compareConfigs = () => {
    const configs = Object.keys(_1.getConfigProperties())
        .map((c) => c.split('.').slice(1).join('.'))
        // remove configurable notification messages
        .filter((c) => !/show(Welcome|Update|Reload)Message/g.test(c));
    const json = _1.getMaterialIconsJSON();
    return configs.reduce((result, configName) => {
        var _a;
        try {
            const themeConfig = _1.getThemeConfig(configName);
            const configValue = (_a = themeConfig.globalValue) !== null && _a !== void 0 ? _a : themeConfig.defaultValue;
            const currentState = objects_1.getObjectPropertyValue(json.options, configName);
            if (JSON.stringify(configValue) !== JSON.stringify(currentState)) {
                objects_1.setObjectPropertyValue(json.options, configName, configValue);
                objects_1.setObjectPropertyValue(result.updatedConfigs, configName, configValue);
            }
        }
        catch (error) {
            console.error(error);
        }
        return result;
    }, { updatedConfigs: {}, updatedJSONConfig: json.options });
};


/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVersionSupport = exports.checkThemeStatus = exports.ThemeStatus = void 0;
const semver = __webpack_require__(64);
const vscode = __webpack_require__(1);
const helpers = __webpack_require__(4);
var ThemeStatus;
(function (ThemeStatus) {
    ThemeStatus[ThemeStatus["neverUsedBefore"] = 0] = "neverUsedBefore";
    ThemeStatus[ThemeStatus["updated"] = 1] = "updated";
    ThemeStatus[ThemeStatus["current"] = 2] = "current";
})(ThemeStatus = exports.ThemeStatus || (exports.ThemeStatus = {}));
/** Check the current status of the theme */
exports.checkThemeStatus = (state) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // get the version from the state
        const stateVersion = state.get('material-icon-theme.version');
        const packageVersion = getCurrentExtensionVersion();
        // check if the theme was used before
        if (stateVersion === undefined) {
            yield updateExtensionVersionInMemento(state);
            return themeIsAlreadyActivated()
                ? ThemeStatus.updated
                : ThemeStatus.neverUsedBefore;
        }
        // compare the version in the state with the package version
        else if (semver.lt(stateVersion, packageVersion)) {
            yield updateExtensionVersionInMemento(state);
            return ThemeStatus.updated;
        }
        else {
            return ThemeStatus.current;
        }
    }
    catch (error) {
        console.error(error);
    }
});
/** Check if the theme was used before */
const themeIsAlreadyActivated = () => {
    return helpers.isThemeActivated() || helpers.isThemeActivated(true);
};
/** Update the version number to the current version in the memento. */
const updateExtensionVersionInMemento = (state) => {
    return state.update('material-icon-theme.version', getCurrentExtensionVersion());
};
/** Get the current version of the extension */
const getCurrentExtensionVersion = () => {
    return vscode.extensions.getExtension('cweijan.vscode-office').packageJSON
        .version;
};
/**
 * Check if the current version of VS Code
 * supports new features.
 */
exports.checkVersionSupport = (supportedVersion) => {
    return !semver.lt(vscode.version, supportedVersion);
};


/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

// just pre-load all the stuff that index.js lazily exports
const internalRe = __webpack_require__(65)
module.exports = {
  re: internalRe.re,
  src: internalRe.src,
  tokens: internalRe.t,
  SEMVER_SPEC_VERSION: __webpack_require__(66).SEMVER_SPEC_VERSION,
  SemVer: __webpack_require__(68),
  compareIdentifiers: __webpack_require__(69).compareIdentifiers,
  rcompareIdentifiers: __webpack_require__(69).rcompareIdentifiers,
  parse: __webpack_require__(70),
  valid: __webpack_require__(71),
  clean: __webpack_require__(72),
  inc: __webpack_require__(73),
  diff: __webpack_require__(74),
  major: __webpack_require__(77),
  minor: __webpack_require__(78),
  patch: __webpack_require__(79),
  prerelease: __webpack_require__(80),
  compare: __webpack_require__(76),
  rcompare: __webpack_require__(81),
  compareLoose: __webpack_require__(82),
  compareBuild: __webpack_require__(83),
  sort: __webpack_require__(84),
  rsort: __webpack_require__(85),
  gt: __webpack_require__(86),
  lt: __webpack_require__(87),
  eq: __webpack_require__(75),
  neq: __webpack_require__(88),
  gte: __webpack_require__(89),
  lte: __webpack_require__(90),
  cmp: __webpack_require__(91),
  coerce: __webpack_require__(92),
  Comparator: __webpack_require__(93),
  Range: __webpack_require__(94),
  satisfies: __webpack_require__(95),
  toComparators: __webpack_require__(96),
  maxSatisfying: __webpack_require__(97),
  minSatisfying: __webpack_require__(98),
  minVersion: __webpack_require__(99),
  validRange: __webpack_require__(100),
  outside: __webpack_require__(101),
  gtr: __webpack_require__(102),
  ltr: __webpack_require__(103),
  intersects: __webpack_require__(104),
  simplifyRange: __webpack_require__(105),
  subset: __webpack_require__(106),
}


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

const { MAX_SAFE_COMPONENT_LENGTH } = __webpack_require__(66)
const debug = __webpack_require__(67)
exports = module.exports = {}

// The actual regexps go on exports.re
const re = exports.re = []
const src = exports.src = []
const t = exports.t = {}
let R = 0

const createToken = (name, value, isGlobal) => {
  const index = R++
  debug(index, value)
  t[name] = index
  src[index] = value
  re[index] = new RegExp(value, isGlobal ? 'g' : undefined)
}

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*')
createToken('NUMERICIDENTIFIERLOOSE', '[0-9]+')

// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

createToken('NONNUMERICIDENTIFIER', '\\d*[a-zA-Z-][a-zA-Z0-9-]*')

// ## Main Version
// Three dot-separated numeric identifiers.

createToken('MAINVERSION', `(${src[t.NUMERICIDENTIFIER]})\\.` +
                   `(${src[t.NUMERICIDENTIFIER]})\\.` +
                   `(${src[t.NUMERICIDENTIFIER]})`)

createToken('MAINVERSIONLOOSE', `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
                        `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
                        `(${src[t.NUMERICIDENTIFIERLOOSE]})`)

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.

createToken('PRERELEASEIDENTIFIER', `(?:${src[t.NUMERICIDENTIFIER]
}|${src[t.NONNUMERICIDENTIFIER]})`)

createToken('PRERELEASEIDENTIFIERLOOSE', `(?:${src[t.NUMERICIDENTIFIERLOOSE]
}|${src[t.NONNUMERICIDENTIFIER]})`)

// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

createToken('PRERELEASE', `(?:-(${src[t.PRERELEASEIDENTIFIER]
}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`)

createToken('PRERELEASELOOSE', `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]
}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`)

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

createToken('BUILDIDENTIFIER', '[0-9A-Za-z-]+')

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

createToken('BUILD', `(?:\\+(${src[t.BUILDIDENTIFIER]
}(?:\\.${src[t.BUILDIDENTIFIER]})*))`)

// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

createToken('FULLPLAIN', `v?${src[t.MAINVERSION]
}${src[t.PRERELEASE]}?${
  src[t.BUILD]}?`)

createToken('FULL', `^${src[t.FULLPLAIN]}$`)

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
createToken('LOOSEPLAIN', `[v=\\s]*${src[t.MAINVERSIONLOOSE]
}${src[t.PRERELEASELOOSE]}?${
  src[t.BUILD]}?`)

createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`)

createToken('GTLT', '((?:<|>)?=?)')

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
createToken('XRANGEIDENTIFIERLOOSE', `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`)
createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`)

createToken('XRANGEPLAIN', `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:${src[t.PRERELEASE]})?${
                     src[t.BUILD]}?` +
                   `)?)?`)

createToken('XRANGEPLAINLOOSE', `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:${src[t.PRERELEASELOOSE]})?${
                          src[t.BUILD]}?` +
                        `)?)?`)

createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`)
createToken('XRANGELOOSE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`)

// Coercion.
// Extract anything that could conceivably be a part of a valid semver
createToken('COERCE', `${'(^|[^\\d])' +
              '(\\d{1,'}${MAX_SAFE_COMPONENT_LENGTH}})` +
              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
              `(?:$|[^\\d])`)
createToken('COERCERTL', src[t.COERCE], true)

// Tilde ranges.
// Meaning is "reasonably at or greater than"
createToken('LONETILDE', '(?:~>?)')

createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true)
exports.tildeTrimReplace = '$1~'

createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`)
createToken('TILDELOOSE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`)

// Caret ranges.
// Meaning is "at least and backwards compatible with"
createToken('LONECARET', '(?:\\^)')

createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true)
exports.caretTrimReplace = '$1^'

createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`)
createToken('CARETLOOSE', `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`)

// A simple gt/lt/eq thing, or just "" to indicate "any version"
createToken('COMPARATORLOOSE', `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`)
createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`)

// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
createToken('COMPARATORTRIM', `(\\s*)${src[t.GTLT]
}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true)
exports.comparatorTrimReplace = '$1$2$3'

// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
createToken('HYPHENRANGE', `^\\s*(${src[t.XRANGEPLAIN]})` +
                   `\\s+-\\s+` +
                   `(${src[t.XRANGEPLAIN]})` +
                   `\\s*$`)

createToken('HYPHENRANGELOOSE', `^\\s*(${src[t.XRANGEPLAINLOOSE]})` +
                        `\\s+-\\s+` +
                        `(${src[t.XRANGEPLAINLOOSE]})` +
                        `\\s*$`)

// Star ranges basically just allow anything at all.
createToken('STAR', '(<|>)?=?\\s*\\*')
// >=0.0.0 is like a star
createToken('GTE0', '^\\s*>=\\s*0\.0\.0\\s*$')
createToken('GTE0PRE', '^\\s*>=\\s*0\.0\.0-0\\s*$')


/***/ }),
/* 66 */
/***/ (function(module, exports) {

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
const SEMVER_SPEC_VERSION = '2.0.0'

const MAX_LENGTH = 256
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER ||
  /* istanbul ignore next */ 9007199254740991

// Max safe segment length for coercion.
const MAX_SAFE_COMPONENT_LENGTH = 16

module.exports = {
  SEMVER_SPEC_VERSION,
  MAX_LENGTH,
  MAX_SAFE_INTEGER,
  MAX_SAFE_COMPONENT_LENGTH
}


/***/ }),
/* 67 */
/***/ (function(module, exports) {

const debug = (
  typeof process === 'object' &&
  process.env &&
  process.env.NODE_DEBUG &&
  /\bsemver\b/i.test(process.env.NODE_DEBUG)
) ? (...args) => console.error('SEMVER', ...args)
  : () => {}

module.exports = debug


/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

const debug = __webpack_require__(67)
const { MAX_LENGTH, MAX_SAFE_INTEGER } = __webpack_require__(66)
const { re, t } = __webpack_require__(65)

const { compareIdentifiers } = __webpack_require__(69)
class SemVer {
  constructor (version, options) {
    if (!options || typeof options !== 'object') {
      options = {
        loose: !!options,
        includePrerelease: false
      }
    }
    if (version instanceof SemVer) {
      if (version.loose === !!options.loose &&
          version.includePrerelease === !!options.includePrerelease) {
        return version
      } else {
        version = version.version
      }
    } else if (typeof version !== 'string') {
      throw new TypeError(`Invalid Version: ${version}`)
    }

    if (version.length > MAX_LENGTH) {
      throw new TypeError(
        `version is longer than ${MAX_LENGTH} characters`
      )
    }

    debug('SemVer', version, options)
    this.options = options
    this.loose = !!options.loose
    // this isn't actually relevant for versions, but keep it so that we
    // don't run into trouble passing this.options around.
    this.includePrerelease = !!options.includePrerelease

    const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL])

    if (!m) {
      throw new TypeError(`Invalid Version: ${version}`)
    }

    this.raw = version

    // these are actually numbers
    this.major = +m[1]
    this.minor = +m[2]
    this.patch = +m[3]

    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError('Invalid major version')
    }

    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError('Invalid minor version')
    }

    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError('Invalid patch version')
    }

    // numberify any prerelease numeric ids
    if (!m[4]) {
      this.prerelease = []
    } else {
      this.prerelease = m[4].split('.').map((id) => {
        if (/^[0-9]+$/.test(id)) {
          const num = +id
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num
          }
        }
        return id
      })
    }

    this.build = m[5] ? m[5].split('.') : []
    this.format()
  }

  format () {
    this.version = `${this.major}.${this.minor}.${this.patch}`
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join('.')}`
    }
    return this.version
  }

  toString () {
    return this.version
  }

  compare (other) {
    debug('SemVer.compare', this.version, this.options, other)
    if (!(other instanceof SemVer)) {
      if (typeof other === 'string' && other === this.version) {
        return 0
      }
      other = new SemVer(other, this.options)
    }

    if (other.version === this.version) {
      return 0
    }

    return this.compareMain(other) || this.comparePre(other)
  }

  compareMain (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    return (
      compareIdentifiers(this.major, other.major) ||
      compareIdentifiers(this.minor, other.minor) ||
      compareIdentifiers(this.patch, other.patch)
    )
  }

  comparePre (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    // NOT having a prerelease is > having one
    if (this.prerelease.length && !other.prerelease.length) {
      return -1
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0
    }

    let i = 0
    do {
      const a = this.prerelease[i]
      const b = other.prerelease[i]
      debug('prerelease compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
  }

  compareBuild (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    let i = 0
    do {
      const a = this.build[i]
      const b = other.build[i]
      debug('prerelease compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
  }

  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc (release, identifier) {
    switch (release) {
      case 'premajor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor = 0
        this.major++
        this.inc('pre', identifier)
        break
      case 'preminor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor++
        this.inc('pre', identifier)
        break
      case 'prepatch':
        // If this is already a prerelease, it will bump to the next version
        // drop any prereleases that might already exist, since they are not
        // relevant at this point.
        this.prerelease.length = 0
        this.inc('patch', identifier)
        this.inc('pre', identifier)
        break
      // If the input is a non-prerelease version, this acts the same as
      // prepatch.
      case 'prerelease':
        if (this.prerelease.length === 0) {
          this.inc('patch', identifier)
        }
        this.inc('pre', identifier)
        break

      case 'major':
        // If this is a pre-major version, bump up to the same major version.
        // Otherwise increment major.
        // 1.0.0-5 bumps to 1.0.0
        // 1.1.0 bumps to 2.0.0
        if (
          this.minor !== 0 ||
          this.patch !== 0 ||
          this.prerelease.length === 0
        ) {
          this.major++
        }
        this.minor = 0
        this.patch = 0
        this.prerelease = []
        break
      case 'minor':
        // If this is a pre-minor version, bump up to the same minor version.
        // Otherwise increment minor.
        // 1.2.0-5 bumps to 1.2.0
        // 1.2.1 bumps to 1.3.0
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++
        }
        this.patch = 0
        this.prerelease = []
        break
      case 'patch':
        // If this is not a pre-release version, it will increment the patch.
        // If it is a pre-release it will bump up to the same patch version.
        // 1.2.0-5 patches to 1.2.0
        // 1.2.0 patches to 1.2.1
        if (this.prerelease.length === 0) {
          this.patch++
        }
        this.prerelease = []
        break
      // This probably shouldn't be used publicly.
      // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
      case 'pre':
        if (this.prerelease.length === 0) {
          this.prerelease = [0]
        } else {
          let i = this.prerelease.length
          while (--i >= 0) {
            if (typeof this.prerelease[i] === 'number') {
              this.prerelease[i]++
              i = -2
            }
          }
          if (i === -1) {
            // didn't increment anything
            this.prerelease.push(0)
          }
        }
        if (identifier) {
          // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
          // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
          if (this.prerelease[0] === identifier) {
            if (isNaN(this.prerelease[1])) {
              this.prerelease = [identifier, 0]
            }
          } else {
            this.prerelease = [identifier, 0]
          }
        }
        break

      default:
        throw new Error(`invalid increment argument: ${release}`)
    }
    this.format()
    this.raw = this.version
    return this
  }
}

module.exports = SemVer


/***/ }),
/* 69 */
/***/ (function(module, exports) {

const numeric = /^[0-9]+$/
const compareIdentifiers = (a, b) => {
  const anum = numeric.test(a)
  const bnum = numeric.test(b)

  if (anum && bnum) {
    a = +a
    b = +b
  }

  return a === b ? 0
    : (anum && !bnum) ? -1
    : (bnum && !anum) ? 1
    : a < b ? -1
    : 1
}

const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a)

module.exports = {
  compareIdentifiers,
  rcompareIdentifiers
}


/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

const {MAX_LENGTH} = __webpack_require__(66)
const { re, t } = __webpack_require__(65)
const SemVer = __webpack_require__(68)

const parse = (version, options) => {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  if (version instanceof SemVer) {
    return version
  }

  if (typeof version !== 'string') {
    return null
  }

  if (version.length > MAX_LENGTH) {
    return null
  }

  const r = options.loose ? re[t.LOOSE] : re[t.FULL]
  if (!r.test(version)) {
    return null
  }

  try {
    return new SemVer(version, options)
  } catch (er) {
    return null
  }
}

module.exports = parse


/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

const parse = __webpack_require__(70)
const valid = (version, options) => {
  const v = parse(version, options)
  return v ? v.version : null
}
module.exports = valid


/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

const parse = __webpack_require__(70)
const clean = (version, options) => {
  const s = parse(version.trim().replace(/^[=v]+/, ''), options)
  return s ? s.version : null
}
module.exports = clean


/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)

const inc = (version, release, options, identifier) => {
  if (typeof (options) === 'string') {
    identifier = options
    options = undefined
  }

  try {
    return new SemVer(version, options).inc(release, identifier).version
  } catch (er) {
    return null
  }
}
module.exports = inc


/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

const parse = __webpack_require__(70)
const eq = __webpack_require__(75)

const diff = (version1, version2) => {
  if (eq(version1, version2)) {
    return null
  } else {
    const v1 = parse(version1)
    const v2 = parse(version2)
    const hasPre = v1.prerelease.length || v2.prerelease.length
    const prefix = hasPre ? 'pre' : ''
    const defaultResult = hasPre ? 'prerelease' : ''
    for (const key in v1) {
      if (key === 'major' || key === 'minor' || key === 'patch') {
        if (v1[key] !== v2[key]) {
          return prefix + key
        }
      }
    }
    return defaultResult // may be undefined
  }
}
module.exports = diff


/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const eq = (a, b, loose) => compare(a, b, loose) === 0
module.exports = eq


/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const compare = (a, b, loose) =>
  new SemVer(a, loose).compare(new SemVer(b, loose))

module.exports = compare


/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const major = (a, loose) => new SemVer(a, loose).major
module.exports = major


/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const minor = (a, loose) => new SemVer(a, loose).minor
module.exports = minor


/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const patch = (a, loose) => new SemVer(a, loose).patch
module.exports = patch


/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

const parse = __webpack_require__(70)
const prerelease = (version, options) => {
  const parsed = parse(version, options)
  return (parsed && parsed.prerelease.length) ? parsed.prerelease : null
}
module.exports = prerelease


/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const rcompare = (a, b, loose) => compare(b, a, loose)
module.exports = rcompare


/***/ }),
/* 82 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const compareLoose = (a, b) => compare(a, b, true)
module.exports = compareLoose


/***/ }),
/* 83 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const compareBuild = (a, b, loose) => {
  const versionA = new SemVer(a, loose)
  const versionB = new SemVer(b, loose)
  return versionA.compare(versionB) || versionA.compareBuild(versionB)
}
module.exports = compareBuild


/***/ }),
/* 84 */
/***/ (function(module, exports, __webpack_require__) {

const compareBuild = __webpack_require__(83)
const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose))
module.exports = sort


/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

const compareBuild = __webpack_require__(83)
const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose))
module.exports = rsort


/***/ }),
/* 86 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const gt = (a, b, loose) => compare(a, b, loose) > 0
module.exports = gt


/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const lt = (a, b, loose) => compare(a, b, loose) < 0
module.exports = lt


/***/ }),
/* 88 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const neq = (a, b, loose) => compare(a, b, loose) !== 0
module.exports = neq


/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const gte = (a, b, loose) => compare(a, b, loose) >= 0
module.exports = gte


/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

const compare = __webpack_require__(76)
const lte = (a, b, loose) => compare(a, b, loose) <= 0
module.exports = lte


/***/ }),
/* 91 */
/***/ (function(module, exports, __webpack_require__) {

const eq = __webpack_require__(75)
const neq = __webpack_require__(88)
const gt = __webpack_require__(86)
const gte = __webpack_require__(89)
const lt = __webpack_require__(87)
const lte = __webpack_require__(90)

const cmp = (a, op, b, loose) => {
  switch (op) {
    case '===':
      if (typeof a === 'object')
        a = a.version
      if (typeof b === 'object')
        b = b.version
      return a === b

    case '!==':
      if (typeof a === 'object')
        a = a.version
      if (typeof b === 'object')
        b = b.version
      return a !== b

    case '':
    case '=':
    case '==':
      return eq(a, b, loose)

    case '!=':
      return neq(a, b, loose)

    case '>':
      return gt(a, b, loose)

    case '>=':
      return gte(a, b, loose)

    case '<':
      return lt(a, b, loose)

    case '<=':
      return lte(a, b, loose)

    default:
      throw new TypeError(`Invalid operator: ${op}`)
  }
}
module.exports = cmp


/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const parse = __webpack_require__(70)
const {re, t} = __webpack_require__(65)

const coerce = (version, options) => {
  if (version instanceof SemVer) {
    return version
  }

  if (typeof version === 'number') {
    version = String(version)
  }

  if (typeof version !== 'string') {
    return null
  }

  options = options || {}

  let match = null
  if (!options.rtl) {
    match = version.match(re[t.COERCE])
  } else {
    // Find the right-most coercible string that does not share
    // a terminus with a more left-ward coercible string.
    // Eg, '1.2.3.4' wants to coerce '2.3.4', not '3.4' or '4'
    //
    // Walk through the string checking with a /g regexp
    // Manually set the index so as to pick up overlapping matches.
    // Stop when we get a match that ends at the string end, since no
    // coercible string can be more right-ward without the same terminus.
    let next
    while ((next = re[t.COERCERTL].exec(version)) &&
        (!match || match.index + match[0].length !== version.length)
    ) {
      if (!match ||
            next.index + next[0].length !== match.index + match[0].length) {
        match = next
      }
      re[t.COERCERTL].lastIndex = next.index + next[1].length + next[2].length
    }
    // leave it in a clean state
    re[t.COERCERTL].lastIndex = -1
  }

  if (match === null)
    return null

  return parse(`${match[2]}.${match[3] || '0'}.${match[4] || '0'}`, options)
}
module.exports = coerce


/***/ }),
/* 93 */
/***/ (function(module, exports, __webpack_require__) {

const ANY = Symbol('SemVer ANY')
// hoisted class for cyclic dependency
class Comparator {
  static get ANY () {
    return ANY
  }
  constructor (comp, options) {
    if (!options || typeof options !== 'object') {
      options = {
        loose: !!options,
        includePrerelease: false
      }
    }

    if (comp instanceof Comparator) {
      if (comp.loose === !!options.loose) {
        return comp
      } else {
        comp = comp.value
      }
    }

    debug('comparator', comp, options)
    this.options = options
    this.loose = !!options.loose
    this.parse(comp)

    if (this.semver === ANY) {
      this.value = ''
    } else {
      this.value = this.operator + this.semver.version
    }

    debug('comp', this)
  }

  parse (comp) {
    const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR]
    const m = comp.match(r)

    if (!m) {
      throw new TypeError(`Invalid comparator: ${comp}`)
    }

    this.operator = m[1] !== undefined ? m[1] : ''
    if (this.operator === '=') {
      this.operator = ''
    }

    // if it literally is just '>' or '' then allow anything.
    if (!m[2]) {
      this.semver = ANY
    } else {
      this.semver = new SemVer(m[2], this.options.loose)
    }
  }

  toString () {
    return this.value
  }

  test (version) {
    debug('Comparator.test', version, this.options.loose)

    if (this.semver === ANY || version === ANY) {
      return true
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    return cmp(version, this.operator, this.semver, this.options)
  }

  intersects (comp, options) {
    if (!(comp instanceof Comparator)) {
      throw new TypeError('a Comparator is required')
    }

    if (!options || typeof options !== 'object') {
      options = {
        loose: !!options,
        includePrerelease: false
      }
    }

    if (this.operator === '') {
      if (this.value === '') {
        return true
      }
      return new Range(comp.value, options).test(this.value)
    } else if (comp.operator === '') {
      if (comp.value === '') {
        return true
      }
      return new Range(this.value, options).test(comp.semver)
    }

    const sameDirectionIncreasing =
      (this.operator === '>=' || this.operator === '>') &&
      (comp.operator === '>=' || comp.operator === '>')
    const sameDirectionDecreasing =
      (this.operator === '<=' || this.operator === '<') &&
      (comp.operator === '<=' || comp.operator === '<')
    const sameSemVer = this.semver.version === comp.semver.version
    const differentDirectionsInclusive =
      (this.operator === '>=' || this.operator === '<=') &&
      (comp.operator === '>=' || comp.operator === '<=')
    const oppositeDirectionsLessThan =
      cmp(this.semver, '<', comp.semver, options) &&
      (this.operator === '>=' || this.operator === '>') &&
        (comp.operator === '<=' || comp.operator === '<')
    const oppositeDirectionsGreaterThan =
      cmp(this.semver, '>', comp.semver, options) &&
      (this.operator === '<=' || this.operator === '<') &&
        (comp.operator === '>=' || comp.operator === '>')

    return (
      sameDirectionIncreasing ||
      sameDirectionDecreasing ||
      (sameSemVer && differentDirectionsInclusive) ||
      oppositeDirectionsLessThan ||
      oppositeDirectionsGreaterThan
    )
  }
}

module.exports = Comparator

const {re, t} = __webpack_require__(65)
const cmp = __webpack_require__(91)
const debug = __webpack_require__(67)
const SemVer = __webpack_require__(68)
const Range = __webpack_require__(94)


/***/ }),
/* 94 */
/***/ (function(module, exports, __webpack_require__) {

// hoisted class for cyclic dependency
class Range {
  constructor (range, options) {
    if (!options || typeof options !== 'object') {
      options = {
        loose: !!options,
        includePrerelease: false
      }
    }

    if (range instanceof Range) {
      if (
        range.loose === !!options.loose &&
        range.includePrerelease === !!options.includePrerelease
      ) {
        return range
      } else {
        return new Range(range.raw, options)
      }
    }

    if (range instanceof Comparator) {
      // just put it in the set and return
      this.raw = range.value
      this.set = [[range]]
      this.format()
      return this
    }

    this.options = options
    this.loose = !!options.loose
    this.includePrerelease = !!options.includePrerelease

    // First, split based on boolean or ||
    this.raw = range
    this.set = range
      .split(/\s*\|\|\s*/)
      // map the range to a 2d array of comparators
      .map(range => this.parseRange(range.trim()))
      // throw out any comparator lists that are empty
      // this generally means that it was not a valid range, which is allowed
      // in loose mode, but will still throw if the WHOLE range is invalid.
      .filter(c => c.length)

    if (!this.set.length) {
      throw new TypeError(`Invalid SemVer Range: ${range}`)
    }

    this.format()
  }

  format () {
    this.range = this.set
      .map((comps) => {
        return comps.join(' ').trim()
      })
      .join('||')
      .trim()
    return this.range
  }

  toString () {
    return this.range
  }

  parseRange (range) {
    const loose = this.options.loose
    range = range.trim()
    // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
    const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE]
    range = range.replace(hr, hyphenReplace(this.options.includePrerelease))
    debug('hyphen replace', range)
    // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
    range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace)
    debug('comparator trim', range, re[t.COMPARATORTRIM])

    // `~ 1.2.3` => `~1.2.3`
    range = range.replace(re[t.TILDETRIM], tildeTrimReplace)

    // `^ 1.2.3` => `^1.2.3`
    range = range.replace(re[t.CARETTRIM], caretTrimReplace)

    // normalize spaces
    range = range.split(/\s+/).join(' ')

    // At this point, the range is completely trimmed and
    // ready to be split into comparators.

    const compRe = loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR]
    return range
      .split(' ')
      .map(comp => parseComparator(comp, this.options))
      .join(' ')
      .split(/\s+/)
      .map(comp => replaceGTE0(comp, this.options))
      // in loose mode, throw out any that are not valid comparators
      .filter(this.options.loose ? comp => !!comp.match(compRe) : () => true)
      .map(comp => new Comparator(comp, this.options))
  }

  intersects (range, options) {
    if (!(range instanceof Range)) {
      throw new TypeError('a Range is required')
    }

    return this.set.some((thisComparators) => {
      return (
        isSatisfiable(thisComparators, options) &&
        range.set.some((rangeComparators) => {
          return (
            isSatisfiable(rangeComparators, options) &&
            thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options)
              })
            })
          )
        })
      )
    })
  }

  // if ANY of the sets match ALL of its comparators, then pass
  test (version) {
    if (!version) {
      return false
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    for (let i = 0; i < this.set.length; i++) {
      if (testSet(this.set[i], version, this.options)) {
        return true
      }
    }
    return false
  }
}
module.exports = Range

const Comparator = __webpack_require__(93)
const debug = __webpack_require__(67)
const SemVer = __webpack_require__(68)
const {
  re,
  t,
  comparatorTrimReplace,
  tildeTrimReplace,
  caretTrimReplace
} = __webpack_require__(65)

// take a set of comparators and determine whether there
// exists a version which can satisfy it
const isSatisfiable = (comparators, options) => {
  let result = true
  const remainingComparators = comparators.slice()
  let testComparator = remainingComparators.pop()

  while (result && remainingComparators.length) {
    result = remainingComparators.every((otherComparator) => {
      return testComparator.intersects(otherComparator, options)
    })

    testComparator = remainingComparators.pop()
  }

  return result
}

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
const parseComparator = (comp, options) => {
  debug('comp', comp, options)
  comp = replaceCarets(comp, options)
  debug('caret', comp)
  comp = replaceTildes(comp, options)
  debug('tildes', comp)
  comp = replaceXRanges(comp, options)
  debug('xrange', comp)
  comp = replaceStars(comp, options)
  debug('stars', comp)
  return comp
}

const isX = id => !id || id.toLowerCase() === 'x' || id === '*'

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0-0
const replaceTildes = (comp, options) =>
  comp.trim().split(/\s+/).map((comp) => {
    return replaceTilde(comp, options)
  }).join(' ')

const replaceTilde = (comp, options) => {
  const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE]
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('tilde', comp, _, M, m, p, pr)
    let ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0 <${+M + 1}.0.0-0`
    } else if (isX(p)) {
      // ~1.2 == >=1.2.0 <1.3.0-0
      ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`
    } else if (pr) {
      debug('replaceTilde pr', pr)
      ret = `>=${M}.${m}.${p}-${pr
      } <${M}.${+m + 1}.0-0`
    } else {
      // ~1.2.3 == >=1.2.3 <1.3.0-0
      ret = `>=${M}.${m}.${p
      } <${M}.${+m + 1}.0-0`
    }

    debug('tilde return', ret)
    return ret
  })
}

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
// ^1.2.3 --> >=1.2.3 <2.0.0-0
// ^1.2.0 --> >=1.2.0 <2.0.0-0
const replaceCarets = (comp, options) =>
  comp.trim().split(/\s+/).map((comp) => {
    return replaceCaret(comp, options)
  }).join(' ')

const replaceCaret = (comp, options) => {
  debug('caret', comp, options)
  const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET]
  const z = options.includePrerelease ? '-0' : ''
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('caret', comp, _, M, m, p, pr)
    let ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`
    } else if (isX(p)) {
      if (M === '0') {
        ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`
      } else {
        ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`
      }
    } else if (pr) {
      debug('replaceCaret pr', pr)
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p}-${pr
          } <${M}.${m}.${+p + 1}-0`
        } else {
          ret = `>=${M}.${m}.${p}-${pr
          } <${M}.${+m + 1}.0-0`
        }
      } else {
        ret = `>=${M}.${m}.${p}-${pr
        } <${+M + 1}.0.0-0`
      }
    } else {
      debug('no pr')
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p
          }${z} <${M}.${m}.${+p + 1}-0`
        } else {
          ret = `>=${M}.${m}.${p
          }${z} <${M}.${+m + 1}.0-0`
        }
      } else {
        ret = `>=${M}.${m}.${p
        } <${+M + 1}.0.0-0`
      }
    }

    debug('caret return', ret)
    return ret
  })
}

const replaceXRanges = (comp, options) => {
  debug('replaceXRanges', comp, options)
  return comp.split(/\s+/).map((comp) => {
    return replaceXRange(comp, options)
  }).join(' ')
}

const replaceXRange = (comp, options) => {
  comp = comp.trim()
  const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE]
  return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
    debug('xRange', comp, ret, gtlt, M, m, p, pr)
    const xM = isX(M)
    const xm = xM || isX(m)
    const xp = xm || isX(p)
    const anyX = xp

    if (gtlt === '=' && anyX) {
      gtlt = ''
    }

    // if we're including prereleases in the match, then we need
    // to fix this to -0, the lowest possible prerelease value
    pr = options.includePrerelease ? '-0' : ''

    if (xM) {
      if (gtlt === '>' || gtlt === '<') {
        // nothing is allowed
        ret = '<0.0.0-0'
      } else {
        // nothing is forbidden
        ret = '*'
      }
    } else if (gtlt && anyX) {
      // we know patch is an x, because we have any x at all.
      // replace X with 0
      if (xm) {
        m = 0
      }
      p = 0

      if (gtlt === '>') {
        // >1 => >=2.0.0
        // >1.2 => >=1.3.0
        gtlt = '>='
        if (xm) {
          M = +M + 1
          m = 0
          p = 0
        } else {
          m = +m + 1
          p = 0
        }
      } else if (gtlt === '<=') {
        // <=0.7.x is actually <0.8.0, since any 0.7.x should
        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
        gtlt = '<'
        if (xm) {
          M = +M + 1
        } else {
          m = +m + 1
        }
      }

      if (gtlt === '<')
        pr = '-0'

      ret = `${gtlt + M}.${m}.${p}${pr}`
    } else if (xm) {
      ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`
    } else if (xp) {
      ret = `>=${M}.${m}.0${pr
      } <${M}.${+m + 1}.0-0`
    }

    debug('xRange return', ret)

    return ret
  })
}

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
const replaceStars = (comp, options) => {
  debug('replaceStars', comp, options)
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp.trim().replace(re[t.STAR], '')
}

const replaceGTE0 = (comp, options) => {
  debug('replaceGTE0', comp, options)
  return comp.trim()
    .replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '')
}

// This function is passed to string.replace(re[t.HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0-0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0-0
const hyphenReplace = incPr => ($0,
  from, fM, fm, fp, fpr, fb,
  to, tM, tm, tp, tpr, tb) => {
  if (isX(fM)) {
    from = ''
  } else if (isX(fm)) {
    from = `>=${fM}.0.0${incPr ? '-0' : ''}`
  } else if (isX(fp)) {
    from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`
  } else if (fpr) {
    from = `>=${from}`
  } else {
    from = `>=${from}${incPr ? '-0' : ''}`
  }

  if (isX(tM)) {
    to = ''
  } else if (isX(tm)) {
    to = `<${+tM + 1}.0.0-0`
  } else if (isX(tp)) {
    to = `<${tM}.${+tm + 1}.0-0`
  } else if (tpr) {
    to = `<=${tM}.${tm}.${tp}-${tpr}`
  } else if (incPr) {
    to = `<${tM}.${tm}.${+tp + 1}-0`
  } else {
    to = `<=${to}`
  }

  return (`${from} ${to}`).trim()
}

const testSet = (set, version, options) => {
  for (let i = 0; i < set.length; i++) {
    if (!set[i].test(version)) {
      return false
    }
  }

  if (version.prerelease.length && !options.includePrerelease) {
    // Find the set of versions that are allowed to have prereleases
    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
    // That should allow `1.2.3-pr.2` to pass.
    // However, `1.2.4-alpha.notready` should NOT be allowed,
    // even though it's within the range set by the comparators.
    for (let i = 0; i < set.length; i++) {
      debug(set[i].semver)
      if (set[i].semver === Comparator.ANY) {
        continue
      }

      if (set[i].semver.prerelease.length > 0) {
        const allowed = set[i].semver
        if (allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch) {
          return true
        }
      }
    }

    // Version has a -pre, but it's not one of the ones we like.
    return false
  }

  return true
}


/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

const Range = __webpack_require__(94)
const satisfies = (version, range, options) => {
  try {
    range = new Range(range, options)
  } catch (er) {
    return false
  }
  return range.test(version)
}
module.exports = satisfies


/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

const Range = __webpack_require__(94)

// Mostly just for testing and legacy API reasons
const toComparators = (range, options) =>
  new Range(range, options).set
    .map(comp => comp.map(c => c.value).join(' ').trim().split(' '))

module.exports = toComparators


/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const Range = __webpack_require__(94)

const maxSatisfying = (versions, range, options) => {
  let max = null
  let maxSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!max || maxSV.compare(v) === -1) {
        // compare(max, v, true)
        max = v
        maxSV = new SemVer(max, options)
      }
    }
  })
  return max
}
module.exports = maxSatisfying


/***/ }),
/* 98 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const Range = __webpack_require__(94)
const minSatisfying = (versions, range, options) => {
  let min = null
  let minSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!min || minSV.compare(v) === 1) {
        // compare(min, v, true)
        min = v
        minSV = new SemVer(min, options)
      }
    }
  })
  return min
}
module.exports = minSatisfying


/***/ }),
/* 99 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const Range = __webpack_require__(94)
const gt = __webpack_require__(86)

const minVersion = (range, loose) => {
  range = new Range(range, loose)

  let minver = new SemVer('0.0.0')
  if (range.test(minver)) {
    return minver
  }

  minver = new SemVer('0.0.0-0')
  if (range.test(minver)) {
    return minver
  }

  minver = null
  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    comparators.forEach((comparator) => {
      // Clone to avoid manipulating the comparator's semver object.
      const compver = new SemVer(comparator.semver.version)
      switch (comparator.operator) {
        case '>':
          if (compver.prerelease.length === 0) {
            compver.patch++
          } else {
            compver.prerelease.push(0)
          }
          compver.raw = compver.format()
          /* fallthrough */
        case '':
        case '>=':
          if (!minver || gt(minver, compver)) {
            minver = compver
          }
          break
        case '<':
        case '<=':
          /* Ignore maximum versions */
          break
        /* istanbul ignore next */
        default:
          throw new Error(`Unexpected operation: ${comparator.operator}`)
      }
    })
  }

  if (minver && range.test(minver)) {
    return minver
  }

  return null
}
module.exports = minVersion


/***/ }),
/* 100 */
/***/ (function(module, exports, __webpack_require__) {

const Range = __webpack_require__(94)
const validRange = (range, options) => {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, options).range || '*'
  } catch (er) {
    return null
  }
}
module.exports = validRange


/***/ }),
/* 101 */
/***/ (function(module, exports, __webpack_require__) {

const SemVer = __webpack_require__(68)
const Comparator = __webpack_require__(93)
const {ANY} = Comparator
const Range = __webpack_require__(94)
const satisfies = __webpack_require__(95)
const gt = __webpack_require__(86)
const lt = __webpack_require__(87)
const lte = __webpack_require__(90)
const gte = __webpack_require__(89)

const outside = (version, range, hilo, options) => {
  version = new SemVer(version, options)
  range = new Range(range, options)

  let gtfn, ltefn, ltfn, comp, ecomp
  switch (hilo) {
    case '>':
      gtfn = gt
      ltefn = lte
      ltfn = lt
      comp = '>'
      ecomp = '>='
      break
    case '<':
      gtfn = lt
      ltefn = gte
      ltfn = gt
      comp = '<'
      ecomp = '<='
      break
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"')
  }

  // If it satisifes the range it is not outside
  if (satisfies(version, range, options)) {
    return false
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    let high = null
    let low = null

    comparators.forEach((comparator) => {
      if (comparator.semver === ANY) {
        comparator = new Comparator('>=0.0.0')
      }
      high = high || comparator
      low = low || comparator
      if (gtfn(comparator.semver, high.semver, options)) {
        high = comparator
      } else if (ltfn(comparator.semver, low.semver, options)) {
        low = comparator
      }
    })

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) &&
        ltefn(version, low.semver)) {
      return false
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false
    }
  }
  return true
}

module.exports = outside


/***/ }),
/* 102 */
/***/ (function(module, exports, __webpack_require__) {

// Determine if version is greater than all the versions possible in the range.
const outside = __webpack_require__(101)
const gtr = (version, range, options) => outside(version, range, '>', options)
module.exports = gtr


/***/ }),
/* 103 */
/***/ (function(module, exports, __webpack_require__) {

const outside = __webpack_require__(101)
// Determine if version is less than all the versions possible in the range
const ltr = (version, range, options) => outside(version, range, '<', options)
module.exports = ltr


/***/ }),
/* 104 */
/***/ (function(module, exports, __webpack_require__) {

const Range = __webpack_require__(94)
const intersects = (r1, r2, options) => {
  r1 = new Range(r1, options)
  r2 = new Range(r2, options)
  return r1.intersects(r2)
}
module.exports = intersects


/***/ }),
/* 105 */
/***/ (function(module, exports, __webpack_require__) {

// given a set of versions and a range, create a "simplified" range
// that includes the same versions that the original range does
// If the original range is shorter than the simplified one, return that.
const satisfies = __webpack_require__(95)
const compare = __webpack_require__(76)
module.exports = (versions, range, options) => {
  const set = []
  let min = null
  let prev = null
  const v = versions.sort((a, b) => compare(a, b, options))
  for (const version of v) {
    const included = satisfies(version, range, options)
    if (included) {
      prev = version
      if (!min)
        min = version
    } else {
      if (prev) {
        set.push([min, prev])
      }
      prev = null
      min = null
    }
  }
  if (min)
    set.push([min, null])

  const ranges = []
  for (const [min, max] of set) {
    if (min === max)
      ranges.push(min)
    else if (!max && min === v[0])
      ranges.push('*')
    else if (!max)
      ranges.push(`>=${min}`)
    else if (min === v[0])
      ranges.push(`<=${max}`)
    else
      ranges.push(`${min} - ${max}`)
  }
  const simplified = ranges.join(' || ')
  const original = typeof range.raw === 'string' ? range.raw : String(range)
  return simplified.length < original.length ? simplified : range
}


/***/ }),
/* 106 */
/***/ (function(module, exports, __webpack_require__) {

const Range = __webpack_require__(94)
const { ANY } = __webpack_require__(93)
const satisfies = __webpack_require__(95)
const compare = __webpack_require__(76)

// Complex range `r1 || r2 || ...` is a subset of `R1 || R2 || ...` iff:
// - Every simple range `r1, r2, ...` is a subset of some `R1, R2, ...`
//
// Simple range `c1 c2 ...` is a subset of simple range `C1 C2 ...` iff:
// - If c is only the ANY comparator
//   - If C is only the ANY comparator, return true
//   - Else return false
// - Let EQ be the set of = comparators in c
// - If EQ is more than one, return true (null set)
// - Let GT be the highest > or >= comparator in c
// - Let LT be the lowest < or <= comparator in c
// - If GT and LT, and GT.semver > LT.semver, return true (null set)
// - If EQ
//   - If GT, and EQ does not satisfy GT, return true (null set)
//   - If LT, and EQ does not satisfy LT, return true (null set)
//   - If EQ satisfies every C, return true
//   - Else return false
// - If GT
//   - If GT is lower than any > or >= comp in C, return false
//   - If GT is >=, and GT.semver does not satisfy every C, return false
// - If LT
//   - If LT.semver is greater than that of any > comp in C, return false
//   - If LT is <=, and LT.semver does not satisfy every C, return false
// - If any C is a = range, and GT or LT are set, return false
// - Else return true

const subset = (sub, dom, options) => {
  sub = new Range(sub, options)
  dom = new Range(dom, options)
  let sawNonNull = false

  OUTER: for (const simpleSub of sub.set) {
    for (const simpleDom of dom.set) {
      const isSub = simpleSubset(simpleSub, simpleDom, options)
      sawNonNull = sawNonNull || isSub !== null
      if (isSub)
        continue OUTER
    }
    // the null set is a subset of everything, but null simple ranges in
    // a complex range should be ignored.  so if we saw a non-null range,
    // then we know this isn't a subset, but if EVERY simple range was null,
    // then it is a subset.
    if (sawNonNull)
      return false
  }
  return true
}

const simpleSubset = (sub, dom, options) => {
  if (sub.length === 1 && sub[0].semver === ANY)
    return dom.length === 1 && dom[0].semver === ANY

  const eqSet = new Set()
  let gt, lt
  for (const c of sub) {
    if (c.operator === '>' || c.operator === '>=')
      gt = higherGT(gt, c, options)
    else if (c.operator === '<' || c.operator === '<=')
      lt = lowerLT(lt, c, options)
    else
      eqSet.add(c.semver)
  }

  if (eqSet.size > 1)
    return null

  let gtltComp
  if (gt && lt) {
    gtltComp = compare(gt.semver, lt.semver, options)
    if (gtltComp > 0)
      return null
    else if (gtltComp === 0 && (gt.operator !== '>=' || lt.operator !== '<='))
      return null
  }

  // will iterate one or zero times
  for (const eq of eqSet) {
    if (gt && !satisfies(eq, String(gt), options))
      return null

    if (lt && !satisfies(eq, String(lt), options))
      return null

    for (const c of dom) {
      if (!satisfies(eq, String(c), options))
        return false
    }
    return true
  }

  let higher, lower
  let hasDomLT, hasDomGT
  for (const c of dom) {
    hasDomGT = hasDomGT || c.operator === '>' || c.operator === '>='
    hasDomLT = hasDomLT || c.operator === '<' || c.operator === '<='
    if (gt) {
      if (c.operator === '>' || c.operator === '>=') {
        higher = higherGT(gt, c, options)
        if (higher === c)
          return false
      } else if (gt.operator === '>=' && !satisfies(gt.semver, String(c), options))
        return false
    }
    if (lt) {
      if (c.operator === '<' || c.operator === '<=') {
        lower = lowerLT(lt, c, options)
        if (lower === c)
          return false
      } else if (lt.operator === '<=' && !satisfies(lt.semver, String(c), options))
        return false
    }
    if (!c.operator && (lt || gt) && gtltComp !== 0)
      return false
  }

  // if there was a < or >, and nothing in the dom, then must be false
  // UNLESS it was limited by another range in the other direction.
  // Eg, >1.0.0 <1.0.1 is still a subset of <2.0.0
  if (gt && hasDomLT && !lt && gtltComp !== 0)
    return false

  if (lt && hasDomGT && !gt && gtltComp !== 0)
    return false

  return true
}

// >=1.2.3 is lower than >1.2.3
const higherGT = (a, b, options) => {
  if (!a)
    return b
  const comp = compare(a.semver, b.semver, options)
  return comp > 0 ? a
    : comp < 0 ? b
    : b.operator === '>' && a.operator === '>=' ? b
    : a
}

// <=1.2.3 is higher than <1.2.3
const lowerLT = (a, b, options) => {
  if (!a)
    return b
  const comp = compare(a.semver, b.semver, options)
  return comp < 0 ? a
    : comp > 0 ? b
    : b.operator === '<' && a.operator === '<=' ? b
    : a
}

module.exports = subset


/***/ }),
/* 107 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.showStartMessages = void 0;
const versioning_1 = __webpack_require__(63);
const update_1 = __webpack_require__(108);
const welcome_1 = __webpack_require__(109);
/** Initialization of the icons every time the theme get activated */
exports.showStartMessages = (status) => {
    if (status === versioning_1.ThemeStatus.updated) {
        update_1.showUpdateMessage();
    }
    else if (status === versioning_1.ThemeStatus.neverUsedBefore) {
        welcome_1.showWelcomeMessage();
    }
};


/***/ }),
/* 108 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.showUpdateMessage = void 0;
const vscode = __webpack_require__(1);
const activate_1 = __webpack_require__(3);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Show the update message if the icon theme has been updated. */
exports.showUpdateMessage = () => {
    // if the user does not want to see the update message
    if (helpers.getThemeConfig('showUpdateMessage').globalValue !== true)
        return;
    vscode.window
        .showInformationMessage(i18n.translate('themeUpdated'), helpers.isThemeNotVisible() ? i18n.translate('activate') : undefined, i18n.translate('readChangelog'), i18n.translate('neverShowAgain'))
        .then(handleUpdateMessageActions);
};
/** Handle the actions of the update message. */
const handleUpdateMessageActions = (value) => {
    switch (value) {
        case i18n.translate('activate'):
            activate_1.activateIcons();
            break;
        case i18n.translate('readChangelog'):
            vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items/PKief.material-icon-theme/changelog'));
            break;
        case i18n.translate('neverShowAgain'):
            disableUpdateMessage();
            break;
        default:
            break;
    }
};
/** Disable the update messages in the global settings */
const disableUpdateMessage = () => {
    helpers.setThemeConfig('showUpdateMessage', false, true);
};


/***/ }),
/* 109 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.showWelcomeMessage = void 0;
const vscode = __webpack_require__(1);
const activate_1 = __webpack_require__(3);
const helpers = __webpack_require__(4);
const i18n = __webpack_require__(40);
/** Show the welcome message if the icon theme has been installed the first time. */
exports.showWelcomeMessage = () => {
    // if the user does not want to see the welcome message
    if (helpers.getThemeConfig('showWelcomeMessage').globalValue === false)
        return;
    vscode.window
        .showInformationMessage(i18n.translate('themeInstalled'), helpers.isThemeNotVisible() ? i18n.translate('activate') : undefined, i18n.translate('neverShowAgain'))
        .then(handleWelcomeMessageActions);
};
/** Handle the actions of the welcome message. */
const handleWelcomeMessageActions = (value) => {
    switch (value) {
        case i18n.translate('activate'):
            activate_1.activateIcons();
            break;
        case i18n.translate('howToActivate'):
            vscode.env.openExternal(vscode.Uri.parse('https://code.visualstudio.com/blogs/2016/09/08/icon-themes#_file-icon-themes'));
            break;
        case i18n.translate('neverShowAgain'):
            disableWelcomeMessage();
            break;
        default:
            break;
    }
};
/** Disable the welcome messages in the global settings */
const disableWelcomeMessage = () => {
    helpers.setThemeConfig('showWelcomeMessage', false, true);
};


/***/ })
/******/ ]);
//# sourceMappingURL=extension.js.map