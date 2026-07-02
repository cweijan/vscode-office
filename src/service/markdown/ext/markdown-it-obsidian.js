function isTagChar(code) {
  return (code >= 0x61 && code <= 0x7a)
    || (code >= 0x41 && code <= 0x5a)
    || (code >= 0x30 && code <= 0x39)
    || code === 0x5f
    || code === 0x2d
    || code === 0x2f
}

function parseWikiLink(raw) {
  const pipe = raw.indexOf('|')
  if (pipe >= 0) {
    return {
      dest: raw.slice(0, pipe).trim(),
      alias: raw.slice(pipe + 1).trim(),
    }
  }
  return { dest: raw.trim(), alias: '' }
}

function readWikiLink(state, embed) {
  const marker = embed ? '![' : '['
  const start = state.pos
  if (!state.src.startsWith(marker, start) || state.src.charCodeAt(start + marker.length) !== 0x5b) {
    return null
  }

  let pos = start + marker.length + 1
  const close = state.src.indexOf(']]', pos)
  if (close < 0) {
    return null
  }

  const raw = state.src.slice(pos, close)
  if (!raw || raw.includes('\n')) {
    return null
  }

  return { raw, end: close + 2 }
}

function wikiLinkPlugin(md, embed) {
  const tokenType = embed ? 'wikilink_embed' : 'wikilink'
  const className = embed ? 'obsidian-wikilink-embed' : 'obsidian-wikilink'

  md.inline.ruler.before('link', tokenType, (state, silent) => {
    const parsed = readWikiLink(state, embed)
    if (!parsed) {
      return false
    }

    if (silent) {
      return true
    }

    const { dest, alias } = parseWikiLink(parsed.raw)
    const token = state.push(tokenType, embed ? 'span' : 'a', 0)
    token.content = alias || dest
    token.meta = { dest }
    token.markup = embed ? '![[' : '[['
    state.pos = parsed.end
    return true
  })

  md.renderer.rules[tokenType] = (tokens, idx) => {
    const token = tokens[idx]
    const display = md.utils.escapeHtml(token.content)
    const dest = md.utils.escapeHtml(token.meta.dest)
    if (embed) {
      return `<span class="${className}" data-href="${dest}">${display}</span>`
    }
    return `<a class="${className}" data-href="${dest}" href="#">${display}</a>`
  }
}

function obsidianTagPlugin(md) {
  md.inline.ruler.before('emphasis', 'obsidian_tag', (state, silent) => {
    const max = state.posMax
    if (state.src.charCodeAt(state.pos) !== 0x23) {
      return false
    }
    if (state.pos + 1 >= max || !isTagChar(state.src.charCodeAt(state.pos + 1))) {
      return false
    }

    let pos = state.pos + 1
    while (pos < max && isTagChar(state.src.charCodeAt(pos))) {
      pos++
    }
    if (pos === state.pos + 1) {
      return false
    }

    if (silent) {
      return true
    }

    const token = state.push('obsidian_tag', 'span', 0)
    token.content = state.src.slice(state.pos, pos)
    state.pos = pos
    return true
  })

  md.renderer.rules.obsidian_tag = (tokens, idx) => {
    const content = tokens[idx].content
    return `<span class="obsidian-tag">${md.utils.escapeHtml(content)}</span>`
  }
}

module.exports = function markdownItObsidian(md) {
  wikiLinkPlugin(md, true)
  wikiLinkPlugin(md, false)
  obsidianTagPlugin(md)
}
