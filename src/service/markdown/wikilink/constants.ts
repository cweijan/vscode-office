export const WIKI_URI_PREFIX = 'wiki:';

export const MARKDOWN_EXTENSIONS = ['.md', '.markdown'] as const;

/** findFiles 排除目录 */
export const FIND_FILES_EXCLUDE = '**/{node_modules,.git}/**';

/** 单次 findFiles 结果上限 */
export const FIND_FILES_LIMIT = 50;
