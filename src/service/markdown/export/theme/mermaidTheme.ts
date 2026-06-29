import type { ExportThemeSettings } from '../types';

const CUSTOM_MERMAID_THEMES = {
    Ocean: {
        background: '#f3fbff',
        panel: '#ffffff',
        foreground: '#183042',
        muted: '#5c7485',
        border: '#9bc9dc',
        accent: '#147fb5',
        secondary: '#53c2c5',
        tertiary: '#8ea7ff',
        note: '#d9f3ff',
        warning: '#f2b84b',
        error: '#d25b6a',
    },
    Sunset: {
        background: '#fff8f0',
        panel: '#ffffff',
        foreground: '#3d261f',
        muted: '#8a6556',
        border: '#e3b69b',
        accent: '#d96c2c',
        secondary: '#f0a03f',
        tertiary: '#c46fa1',
        note: '#ffe4bd',
        warning: '#d99b25',
        error: '#c24645',
    },
    Dracula: {
        background: '#282a36',
        panel: '#343746',
        foreground: '#f8f8f2',
        muted: '#bdc1d6',
        border: '#6272a4',
        accent: '#bd93f9',
        secondary: '#8be9fd',
        tertiary: '#ff79c6',
        note: '#44475a',
        warning: '#f1fa8c',
        error: '#ff5555',
        darkMode: true,
    },
    Monokai: {
        background: '#272822',
        panel: '#35362f',
        foreground: '#f8f8f2',
        muted: '#cfcfc2',
        border: '#75715e',
        accent: '#a6e22e',
        secondary: '#66d9ef',
        tertiary: '#ae81ff',
        note: '#49483e',
        warning: '#e6db74',
        error: '#f92672',
        darkMode: true,
    },
    Nord: {
        background: '#2e3440',
        panel: '#3b4252',
        foreground: '#eceff4',
        muted: '#d8dee9',
        border: '#4c566a',
        accent: '#88c0d0',
        secondary: '#8fbcbb',
        tertiary: '#b48ead',
        note: '#434c5e',
        warning: '#ebcb8b',
        error: '#bf616a',
        darkMode: true,
    },
};

const MERMAID_BASE_CONFIG = {
    altFontFamily: 'sans-serif',
    flowchart: {
        htmlLabels: true,
        useMaxWidth: true,
    },
    fontFamily: 'sans-serif',
    gantt: {
        leftPadding: 75,
        rightPadding: 20,
    },
    securityLevel: 'loose',
    sequence: {
        boxMargin: 8,
        diagramMarginX: 8,
        diagramMarginY: 8,
        useMaxWidth: true,
    },
    startOnLoad: false,
};

const parseRgb = (color) => {
    const value = String(color || '').trim();
    if (!value) {
        return null;
    }
    if (value.startsWith('#')) {
        const hex = value.slice(1);
        if (hex.length === 3) {
            return [
                parseInt(hex[0] + hex[0], 16),
                parseInt(hex[1] + hex[1], 16),
                parseInt(hex[2] + hex[2], 16),
            ];
        }
        if (hex.length >= 6) {
            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
            ];
        }
    }
    const rgbMatch = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (rgbMatch) {
        return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    }
    return null;
};

const isDarkBackground = (color) => {
    const rgb = parseRgb(color);
    if (!rgb) {
        return false;
    }
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance < 0.5;
};

const readVar = (vars, name, fallback = '') => {
    const value = vars[name];
    return value && String(value).trim() ? String(value).trim() : fallback;
};

const contrastColor = (bg) => (isDarkBackground(bg) ? '#ffffff' : '#1f2020');

