import { getConfigs } from '../../util/vscodeConfig';

const ICON_FILES = new Set([
    'apk.svg', 'c.svg', 'c#.svg', 'c++.svg', 'cmake.svg', 'console.svg', 'css.svg',
    'docker.svg', 'dmg.png', 'exe.svg', 'file.svg', 'forward.svg', 'go.svg',
    'gradle.svg', 'html.svg', 'image.svg', 'iso.png', 'jar.svg', 'java.svg',
    'javascript.svg', 'json.svg', 'jsx.svg', 'key.svg', 'kt.svg', 'less.svg',
    'lib.svg', 'log.svg', 'lua.svg', 'm4a.svg', 'md.svg', 'mp3.svg', 'pdf.svg',
    'php.svg', 'pkg.png', 'powerpoint.svg', 'ps1.svg', 'py.svg', 'rb.svg',
    'sass.svg', 'scala.svg', 'scss.svg', 'settings.svg', 'sql.svg', 'svg.svg',
    'typescript.svg', 'video.svg', 'vue.svg', 'word.svg', 'xml.svg', 'yaml.svg',
    'yarn.svg', 'zip.svg',
    'folder-config.svg', 'folder-container.svg', 'folder-core.svg', 'folder-temp.svg', 'folder.svg',
]);

const EXT_ICON_MAP: Record<string, string> = {
    c: 'c.svg',
    h: 'c.svg',
    avi: 'video.svg',
    mp4: 'video.svg',
    sqlbook: 'sql.svg',
    sql: 'sql.svg',
    xlsx: 'xml.svg',
    xls: 'xml.svg',
    xlsm: 'xml.svg',
    appxbundle: 'exe.svg',
    msi: 'exe.svg',
    iso: 'iso.png',
    ts: 'typescript.svg',
    sh: 'console.svg',
    pkg: 'pkg.png',
    dmg: 'dmg.png',
    pub: 'key.svg',
    pem: 'key.svg',
    docx: 'word.svg',
    doc: 'word.svg',
    dotx: 'word.svg',
    yml: 'yaml.svg',
    yaml: 'yaml.svg',
    java: 'java.svg',
    class: 'java.svg',
    pac: 'javascript.svg',
    js: 'javascript.svg',
    map: 'javascript.svg',
    mjs: 'javascript.svg',
    cjs: 'javascript.svg',
    cfg: 'settings.svg',
    conf: 'settings.svg',
    pptx: 'powerpoint.svg',
    ppt: 'powerpoint.svg',
    pptm: 'powerpoint.svg',
    bmp: 'image.svg',
    gif: 'image.svg',
    png: 'image.svg',
    jpg: 'image.svg',
    jpeg: 'image.svg',
    webp: 'image.svg',
    rar: 'zip.svg',
    zip: 'zip.svg',
    '7z': 'zip.svg',
    gz: 'zip.svg',
    tgz: 'zip.svg',
    tar: 'zip.svg',
    jar: 'jar.svg',
    apk: 'apk.svg',
    vsix: 'zip.svg',
    md: 'md.svg',
    pdf: 'pdf.svg',
    html: 'html.svg',
    htm: 'html.svg',
    css: 'css.svg',
    scss: 'scss.svg',
    sass: 'sass.svg',
    less: 'less.svg',
    json: 'json.svg',
    xml: 'xml.svg',
    py: 'py.svg',
    rb: 'rb.svg',
    go: 'go.svg',
    php: 'php.svg',
    vue: 'vue.svg',
    jsx: 'jsx.svg',
    kt: 'kt.svg',
    lua: 'lua.svg',
    scala: 'scala.svg',
    gradle: 'gradle.svg',
    ps1: 'ps1.svg',
    mp3: 'mp3.svg',
    m4a: 'm4a.svg',
    log: 'log.svg',
    exe: 'exe.svg',
    cs: 'c#.svg',
    cpp: 'c++.svg',
    cxx: 'c++.svg',
    cc: 'c++.svg',
};

function basename(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const index = normalized.lastIndexOf('/');
    return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function tryExtIcon(ext: string): string | null {
    const svg = `${ext}.svg`;
    if (ICON_FILES.has(svg)) return svg;
    const png = `${ext}.png`;
    if (ICON_FILES.has(png)) return png;
    return null;
}

export function getIconFileName(fileName: string): string {
    const lower = fileName.toLowerCase();
    const base = basename(lower);

    switch (base) {
        case 'makefile':
            return 'cmake.svg';
        case 'dockerfile':
            return 'docker.svg';
    }

    const dot = base.lastIndexOf('.');
    const ext = dot >= 0 ? base.slice(dot + 1) : '';
    const direct = ext ? tryExtIcon(ext) : null;
    if (direct) return direct;

    return EXT_ICON_MAP[ext] ?? 'file.svg';
}

export function getFolderIconFileName(folderName: string): string {
    switch (folderName.toLowerCase()) {
        case 'root':
        case 'home':
            return 'folder-core.svg';
        case 'etc':
            return 'folder-config.svg';
        case 'tmp':
            return 'folder-temp.svg';
        case 'containerd':
            return 'folder-container.svg';
        default:
            return 'folder.svg';
    }
}

export function getFileIconUrl(fileName: string): string | null {
    const baseUrl = getConfigs()?.iconBaseUrl;
    if (!baseUrl || !fileName) return null;
    return `${baseUrl}/${getIconFileName(fileName)}`;
}

export function getFolderIconUrl(folderName: string): string | null {
    const baseUrl = getConfigs()?.iconBaseUrl;
    if (!baseUrl || !folderName) return null;
    return `${baseUrl}/${getFolderIconFileName(folderName)}`;
}
