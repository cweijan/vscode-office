import { createContext, useContext, useEffect, useState, createElement, type ReactNode, type CSSProperties } from 'react';
import { theme, type ThemeConfig } from 'antd';
import { getVscodeThemeColor, isVscodeDarkTheme, observeVscodeThemeChange } from '../../../util/vscodeTheme';
import type { GraphConfig } from '../graph/layoutEngine';
import type { GitHistoryColorMode } from '../util/gitHistoryState';

export type { GitHistoryColorMode };

export interface GitHistoryTheme {
    graphConfig: GraphConfig;
    antTheme: ThemeConfig;
    cssVars: Record<string, string>;
}

const GitHistoryColorModeContext = createContext<GitHistoryColorMode>('adaptive');

export function GitHistoryColorModeProvider({
    mode,
    children,
}: {
    mode: GitHistoryColorMode;
    children: ReactNode;
}) {
    return createElement(GitHistoryColorModeContext.Provider, { value: mode }, children);
}

export function useGitHistoryColorMode(): GitHistoryColorMode {
    return useContext(GitHistoryColorModeContext);
}

const GRAPH_COLOUR_VARS = [
    '--vscode-gitDecoration-modifiedResourceForeground',
    '--vscode-textLink-foreground',
    '--vscode-gitDecoration-addedResourceForeground',
    '--vscode-gitDecoration-renamedResourceForeground',
    '--vscode-terminal-ansiMagenta',
    '--vscode-gitDecoration-deletedResourceForeground',
    '--vscode-terminal-ansiCyan',
    '--vscode-gitDecoration-untrackedResourceForeground',
    '--vscode-terminal-ansiYellow',
    '--vscode-gitDecoration-conflictingResourceForeground',
] as const;

const GRAPH_COLOUR_FALLBACKS = [
    '#e2c08d', '#3794ff', '#73c991', '#73c991', '#bc05bc',
    '#c74e39', '#0598bc', '#73c991', '#cdcd22', '#e51400',
];

function uniqueColours(colours: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const colour of colours) {
        const key = colour.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(colour);
        }
    }
    return result;
}

export function getGraphBranchColours(): string[] {
    const colours: string[] = [];
    for (let i = 0; i < GRAPH_COLOUR_VARS.length; i++) {
        colours.push(getVscodeThemeColor(GRAPH_COLOUR_VARS[i], GRAPH_COLOUR_FALLBACKS[i]));
    }
    return uniqueColours(colours);
}

const LIGHT_BRANCH_COLOURS = uniqueColours([...GRAPH_COLOUR_FALLBACKS]);

function buildAntTheme(cssVars: Record<string, string>, dark: boolean): ThemeConfig {
    return {
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
            colorBgContainer: cssVars['--git-graph-input-bg'],
            colorBgElevated: dark
                ? getVscodeThemeColor('--vscode-dropdown-background', cssVars['--git-graph-input-bg'])
                : cssVars['--git-graph-input-bg'],
            colorText: cssVars['--git-graph-fg'],
            colorTextSecondary: cssVars['--git-graph-muted'],
            colorTextTertiary: cssVars['--git-graph-muted'],
            colorBorder: cssVars['--git-graph-border'],
            colorPrimary: cssVars['--git-graph-accent'],
            colorFillAlter: cssVars['--git-graph-hover'],
            colorFillSecondary: cssVars['--git-graph-hover'],
            controlOutline: `color-mix(in srgb, ${cssVars['--git-graph-accent']} 25%, transparent)`,
        },
        components: {
            Table: {
                headerBg: cssVars['--git-graph-toolbar-bg'],
                rowHoverBg: cssVars['--git-graph-hover'],
                borderColor: cssVars['--git-graph-border'],
                colorText: cssVars['--git-graph-fg'],
                colorTextHeading: cssVars['--git-graph-muted'],
            },
            Select: {
                optionSelectedBg: cssVars['--git-graph-selected-bg'],
                optionSelectedColor: cssVars['--git-graph-selected-fg'],
            },
            Button: {
                defaultBg: cssVars['--git-graph-input-bg'],
                defaultColor: cssVars['--git-graph-fg'],
                defaultBorderColor: cssVars['--git-graph-border'],
            },
            Switch: {
                colorPrimary: cssVars['--git-graph-accent'],
            },
            Alert: {
                colorInfoBg: `color-mix(in srgb, ${cssVars['--git-graph-accent']} 12%, ${cssVars['--git-graph-bg']})`,
                colorInfoBorder: cssVars['--git-graph-border'],
            },
        },
    };
}

