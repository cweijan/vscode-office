/** 判断链接地址是否需要用尖括号包裹才能在 Markdown 中正确解析 */
export const needsAngleBracketLinkDest = (dest: string): boolean => {
    for (let i = 0; i < dest.length; i++) {
        const code = dest.charCodeAt(i);
        if (code <= 0x20 || code === 0x7f) {
            return true;
        }
        const ch = dest[i];
        if (ch === "<" || ch === ">") {
            return true;
        }
    }
    return false;
};

/** 将链接地址格式化为 Markdown 中的 destination 部分 */
export const formatMarkdownLinkDest = (dest: string): string => {
    const trimmed = dest.trim();
    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
        return trimmed;
    }
    if (needsAngleBracketLinkDest(trimmed)) {
        return `<${trimmed}>`;
    }
    return trimmed;
};

/** 规范化链接编辑输入，去掉用户手动输入的尖括号包裹 */
export const normalizeLinkDestInput = (dest: string): string => {
    const trimmed = dest.trim();
    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};
