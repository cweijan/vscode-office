/**
 * QMD (Quarto Markdown) Preprocessor for TypeScript
 * Converts QMD-specific syntax to standard HTML before markdown rendering.
 */

/**
 * Get icon for callout type
 */
function getCalloutIcon(type: string): string {
    const icons: Record<string, string> = {
        note: 'ℹ️',
        warning: '⚠️',
        tip: '💡',
        important: '❗',
        caution: '🔴'
    };
    return icons[type] || 'ℹ️';
}

/**
 * Process QMD callout blocks
 * Converts ::: {.callout-*} syntax to HTML divs
 */
function processCallouts(text: string): string {
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
 * Process generic fenced divs
 * Converts ::: {.class} syntax to HTML divs
 */
function processDivs(text: string): string {
    const divRegex = /^:::\s*\{\.(?!callout-)([a-zA-Z0-9_-]+)\s*\}\s*$([\s\S]*?)^:::\s*$/gm;

    return text.replace(divRegex, (match, className, content) => {
        return `<div class="${className}">

${content.trim()}

</div>`;
    });
}

/**
 * Process inline spans with attributes
 * Converts [text]{.class} syntax to HTML spans
 */
function processSpans(text: string): string {
    const spanRegex = /\[([^\]]+)\]\{\.([a-zA-Z0-9_-]+)\}/g;

    return text.replace(spanRegex, (match, content, className) => {
        return `<span class="${className}">${content}</span>`;
    });
}

/**
 * Extract YAML front matter
 */
function extractFrontMatter(text: string): { frontMatter: string; content: string } {
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
 */
export function preprocessQmd(text: string): string {
    const { frontMatter, content } = extractFrontMatter(text);

    let processed = content;
    processed = processCallouts(processed);
    processed = processDivs(processed);
    processed = processSpans(processed);

    return frontMatter + processed;
}

/**
 * Check if a file is a QMD file
 */
export function isQmdFile(filename: string): boolean {
    return filename?.toLowerCase().endsWith('.qmd') ?? false;
}