function buildGraphConfig(branchColours: string[], uncommittedColour: string): GraphConfig {
    return {
        colours: branchColours,
        uncommittedColour,
        style: 'rounded',
        grid: { x: 16, y: 24, offsetX: 8, offsetY: 12 },
    };
}

function applyBranchColourVars(cssVars: Record<string, string>, branchColours: string[]): void {
    for (let i = 0; i < branchColours.length; i++) {
        cssVars[`--git-graph-branch-${i}`] = branchColours[i];
    }
}

function buildAdaptiveGitHistoryTheme(): GitHistoryTheme {
    const dark = isVscodeDarkTheme();
    const branchColours = getGraphBranchColours();
    const uncommittedColour = getVscodeThemeColor('--vscode-descriptionForeground', '#808080');

    const cssVars: Record<string, string> = {
        '--git-graph-bg': getVscodeThemeColor('--vscode-editor-background', dark ? '#1e1e1e' : '#ffffff'),
        '--git-graph-fg': getVscodeThemeColor('--vscode-editor-foreground', dark ? '#cccccc' : '#333333'),
        '--git-graph-muted': getVscodeThemeColor('--vscode-descriptionForeground', dark ? '#999999' : '#666666'),
        '--git-graph-border': getVscodeThemeColor(
            '--vscode-editorWidget-border',
            getVscodeThemeColor('--vscode-panel-border', dark ? '#454545' : '#d9d9d9')
        ),
        '--git-graph-toolbar-bg': getVscodeThemeColor(
            '--vscode-sideBarSectionHeader-background',
            getVscodeThemeColor('--vscode-sideBar-background', dark ? '#2a2d2e' : '#e8e8e8')
        ),
        '--git-graph-settings-bg': getVscodeThemeColor(
            '--vscode-sideBar-background',
            dark ? '#181818' : '#f0f0f0'
        ),
        '--git-graph-settings-header-bg': getVscodeThemeColor(
            '--vscode-sideBarSectionHeader-background',
            getVscodeThemeColor('--vscode-editorGroupHeader-tabsBackground', dark ? '#252526' : '#f3f3f3')
        ),
        '--git-graph-hover': getVscodeThemeColor('--vscode-list-hoverBackground', dark ? 'rgba(90,93,94,0.31)' : 'rgba(0,0,0,0.04)'),
        '--git-graph-selected-bg': getVscodeThemeColor('--vscode-list-activeSelectionBackground', dark ? '#094771' : '#0060c0'),
        '--git-graph-selected-fg': getVscodeThemeColor('--vscode-list-activeSelectionForeground', dark ? '#ffffff' : '#ffffff'),
        '--git-graph-accent': getVscodeThemeColor('--vscode-textLink-foreground', '#3794ff'),
        '--git-graph-uncommitted': uncommittedColour,
        '--git-graph-ref-head': getVscodeThemeColor('--vscode-textLink-foreground', '#3794ff'),
        '--git-graph-ref-tag': getVscodeThemeColor('--vscode-gitDecoration-addedResourceForeground', '#73c991'),
        '--git-graph-ref-remote': getVscodeThemeColor('--vscode-gitDecoration-modifiedResourceForeground', '#e2c08d'),
        '--git-graph-ref-stash': getVscodeThemeColor('--vscode-terminal-ansiMagenta', '#bc05bc'),
        '--git-graph-status-added': getVscodeThemeColor('--vscode-gitDecoration-addedResourceForeground', '#73c991'),
        '--git-graph-status-modified': getVscodeThemeColor('--vscode-gitDecoration-modifiedResourceForeground', '#e2c08d'),
        '--git-graph-status-deleted': getVscodeThemeColor('--vscode-gitDecoration-deletedResourceForeground', '#c74e39'),
        '--git-graph-status-renamed': getVscodeThemeColor('--vscode-gitDecoration-renamedResourceForeground', '#73c991'),
        '--git-graph-status-untracked': getVscodeThemeColor('--vscode-gitDecoration-untrackedResourceForeground', '#73c991'),
        '--git-graph-folder-icon': getVscodeThemeColor('--vscode-symbolIcon-folderForeground', dark ? '#c5a332' : '#b8860b'),
        '--git-graph-code-bg': getVscodeThemeColor('--vscode-textCodeBlock-background', dark ? '#2b2b2b' : '#f0f0f0'),
        '--git-graph-input-bg': getVscodeThemeColor('--vscode-input-background', dark ? '#3c3c3c' : '#ffffff'),
        '--git-graph-input-fg': getVscodeThemeColor('--vscode-input-foreground', dark ? '#cccccc' : '#333333'),
        '--git-graph-input-border': getVscodeThemeColor('--vscode-input-border', dark ? '#3c3c3c' : '#d9d9d9'),
        '--git-graph-toolbar-btn-fetch': getVscodeThemeColor('--vscode-textLink-foreground', '#3794ff'),
        '--git-graph-toolbar-btn-pull': getVscodeThemeColor('--vscode-terminal-ansiCyan', '#29b8db'),
        '--git-graph-toolbar-btn-push': getVscodeThemeColor('--vscode-gitDecoration-addedResourceForeground', '#73c991'),
        '--git-graph-toolbar-btn-remote': getVscodeThemeColor('--vscode-gitDecoration-modifiedResourceForeground', '#e2c08d'),
        '--git-graph-toolbar-btn-sync': getVscodeThemeColor('--vscode-terminal-ansiCyan', '#0598bc'),
        '--git-graph-reset-option-accent': getVscodeThemeColor('--vscode-terminal-ansiYellow', '#d7ba7d'),
    };
    cssVars['--git-graph-detail-text'] = cssVars['--git-graph-fg'];

    applyBranchColourVars(cssVars, branchColours);

    return {
        graphConfig: buildGraphConfig(branchColours, uncommittedColour),
        antTheme: buildAntTheme(cssVars, dark),
        cssVars,
    };
}