const buildCustomMermaidThemeConfig = (palette) => {
    const dark = palette.darkMode ?? isDarkBackground(palette.background);
    const noteText = contrastColor(palette.note);

    return {
        theme: 'base',
        themeVariables: {
            activationBkgColor: palette.accent,
            activationBorderColor: palette.accent,
            activeTaskBkgColor: palette.accent,
            activeTaskBorderColor: palette.accent,
            actorBkg: palette.panel,
            actorBorder: palette.accent,
            actorLineColor: palette.muted,
            actorTextColor: palette.foreground,
            altBackground: palette.note,
            altSectionBkgColor: palette.warning,
            arrowheadColor: palette.muted,
            background: palette.background,
            border1: palette.accent,
            border2: palette.border,
            classText: palette.foreground,
            clusterBkg: palette.tertiary,
            clusterTextColor: contrastColor(palette.tertiary),
            clusterBorder: palette.accent,
            critBkgColor: palette.error,
            critBorderColor: palette.error,
            darkMode: dark,
            defaultLinkColor: palette.accent,
            doneTaskBkgColor: palette.muted,
            doneTaskBorderColor: palette.border,
            edgeLabelBackground: palette.background,
            errorBkgColor: palette.error,
            errorTextColor: contrastColor(palette.error),
            fillType0: palette.panel,
            fillType1: palette.accent,
            fillType2: palette.tertiary,
            fillType3: palette.secondary,
            fillType4: palette.note,
            fillType5: palette.warning,
            fillType6: palette.error,
            fillType7: palette.tertiary,
            fontFamily: 'sans-serif',
            fontSize: '16px',
            gridColor: palette.border,
            labelBackground: palette.background,
            labelBoxBkgColor: palette.panel,
            labelBoxBorderColor: palette.accent,
            labelColor: palette.foreground,
            labelTextColor: palette.foreground,
            lineColor: palette.muted,
            loopTextColor: palette.warning,
            mainBkg: palette.panel,
            mainContrastColor: palette.foreground,
            nodeBkg: palette.panel,
            nodeBorder: palette.accent,
            noteBkgColor: palette.note,
            noteBorderColor: palette.warning,
            noteTextColor: noteText,
            primaryBorderColor: palette.accent,
            primaryColor: palette.panel,
            primaryTextColor: palette.foreground,
            secondBkg: palette.secondary,
            secondaryBorderColor: palette.accent,
            secondaryColor: palette.accent,
            secondaryTextColor: contrastColor(palette.accent),
            sectionBkgColor: palette.note,
            sectionBkgColor2: palette.warning,
            sequenceNumberColor: contrastColor(palette.accent),
            signalColor: palette.accent,
            signalTextColor: palette.foreground,
            taskBkgColor: palette.secondary,
            taskBorderColor: palette.accent,
            taskTextClickableColor: palette.accent,
            taskTextColor: contrastColor(palette.secondary),
            taskTextDarkColor: '#1f2020',
            taskTextLightColor: '#ffffff',
            taskTextOutsideColor: palette.foreground,
            tertiaryBorderColor: palette.tertiary,
            tertiaryColor: palette.tertiary,
            tertiaryTextColor: contrastColor(palette.tertiary),
            textColor: palette.foreground,
            titleColor: palette.accent,
            todayLineColor: palette.error,
        },
    };
};

