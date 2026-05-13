/**
 * QMD (Quarto Markdown) Preprocessor
 * Converts QMD-specific syntax to standard HTML before markdown rendering.
 */

/**
 * Process QMD callout blocks
 * Converts ::: {.callout-*} syntax to HTML divs
 *
 * @param {string} text - markdown content
 * @returns {string} - processed content
 */
function processCallouts(text) {
    // Match callout blocks: ::: {.callout-type} or ::: {.callout-type title="..."}
    const calloutRegex = /^:::\s*\{\.callout-(note|warning|tip|important|caution)(?:\s+title="([^"]*)")?\s*\}\s*$([\s\S]*?)^:::\s*$/gm;

    return text.replace(calloutRegex, (match, type, title, content) => {
        const titleText = title || type.charAt(0).toUpperCase() + type.slice(1);
        const icon = getCalloutIcon(type);
        return `<div class="callout callout-${type}">
<div class="callout-header">
<span class="callout-icon">${icon}</span>
<span class="callout-title">${titleText}</span>
</div>
<div class="callout-content">

${content.trim()}

</div>
</div>`;
    });
}

/**
 * Get icon for callout type
 */
function getCalloutIcon(type) {
    const icons = {
        note: 'ℹ️',
        warning: '⚠️',
        tip: '💡',
        important: '❗',
        caution: '🔴'
    };
    return icons[type] || 'ℹ️';
}

/**
 * Process generic fenced divs
 * Converts ::: {.class} syntax to HTML divs
 *
 * @param {string} text - markdown content
 * @returns {string} - processed content
 */
function processDivs(text) {
    // Match generic divs: ::: {.class} (not callouts)
    const divRegex = /^:::\s*\{\.(?!callout-)([a-zA-Z0-9_-]+)\s*\}\s*$([\s\S]*?)^:::\s*$/gm;

    return text.replace(divRegex, (match, className, content) => {
        return `<div class="${className}">

${content.trim()}

</div>`;
    });
}

/**
 * Process code cell options (remove #| lines for preview)
 *
 * @param {string} text - markdown content
 * @param {boolean} stripOptions - whether to strip #| options
 * @returns {string} - processed content
 */
function processCodeCellOptions(text, stripOptions = false) {
    if (!stripOptions) return text;

    // Remove #| option lines from code blocks
    const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;

    return text.replace(codeBlockRegex, (match, lang, content) => {
        const lines = content.split('\n');
        const filteredLines = lines.filter(line => !line.trim().startsWith('#|'));
        return '```' + lang + '\n' + filteredLines.join('\n') + '```';
    });
}

/**
 * Process inline spans with attributes
 * Converts [text]{.class} syntax to HTML spans
 *
 * @param {string} text - markdown content
 * @returns {string} - processed content
 */
function processSpans(text) {
    // Match [text]{.class} pattern
    const spanRegex = /\[([^\]]+)\]\{\.([a-zA-Z0-9_-]+)\}/g;

    return text.replace(spanRegex, (match, content, className) => {
        return `<span class="${className}">${content}</span>`;
    });
}

/**
 * Strip YAML front matter for certain processing scenarios
 *
 * @param {string} text - markdown content
 * @returns {{frontMatter: string, content: string}}
 */
function extractFrontMatter(text) {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = text.match(frontMatterRegex);

    if (match) {
        return {
            frontMatter: match[0],
            content: text.slice(match[0].length)
        };
    }
    return { frontMatter: '', content: text };
}

/**
 * Main preprocessing function for QMD files
 *
 * @param {string} text - QMD content
 * @param {object} options - preprocessing options
 * @returns {string} - processed content ready for markdown rendering
 */
function preprocessQmd(text, options = {}) {
    const { stripCodeOptions = false } = options;

    // Extract front matter to preserve it
    const { frontMatter, content } = extractFrontMatter(text);

    // Process QMD-specific syntax
    let processed = content;
    processed = processCallouts(processed);
    processed = processDivs(processed);
    processed = processSpans(processed);
    processed = processCodeCellOptions(processed, stripCodeOptions);

    return frontMatter + processed;
}

/**
 * Check if a file is a QMD file
 *
 * @param {string} filename - file path
 * @returns {boolean}
 */
function isQmdFile(filename) {
    return filename && filename.toLowerCase().endsWith('.qmd');
}

module.exports = {
    preprocessQmd,
    processCallouts,
    processDivs,
    processSpans,
    processCodeCellOptions,
    isQmdFile
};
