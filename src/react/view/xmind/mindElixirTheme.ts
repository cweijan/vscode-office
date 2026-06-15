import MindElixir from 'mind-elixir';
import { getVscodeThemeColor } from '../../util/vscodeTheme';

const LAYOUT_VARS = {
    '--node-gap-x': '30px',
    '--node-gap-y': '10px',
    '--main-gap-x': '65px',
    '--main-gap-y': '45px',
    '--root-radius': '30px',
    '--main-radius': '20px',
    '--main-border': '',
    '--topic-padding': '3px',
    '--map-padding': '50px 80px',
} as const;

export function buildMindElixirTheme(adaptive: boolean) {
    if (!adaptive) {
        return MindElixir.THEME;
    }

    const baseTheme = MindElixir.DARK_THEME;
    const bg = getVscodeThemeColor('--vscode-editor-background', '#1e1e1e');
    const fg = getVscodeThemeColor('--vscode-editor-foreground', '#cccccc');
    const widgetBg = getVscodeThemeColor('--vscode-editorWidget-background', '#252526');
    const muted = getVscodeThemeColor('--vscode-descriptionForeground', '#999999');
    const accent = getVscodeThemeColor('--vscode-textLink-foreground', '#3794ff');
    const border = getVscodeThemeColor('--vscode-editorWidget-border', '#454545');
    const rootBg = getVscodeThemeColor('--vscode-button-background', '#2d3748');
    const rootFg = getVscodeThemeColor('--vscode-button-foreground', '#ffffff');
    const selection = getVscodeThemeColor('--vscode-focusBorder', accent);

    return {
        name: 'VSCode',
        type: 'dark' as const,
        palette: baseTheme.palette,
        cssVar: {
            ...LAYOUT_VARS,
            '--root-color': rootFg,
            '--root-bgcolor': rootBg,
            '--root-border-color': border,
            '--main-color': fg,
            '--main-bgcolor': widgetBg,
            '--main-bgcolor-transparent': 'rgba(37, 37, 38, 0.8)',
            '--color': muted,
            '--bgcolor': bg,
            '--selected': selection,
            '--accent-color': accent,
            '--panel-color': fg,
            '--panel-bgcolor': widgetBg,
            '--panel-border-color': border,
        },
    };
}
