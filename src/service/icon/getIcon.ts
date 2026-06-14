import { existsSync } from 'fs';
import { basename, extname } from 'path';

const ICON_DIR = 'resource/icon';

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
};

export function getIconFileName(fileName: string, iconDir?: string): string {
    const lower = fileName.toLowerCase();
    const base = basename(lower);

    switch (base) {
        case 'makefile':
            return 'cmake.svg';
        case 'dockerfile':
            return 'docker.svg';
    }

    const ext = extname(base).replace('.', '');
    if (ext && iconDir) {
        const directSvg = `${ext}.svg`;
        if (existsSync(`${iconDir}/${directSvg}`)) {
            return directSvg;
        }
        const directPng = `${ext}.png`;
        if (existsSync(`${iconDir}/${directPng}`)) {
            return directPng;
        }
    }

    return EXT_ICON_MAP[ext] ?? 'file.svg';
}

export function getIcon(extensionPath: string, fileName: string): string {
    const iconDir = `${extensionPath}/${ICON_DIR}`;
    const iconFile = getIconFileName(fileName, iconDir);
    return `${iconDir}/${iconFile}`;
}