function buildLightGitHistoryTheme(): GitHistoryTheme {
    const branchColours = LIGHT_BRANCH_COLOURS;
    const uncommittedColour = '#808080';
    const cssVars: Record<string, string> = {
        '--git-graph-bg': '#ffffff',
        '--git-graph-fg': '#333333',
        '--git-graph-muted': '#666666',
        '--git-graph-detail-text': '#4a4a4a',
        '--git-graph-border': '#d9d9d9',
        '--git-graph-toolbar-bg': '#e8e8e8',
        '--git-graph-settings-bg': '#f0f0f0',
        '--git-graph-settings-header-bg': '#f3f3f3',
        '--git-graph-hover': 'rgba(0, 0, 0, 0.04)',
        '--git-graph-selected-bg': '#0060c0',
        '--git-graph-selected-fg': '#ffffff',
        '--git-graph-accent': '#1677ff',
        '--git-graph-uncommitted': uncommittedColour,
        '--git-graph-ref-head': '#1677ff',
        '--git-graph-ref-tag': '#73c991',
        '--git-graph-ref-remote': '#e2c08d',
        '--git-graph-ref-stash': '#bc05bc',
        '--git-graph-status-added': '#73c991',
        '--git-graph-status-modified': '#e2c08d',
        '--git-graph-status-deleted': '#c74e39',
        '--git-graph-status-renamed': '#73c991',
        '--git-graph-status-untracked': '#73c991',
        '--git-graph-folder-icon': '#b8860b',
        '--git-graph-code-bg': '#f0f0f0',
        '--git-graph-input-bg': '#ffffff',
        '--git-graph-input-fg': '#333333',
        '--git-graph-input-border': '#d9d9d9',
        '--git-graph-toolbar-btn-fetch': '#1677ff',
        '--git-graph-toolbar-btn-pull': '#29b8db',
        '--git-graph-toolbar-btn-push': '#73c991',
        '--git-graph-toolbar-btn-remote': '#e2c08d',
        '--git-graph-toolbar-btn-sync': '#0598bc',
        '--git-graph-reset-option-accent': '#b58900',
    };
    applyBranchColourVars(cssVars, branchColours);

    return {
        graphConfig: buildGraphConfig(branchColours, uncommittedColour),
        antTheme: buildAntTheme(cssVars, false),
        cssVars,
    };
}

export function buildGitHistoryTheme(mode: GitHistoryColorMode = 'adaptive'): GitHistoryTheme {
    if (mode === 'light') {
        return buildLightGitHistoryTheme();
    }
    return buildAdaptiveGitHistoryTheme();
}

export function useGitHistoryTheme(modeOverride?: GitHistoryColorMode): GitHistoryTheme {
    const contextMode = useGitHistoryColorMode();
    const mode = modeOverride ?? contextMode;
    const [graphTheme, setGraphTheme] = useState(() => buildGitHistoryTheme(mode));

    useEffect(() => {
        setGraphTheme(buildGitHistoryTheme(mode));
    }, [mode]);

    useEffect(() => {
        if (mode !== 'adaptive') {
            return;
        }
        return observeVscodeThemeChange(() => setGraphTheme(buildGitHistoryTheme('adaptive')));
    }, [mode]);

    return graphTheme;
}

export function themeStyle(cssVars: Record<string, string>): CSSProperties {
    return cssVars as CSSProperties;
}
