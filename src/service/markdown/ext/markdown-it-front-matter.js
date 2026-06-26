const markdownItFrontMatter = require('markdown-it-front-matter')
const { parseYamlProperties, renderPropertiesPanel } = require('../yamlProperties')

module.exports = function markdownItFrontMatterExport(md) {
  let frontMatterHtml = ''

  md.use(markdownItFrontMatter, (raw) => {
    const properties = parseYamlProperties(raw)
    frontMatterHtml = renderPropertiesPanel(properties, md.utils.escapeHtml)
  })

  const defaultRender = md.render.bind(md)
  md.render = function renderWithFrontMatter(src, env) {
    frontMatterHtml = ''
    const html = defaultRender(src, env)
    return frontMatterHtml ? `${frontMatterHtml}\n${html}` : html
  }
}
