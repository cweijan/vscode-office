function init_toc(cm) {
  var $toc = document.getElementById('toc')
  var lastTOC = ""

  var update = HyperMD.debounce(function () {
    var newTOC = ""
    cm.eachLine(function (line) {
      var tmp = /^(#+)\s+(.+)(?:\s+\1)?$/.exec(line.text)
      if (!tmp) return
      var lineNo = line.lineNo()
      if (!cm.getStateAfter(lineNo).header) return // double check but is not header
      var level = tmp[1].length

      var title = tmp[2]
      title = title.replace(/([*_]{1,2}|~~|`+)(.+?)\1/g, '$2') // em / bold / del / code
      title = title.replace(/\\(?=.)|\[\^.+?\]|\!\[((?:[^\\\]]+|\\.)+)\](\(.+?\)| ?\[.+?\])?/g, '') // images / escaping slashes / footref
      title = title.replace(/\[((?:[^\\\]]+|\\.)+)\](\(.+?\)| ?\[.+?\])/g, '$1') // links
      title = title.replace(/&/g, '&amp;')
      title = title.replace(/</g, '&lt;')
      newTOC += '<div data-line="' + lineNo + '" class="toc-item" style="padding-left:' + level + 'em">' + title + '</div>'
    })
    if (newTOC == lastTOC) return
    $toc.innerHTML = lastTOC = newTOC
  }, 300)

  cm.on('changes', update)

  $toc.addEventListener('click', function (ev) {
    var t = ev.target
    if (!/toc-item/.test(t.className)) return
    var lineNo = ~~t.getAttribute('data-line')
    cm.setCursor({ line: cm.lastLine(), ch: 0 })
    setTimeout(function () {
      cm.setCursor({ line: lineNo, ch: 0 })
    }, 10)
  }, true)
}