const buildAutoMermaidThemeConfig = (exportTheme) => {
    const vars = exportTheme?.cssVariables || {};
    const editorBg = readVar(vars, '--bg-color', '#ffffff');
    const dark = exportTheme?.isDark || isDarkBackground(editorBg);
    const bg = readVar(vars, '--toolbar-background-color', readVar(vars, '--second-bg-color', editorBg));
    const panelBg = readVar(vars, '--second-bg-color', readVar(vars, '--code-bg-color', bg));
    const fg = readVar(vars, '--front-color', dark ? '#d4d4d4' : '#333333');
    const codeBg = readVar(vars, '--code-bg-color', panelBg);
    const border = readVar(vars, '--border-color', dark ? '#444444' : '#d0d0d0');
    const accent = readVar(vars, '--list-hover-color') || readVar(vars, '--link-color', readVar(vars, '--chart-blue', '#3794ff'));
    const muted = readVar(vars, '--second-color', border);
    const error = readVar(vars, '--error-color', readVar(vars, '--chart-red', '#e51400'));
    const chart = {
        red: readVar(vars, '--chart-red', '#e51400'),
        blue: readVar(vars, '--chart-blue', '#3794ff'),
        yellow: readVar(vars, '--chart-yellow', '#cca700'),
        orange: readVar(vars, '--chart-orange', '#d18616'),
        green: readVar(vars, '--chart-green', '#89d185'),
        purple: readVar(vars, '--chart-purple', '#b180d7'),
        foreground: readVar(vars, '--chart-foreground', fg),
    };
    const noteBg = chart.yellow;
    const noteFg = isDarkBackground(noteBg) ? fg : '#1f2020';

    return {
        theme: 'base',
        themeVariables: {
            activationBkgColor: chart.blue,
            activationBorderColor: accent,
            activeTaskBkgColor: chart.blue,
            activeTaskBorderColor: accent,
            actorBkg: panelBg,
            actorBorder: accent,
            actorLineColor: muted,
            actorTextColor: fg,
            altBackground: codeBg,
            altSectionBkgColor: chart.orange,
            arrowheadColor: muted,
            background: bg,
            border1: accent,
            border2: border,
            classText: fg,
            clusterBkg: chart.purple,
            clusterTextColor: contrastColor(chart.purple),
            clusterBorder: accent,
            critBkgColor: error,
            critBorderColor: error,
            darkMode: dark,
            defaultLinkColor: accent,
            doneTaskBkgColor: muted,
            doneTaskBorderColor: border,
            edgeLabelBackground: bg,
            errorBkgColor: error,
            errorTextColor: contrastColor(error),
            fillType0: panelBg,
            fillType1: chart.blue,
            fillType2: chart.purple,
            fillType3: chart.green,
            fillType4: chart.yellow,
            fillType5: chart.orange,
            fillType6: chart.red,
            fillType7: chart.purple,
            fontFamily: 'sans-serif',
            fontSize: '16px',
            gridColor: border,
            labelBackground: bg,
            labelBoxBkgColor: panelBg,
            labelBoxBorderColor: accent,
            labelColor: fg,
            labelTextColor: fg,
            lineColor: muted,
            loopTextColor: chart.orange,
            mainBkg: panelBg,
            mainContrastColor: fg,
            nodeBkg: panelBg,
            nodeBorder: accent,
            noteBkgColor: noteBg,
            noteBorderColor: chart.orange,
            noteTextColor: noteFg,
            primaryBorderColor: accent,
            primaryColor: panelBg,
            primaryTextColor: fg,
            secondBkg: chart.green,
            secondaryBorderColor: chart.blue,
            secondaryColor: chart.blue,
            secondaryTextColor: contrastColor(chart.blue),
            sectionBkgColor: chart.yellow,
            sectionBkgColor2: chart.orange,
            sequenceNumberColor: contrastColor(chart.blue),
            signalColor: chart.blue,
            signalTextColor: fg,
            taskBkgColor: chart.green,
            taskBorderColor: accent,
            taskTextClickableColor: accent,
            taskTextColor: contrastColor(chart.green),
            taskTextDarkColor: '#1f2020',
            taskTextLightColor: '#ffffff',
            taskTextOutsideColor: fg,
            tertiaryBorderColor: chart.purple,
            tertiaryColor: chart.purple,
            tertiaryTextColor: contrastColor(chart.purple),
            textColor: fg,
            titleColor: chart.blue,
            todayLineColor: error,
        },
    };
};

const MERMAID_BUILTIN_THEME_BACKGROUND = {
    default: '#ffffff',
    dark: '#333333',
    forest: '#f4f4f4',
};

/**
 * @param {import('../markdownService').ExportThemeSettings | null | undefined} exportTheme
 * @returns {string}
 */
function resolveMermaidExportBackground(exportTheme) {
    const config = buildMermaidExportConfig(exportTheme || {});
    if (config.themeVariables?.background) {
        return config.themeVariables.background;
    }
    return MERMAID_BUILTIN_THEME_BACKGROUND[config.theme] || '#ffffff';
}

/**
 * @param {import('../markdownService').ExportThemeSettings | null | undefined} exportTheme
 */
function buildMermaidExportConfig(exportTheme) {
    const themeId = exportTheme?.mermaidTheme || 'Auto';

    if (themeId === 'Light') {
        return { ...MERMAID_BASE_CONFIG, theme: 'default', startOnLoad: true };
    }
    if (themeId === 'Dark') {
        return { ...MERMAID_BASE_CONFIG, theme: 'dark', startOnLoad: true };
    }
    if (themeId === 'Forest') {
        return { ...MERMAID_BASE_CONFIG, theme: 'forest', startOnLoad: true };
    }

    const customTheme = CUSTOM_MERMAID_THEMES[themeId];
    if (customTheme) {
        return { ...MERMAID_BASE_CONFIG, ...buildCustomMermaidThemeConfig(customTheme), startOnLoad: true };
    }

    return { ...MERMAID_BASE_CONFIG, ...buildAutoMermaidThemeConfig(exportTheme), startOnLoad: true };
}

export {
    buildMermaidExportConfig,
    resolveMermaidExportBackground,
};
