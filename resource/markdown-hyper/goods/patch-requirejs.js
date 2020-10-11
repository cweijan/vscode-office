// PATCH require.js so that we can require("./anything.css")
// tested with RequireJS 2.3
//
// Doesn't support old browsers like IE6

(function () {
  if (typeof requirejs !== 'function') {
    console.error("[HyperMD RequireJS Patch] Please apply this patch after RequireJS's <script>. Besides, script tags can NOT be async")
    throw new Error("RequireJS not Found")
  }

  for (var _ in requirejs.s.contexts._.defined) {
    console.warn("[HyperMD RequireJS Patch] Please apply this patch BEFORE loading any module.")
    break
  }

  var old_requirejs_load = requirejs.load
  requirejs.load = function (context, moduleId, url) {
    if (/\.css$/.test(moduleId)) {
      // Load CSS with a buggy method
      // @see http://www.phpied.com/files/cssonload/test.html

      url = url.replace('.css.js', '.css')

      var config = (context && context.config) || {}
      var onLoad = context.onScriptLoad
      var onError = context.onScriptError

      if (true /*isBrowser*/) {
        var node

        if (/Firefox\/[0-5]?\d\b/.test(navigator.userAgent)) {
          // old Firefox doesn't trig <link> onload event
          // @see http://www.phpied.com/files/cssonload/test.html

          node = document.createElement('style')
          node.textContent = '@import "' + url + '"'

          var fi = setInterval(function () {
            try {
              node.sheet.cssRules; // only populated when file is loaded
              console.log("loaded " + url)
              clearInterval(fi)
              // onLoad() // not work with <style>
              context.completeLoad(moduleId) // ignore IE6-8
            } catch (e) { }
          }, 10)

        } else {
          // create a <link> and bind eventHandlers

          node = document.createElement("link")
          node.type = "text/css"
          node.rel = "stylesheet"
          node.href = url

          node.addEventListener('load', onLoad, false);
          node.addEventListener('error', onError, false);
        }

        node.setAttribute('data-requirecontext', context.contextName)
        node.setAttribute('data-requiremodule', moduleId)
        document.head.appendChild(node)
      }

      // supress RequireJS default loading
      return
    }

    return old_requirejs_load.call(this, context, moduleId, url)
  }
})()
