export const normalizePasteUrl = (url: string): string => {
    const trimmed = url.trim();
    if (/^www\./i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return trimmed;
};

export const isPasteableUrl = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed || /\s/.test(trimmed)) {
        return false;
    }
    let candidate = trimmed;
    if (/^www\./i.test(candidate)) {
        candidate = `https://${candidate}`;
    }
    if (!/^(?:https?|ftp|mailto):/i.test(candidate)) {
        return false;
    }
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol === "mailto:") {
            return true;
        }
        return parsed.hostname.includes(".");
    } catch {
        return false;
    }
};

export const formatLinkDisplayText = (url: string): string => {
    let display = url.trim();
    display = display.replace(/^(?:https?|ftp):\/\//i, "");
    display = display.replace(/^mailto:/i, "");
    return display.replace(/\/+$/, "");
};

export const toMarkdownLink = (text: string, href: string): string => {
    return `[${text}](${normalizePasteUrl(href)})`;
};

export const linkifyPastePlainText = (text: string, linkText?: string): string => {
    const trimmed = text.trim();
    if (!isPasteableUrl(trimmed)) {
        return text;
    }
    const href = normalizePasteUrl(trimmed);
    const display = linkText ?? formatLinkDisplayText(trimmed);
    const start = text.indexOf(trimmed);
    if (start === -1) {
        return toMarkdownLink(display, href);
    }
    const leading = text.slice(0, start);
    const trailing = text.slice(start + trimmed.length);
    return leading + toMarkdownLink(display, href) + trailing;
};
