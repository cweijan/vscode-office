import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { theme, type ThemeConfig } from 'antd';
import { getVscodeThemeColor, isVscodeDarkTheme, observeVscodeThemeChange } from '../../../util/vscodeTheme';
import type { GraphConfig } from '../graph/layoutEngine';

export interface GitHistoryTheme {
    graphConfig: GraphConfig;
    antTheme: ThemeConfig;
    cssVars: Record<string, string>;
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

export function buildGitHistoryTheme(): GitHistoryTheme {
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
    };

    for (let i = 0; i < branchColours.length; i++) {
        cssVars[`--git-graph-branch-${i}`] = branchColours[i];
    }

    const graphConfig: GraphConfig = {
        colours: branchColours,
        uncommittedColour,
        style: 'rounded',
        grid: { x: 16, y: 24, offsetX: 8, offsetY: 12 },
    };

    const antTheme: ThemeConfig = {
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
            colorBgContainer: cssVars['--git-graph-input-bg'],
            colorBgElevated: getVscodeThemeColor('--vscode-dropdown-background', cssVars['--git-graph-input-bg']),
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

    return { graphConfig, antTheme, cssVars };
}

export function useGitHistoryTheme(): GitHistoryTheme {
    const [graphTheme, setGraphTheme] = useState(buildGitHistoryTheme);
    useEffect(() => observeVscodeThemeChange(() => setGraphTheme(buildGitHistoryTheme())), []);
    return graphTheme;
}

export function themeStyle(cssVars: Record<string, string>): CSSProperties {
    return cssVars as CSSProperties;
}
