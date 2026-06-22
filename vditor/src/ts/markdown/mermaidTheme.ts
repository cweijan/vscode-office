export interface IEditorAccentColors {
    red: string;
    blue: string;
    yellow: string;
    orange: string;
    green: string;
    purple: string;
    foreground: string;
}

const readCssVar = (root: HTMLElement, name: string, fallback = ""): string => {
    const value = getComputedStyle(root).getPropertyValue(name).trim();
    return value || fallback;
};

const parseRgb = (color: string): [number, number, number] | null => {
    const value = color.trim();
    if (!value) {
        return null;
    }
    if (value.startsWith("#")) {
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

export const isDarkBackground = (color: string): boolean => {
    const rgb = parseRgb(color);
    if (!rgb) {
        return false;
    }
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance < 0.5;
};

export const findVditorRoot = (element: HTMLElement): HTMLElement => {
    const vditor = element.closest("#vditor") as HTMLElement | null;
    return vditor ?? element;
};

export const readEditorAccentColors = (root: HTMLElement): IEditorAccentColors => ({
    red: readCssVar(root, "--chart-red", "#e51400"),
    blue: readCssVar(root, "--chart-blue", "#3794ff"),
    yellow: readCssVar(root, "--chart-yellow", "#cca700"),
    orange: readCssVar(root, "--chart-orange", "#d18616"),
    green: readCssVar(root, "--chart-green", "#89d185"),
    purple: readCssVar(root, "--chart-purple", "#b180d7"),
    foreground: readCssVar(root, "--chart-foreground", readCssVar(root, "--front-color", "#333333")),
});

export const buildMermaidInitConfig = (themeId: string, root: HTMLElement) => {
    if (themeId === "Light") {
        return { theme: "default" };
    }
    if (themeId === "Dark") {
        return { theme: "dark" };
    }
    return buildMermaidThemeConfig(root);
};

export const buildMermaidThemeConfig = (root: HTMLElement) => {
    const editorBg = readCssVar(root, "--bg-color");
    const dark = root.classList.contains("vditor--dark") || isDarkBackground(editorBg);
    const bg = readCssVar(root, "--toolbar-background-color", readCssVar(root, "--second-bg-color", editorBg));
    const panelBg = readCssVar(root, "--second-bg-color", readCssVar(root, "--code-bg-color", bg));
    const fg = readCssVar(root, "--front-color", dark ? "#d4d4d4" : "#333333");
    const codeBg = readCssVar(root, "--code-bg-color", panelBg);
    const tableHeader = readCssVar(root, "--table-header-bg", codeBg);
    const border = readCssVar(root, "--border-color", dark ? "#444444" : "#d0d0d0");
    const accent = readCssVar(root, "--list-hover-color") || readCssVar(root, "--link-color", readCssVar(root, "--chart-blue"));
    const muted = readCssVar(root, "--second-color", border);
    const error = readCssVar(root, "--error-color", readCssVar(root, "--chart-red", "#e51400"));
    const chart = readEditorAccentColors(root);
    const noteBg = chart.yellow;
    const noteFg = isDarkBackground(noteBg) ? fg : "#1f2020";
    const contrastColor = (bg: string): string => isDarkBackground(bg) ? "#ffffff" : "#1f2020";

    return {
        theme: "base",
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
            fontFamily: "sans-serif",
            fontSize: "16px",
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
            taskTextDarkColor: "#1f2020",
            taskTextLightColor: "#ffffff",
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
