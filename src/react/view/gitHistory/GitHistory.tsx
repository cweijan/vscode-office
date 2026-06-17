import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Alert, ConfigProvider, Spin } from 'antd';
import { handler } from '../../util/vscode';
import ActionDialog from './components/ActionDialog';
import RemoteFormDialog from './components/RemoteFormDialog';
import { useGitActionPrompt } from './hooks/useGitActionPrompt';
import { useSplitViewLayout } from './hooks/useSplitViewLayout';
import type { PromptStep, GitActionRequest, PromptSubmitValue } from './util/gitActionPromptFlow';
import { buildCheckoutStateUpdate } from './util/checkoutState';
import Toolbar from './components/Toolbar';
import FindWidget from './components/FindWidget';
import SettingsWidget from './components/SettingsWidget';
import CommitTable from './components/CommitTable';
import type { RefContextType } from './components/CommitTable';
import CommitDetailPopup from './components/CommitDetailPopup';
import { anchorFromElement, type PopupAnchor } from './util/commitDetailPopup';
import { ContextMenu, useContextMenu } from './components/ContextMenu';
import {
    buildBranchContextMenu,
    buildCommitContextMenu,
    buildFileChangeContextMenu,
    buildRemoteBranchContextMenu,
    buildStashContextMenu,
    buildTagContextMenu,
    parseRemoteBranch,
    prepareContextMenu,
    runContextMenuAction,
    type ExtendedContextMenuItem,
    type MenuContext,
    type MenuPayloadMeta,
} from './contextMenu/buildContextMenu';
import { themeStyle, useGitHistoryTheme, GitHistoryColorModeProvider } from './theme/gitHistoryTheme';
import { loadGitHistoryState, saveGitHistoryState, getPullDefaults, savePullDefaults, getFileHistorySplitLayout, saveFileHistorySplitLayout, getColorMode, saveColorMode, type GitPullDefaults, type FileHistorySplitLayout, type GitHistoryColorMode } from './util/gitHistoryState';
import { getRelativeRepoPath } from './util/repoPath';
import { getConfigs } from '../../util/vscodeConfig';
import type {
    GitCommit, GitCommitData, GitCommitDetails, GitCommitRemote, GitFileChange,
    GitHistoryInitPayload, GitRepoInfo, GitRepoExtras, GitStash, GitRemoteDetail,
} from './types';
import './gitHistory.css';
import '@vscode/codicons/dist/codicon.css';
import SponsorBar from '../components/SponsorBar';

const ROW_HEIGHT = 28;
const TABLE_HEADER_HEIGHT = 28;
const INITIAL_MAX_COMMITS = 300;
const LOAD_MORE_COMMITS = 100;
const QUICK_SYNC_DEFAULT_MESSAGE = 'Quick Sync';

function GitHistoryBottomBar({ commitCount = 0 }: { commitCount?: number }) {
    return (
        <footer className={`git-graph-bottom-bar${commitCount > 0 ? ' has-more' : ''}`}>
            {commitCount > 0 && (
                <span className="git-graph-more">
                    Showing {commitCount} commits
                </span>
            )}
            <div className="git-graph-bottom-bar-sponsor">
                <SponsorBar placement="center" />
            </div>
        </footer>
    );
}

export default function GitHistory() {
    const [colorMode, setColorMode] = useState<GitHistoryColorMode>(getColorMode);
    const toggleColorMode = useCallback(() => {
        setColorMode((prev) => {
            const next: GitHistoryColorMode = prev === 'adaptive' ? 'light' : 'adaptive';
            saveColorMode(next);
            return next;
        });
    }, []);

    return (
        <GitHistoryColorModeProvider mode={colorMode}>
            <GitHistoryView
                colorMode={colorMode}
                adaptiveColorMode={colorMode === 'adaptive'}
                onToggleColorMode={toggleColorMode}
            />
        </GitHistoryColorModeProvider>
    );
}

function GitHistoryView({
    colorMode,
    adaptiveColorMode,
    onToggleColorMode,
}: {
    colorMode: GitHistoryColorMode;
    adaptiveColorMode: boolean;
    onToggleColorMode: () => void;
}) {
    const { graphConfig, antTheme, cssVars } = useGitHistoryTheme(colorMode);
    const splitView = useSplitViewLayout(
        (getConfigs()?.gitHistoryInit as GitHistoryInitPayload | undefined)?.viewColumn,
    );
    const [repos, setRepos] = useState<string[]>([]);
    const [repo, setRepo] = useState('');
    const [branches, setBranches] = useState<string[]>([]);
    const [remotes, setRemotes] = useState<string[]>([]);
    const [stashes, setStashes] = useState<GitStash[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [authors, setAuthors] = useState<string[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState<string>();
    const showRemoteBranches = true;
    const [searchValue, setSearchValue] = useState('');
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [branchHead, setBranchHead] = useState<string | null>(null);
    const [commitHead, setCommitHead] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [detailAnchor, setDetailAnchor] = useState<PopupAnchor | null>(null);
    const [filterCurrentFile, setFilterCurrentFile] = useState(false);
    const [commitDetails, setCommitDetails] = useState<GitCommitDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [hasRemoteUrl, setHasRemoteUrl] = useState(false);
    const [remoteWebUrls, setRemoteWebUrls] = useState<{ name: string; url: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [moreAvailable, setMoreAvailable] = useState(false);
    const [maxCommits, setMaxCommits] = useState(INITIAL_MAX_COMMITS);
    const [filePath, setFilePath] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [relPath, setRelPath] = useState<string | null>(null);
    const [findOpen, setFindOpen] = useState(false);
    const [findMatchIndex, setFindMatchIndex] = useState<number | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [configRemotes, setConfigRemotes] = useState<GitRemoteDetail[]>([]);
    const [configLoading, setConfigLoading] = useState(false);
    const [pullDefaults, setPullDefaults] = useState<GitPullDefaults>(() =>
        getPullDefaults(''),
    );
    const [fileHistorySplitLayout, setFileHistorySplitLayout] = useState<FileHistorySplitLayout>(() =>
        getFileHistorySplitLayout(),
    );
    const [toolbarPrompt, setToolbarPrompt] = useState<PromptStep | null>(null);
    const [toolbarPromptKind, setToolbarPromptKind] = useState<'push' | 'openRemote' | 'quickSyncConfirm' | 'quickSync' | null>(null);
    const [remoteForm, setRemoteForm] = useState<{ mode: 'add' | 'edit'; remote?: GitRemoteDetail } | null>(null);
    const [remoteDeleteName, setRemoteDeleteName] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const settingsOpenRef = useRef(settingsOpen);
    settingsOpenRef.current = settingsOpen;
    const { menu, showMenu, closeMenu } = useContextMenu();
    const menuContextRef = useRef<MenuContext | null>(null);
    const menuMetaRef = useRef<Record<string, MenuPayloadMeta>>({});
    const pendingQuickSyncCommitMessageRef = useRef(QUICK_SYNC_DEFAULT_MESSAGE);

    const executeGitAction = useCallback((action: GitActionRequest) => {
        pendingGitActionRef.current = action;
        handler.emit('gitAction', action);
    }, []);

    const {
        currentStep: actionPromptStep,
        promptAnchor: actionPromptAnchor,
        requestAction,
        submitStep: submitActionPrompt,
        cancelPrompt: cancelActionPrompt,
    } = useGitActionPrompt(executeGitAction);

    const promptAnchorRef = useRef<PopupAnchor | null>(null);

    const requestActionFromMenu = useCallback((action: GitActionRequest) => {
        requestAction(action, { remotes, branchHead }, promptAnchorRef.current ?? undefined);
        promptAnchorRef.current = null;
    }, [requestAction, remotes, branchHead]);

    const menuContext = useMemo<MenuContext>(() => ({
        repo,
        head: branchHead,
        remotes,
        branches,
        relPath,
        pullDefaults,
        emit: (action) => requestActionFromMenu(action),
    }), [repo, branchHead, remotes, branches, relPath, pullDefaults, requestActionFromMenu]);

    menuContextRef.current = menuContext;

    const openContextMenu = useCallback((
        event: MouseEvent,
        items: ExtendedContextMenuItem[],
    ) => {
        event.preventDefault();
        event.stopPropagation();
        const prepared = prepareContextMenu(items);
        if (prepared.items.length === 0) return;
        menuMetaRef.current = prepared.metaById;
        showMenu(prepared.items, prepared.metaById, event.clientX, event.clientY);
    }, [showMenu]);

    const handleRowContextMenu = useCallback((event: MouseEvent, commit: GitCommit) => {
        openContextMenu(event, buildCommitContextMenu(commit, menuContext));
    }, [menuContext, openContextMenu]);

    const handleRefContextMenu = useCallback((
        event: MouseEvent,
        commit: GitCommit,
        refType: RefContextType,
        refName: string,
        remote?: GitCommitRemote,
    ) => {
        let items;
        switch (refType) {
            case 'head':
                items = buildBranchContextMenu(refName, commit.hash, menuContext);
                break;
            case 'tag':
                items = buildTagContextMenu(refName, menuContext);
                break;
            case 'remote':
                if (remote) {
                    const { remoteName, branchName } = parseRemoteBranch(remote);
                    items = buildRemoteBranchContextMenu(remoteName, remote.name, branchName, menuContext);
                } else {
                    items = buildCommitContextMenu(commit, menuContext);
                }
                break;
            case 'stash':
                items = buildStashContextMenu(commit.stash?.selector ?? refName, menuContext);
                break;
            default:
                items = buildCommitContextMenu(commit, menuContext);
        }
        openContextMenu(event, items);
    }, [menuContext, openContextMenu]);

    const handleFileContextMenu = useCallback((event: MouseEvent, change: GitFileChange) => {
        if (selectedIndex === null) return;
        const commit = commits[selectedIndex];
        if (!commit) return;
        openContextMenu(
            event,
            buildFileChangeContextMenu(change, commit.hash, commit.parents.length > 0, menuContext),
        );
    }, [commits, selectedIndex, menuContext, openContextMenu]);

    const handleContextMenuSelect = useCallback((id: string, position: { x: number; y: number }) => {
        promptAnchorRef.current = position;
        const meta = menuMetaRef.current[id];
        const ctx = menuContextRef.current;
        if (!meta || !ctx) return;
        runContextMenuAction(id, meta, ctx);
    }, []);

    const initialized = useRef(false);
    const repoRef = useRef(repo);
    const selectedBranchRef = useRef<string | null>(null);
    const selectedAuthorRef = useRef<string | undefined>(undefined);
    const searchValueRef = useRef('');
    const pendingCommitHashRef = useRef<string | null>(null);
    const pendingGitActionRef = useRef<GitActionRequest | null>(null);
    const commitsRef = useRef(commits);
    const branchesRef = useRef(branches);
    const stashesRef = useRef(stashes);
    const remotesRef = useRef(remotes);
    const filePathRef = useRef<string | null>(null);
    const relPathRef = useRef<string | null>(null);
    const maxCommitsRef = useRef(INITIAL_MAX_COMMITS);
    const loadingMoreRef = useRef(false);

    repoRef.current = repo;
    selectedBranchRef.current = selectedBranch;
    selectedAuthorRef.current = selectedAuthor;
    searchValueRef.current = searchValue;
    stashesRef.current = stashes;
    remotesRef.current = remotes;
    commitsRef.current = commits;
    branchesRef.current = branches;
    filePathRef.current = filePath;
    relPathRef.current = relPath;
    maxCommitsRef.current = maxCommits;

    const resetMaxCommits = useCallback(() => {
        maxCommitsRef.current = INITIAL_MAX_COMMITS;
        setMaxCommits(INITIAL_MAX_COMMITS);
    }, []);

    const syncRelPath = useCallback((targetRepo: string, absoluteFilePath: string | null) => {
        if (!absoluteFilePath) {
            setRelPath(null);
            relPathRef.current = null;
            return;
        }
        const next = getRelativeRepoPath(targetRepo, absoluteFilePath) ?? null;
        setRelPath(next);
        relPathRef.current = next;
    }, []);

    const clearCommitList = useCallback(() => {
        setCommits([]);
        setSelectedIndex(null);
        setDetailAnchor(null);
        setCommitDetails(null);
        setDetailsError(null);
        setMoreAvailable(false);
        loadingMoreRef.current = false;
        resetMaxCommits();
    }, [resetMaxCommits]);

    const closeCommitDetails = useCallback(() => {
        setSelectedIndex(null);
        setDetailAnchor(null);
        setCommitDetails(null);
        setDetailsError(null);
        setDetailsLoading(false);
    }, []);

    const updateDetailAnchorFromRow = useCallback((index: number) => {
        requestAnimationFrame(() => {
            const row = contentRef.current?.querySelector(`[data-commit-index="${index}"]`);
            if (row) {
                setDetailAnchor(anchorFromElement(row));
            } else {
                setDetailAnchor({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
            }
        });
    }, []);

    const loadRepository = useCallback((
        targetRepo: string,
        invalidateCache = false,
        branchFilter: string | null = selectedBranchRef.current,
        author?: string,
        search?: string,
        fileRelPath = relPathRef.current ?? undefined,
    ) => {
        if (!targetRepo) return;
        setLoading(true);
        setError(null);
        handler.emit('loadRepository', {
            repo: targetRepo,
            showRemoteBranches,
            showStashes: true,
            invalidateCache,
            branches: branchFilter ? [branchFilter] : null,
            maxCommits: maxCommitsRef.current,
            showTags: true,
            includeCommitsMentionedByReflogs: false,
            onlyFollowFirstParent: false,
            commitOrdering: 'date',
            hideRemotes: [],
            author,
            searchValue: search,
            relPath: fileRelPath,
        });
    }, [showRemoteBranches]);

    const loadCommits = useCallback((
        targetRepo: string,
        branchFilter: string | null,
        author?: string,
        search?: string,
        remoteBranches = showRemoteBranches,
        stashList = stashesRef.current,
        remoteList = remotesRef.current,
        fileRelPath = relPathRef.current ?? undefined,
        commitLimit = maxCommitsRef.current,
        append = false,
    ) => {
        if (!targetRepo) return;
        if (append) {
            loadingMoreRef.current = true;
        } else {
            setLoading(true);
        }
        setError(null);
        handler.emit('loadCommits', {
            repo: targetRepo,
            branches: branchFilter ? [branchFilter] : null,
            maxCommits: commitLimit,
            showTags: true,
            showRemoteBranches: remoteBranches,
            includeCommitsMentionedByReflogs: false,
            onlyFollowFirstParent: false,
            commitOrdering: 'date',
            remotes: remoteList,
            hideRemotes: [],
            stashes: stashList,
            author,
            searchValue: search,
            relPath: fileRelPath,
        });
    }, [showRemoteBranches]);

    const requestCommitDetails = useCallback((targetRepo: string, commit: GitCommit) => {
        if (!commit) {
            setCommitDetails(null);
            setDetailsError(null);
            return;
        }
        setDetailsLoading(true);
        setDetailsError(null);
        handler.emit('commitDetails', {
            repo: targetRepo,
            commitHash: commit.hash,
            hasParents: commit.parents.length > 0,
        });
    }, []);

    const loadRepositoryRef = useRef(loadRepository);
    const loadCommitsRef = useRef(loadCommits);
    const requestCommitDetailsRef = useRef(requestCommitDetails);
    loadRepositoryRef.current = loadRepository;
    loadCommitsRef.current = loadCommits;
    requestCommitDetailsRef.current = requestCommitDetails;

    const applyCommitsData = useCallback((data: GitCommitData) => {
        setLoading(false);
        setRefreshing(false);
        loadingMoreRef.current = false;
        if (data.error) {
            setError(data.error);
            return;
        }
        setCommits(data.commits);
        commitsRef.current = data.commits;
        setCommitHead(data.head);
        setMoreAvailable(data.moreCommitsAvailable);

        const pendingHash = pendingCommitHashRef.current;
        if (pendingHash) {
            pendingCommitHashRef.current = null;
            let index = -1;
            for (let i = 0; i < data.commits.length; i++) {
                if (data.commits[i].hash === pendingHash) {
                    index = i;
                    break;
                }
            }
            if (index >= 0) {
                setSelectedIndex(index);
                updateDetailAnchorFromRow(index);
                requestAnimationFrame(() => {
                    requestCommitDetailsRef.current(repoRef.current, data.commits[index]);
                });
            }
        }
    }, [updateDetailAnchorFromRow]);

    const handleRepoChangeRef = useRef<(newRepo: string) => void>(() => {});

    useEffect(() => {
        const applyInitPayload = (payload: GitHistoryInitPayload): string | null => {
            const saved = loadGitHistoryState();
            setRepos(payload.repos);

            const nextFilePath = payload.filePath ?? saved.filePath ?? null;
            const nextFileName = payload.fileName
                ?? (nextFilePath ? nextFilePath.split(/[/\\]/).pop() ?? null : null);
            if (nextFilePath) {
                setFilePath(nextFilePath);
                setFileName(nextFileName);
                filePathRef.current = nextFilePath;
            }

            let targetRepo = payload.preferredRepo ?? payload.initialRepo ?? null;
            if (!payload.preferredRepo && !nextFilePath && saved.repo && payload.repos.includes(saved.repo)) {
                targetRepo = saved.repo;
            }

            if (saved.selectedBranch !== undefined) {
                setSelectedBranch(saved.selectedBranch);
                selectedBranchRef.current = saved.selectedBranch;
            }
            if (saved.selectedAuthor) {
                setSelectedAuthor(saved.selectedAuthor);
                selectedAuthorRef.current = saved.selectedAuthor;
            }
            if (saved.searchValue) {
                setSearchValue(saved.searchValue);
                searchValueRef.current = saved.searchValue;
            }
            if (saved.selectedCommitHash) {
                pendingCommitHashRef.current = saved.selectedCommitHash;
            }
            if (payload.fileHistorySplitLayout) {
                setFileHistorySplitLayout(payload.fileHistorySplitLayout);
                saveFileHistorySplitLayout(payload.fileHistorySplitLayout);
            } else if (saved.fileHistorySplitLayout) {
                setFileHistorySplitLayout(saved.fileHistorySplitLayout);
            }

            if (targetRepo) {
                setRepo(targetRepo);
                repoRef.current = targetRepo;
                setPullDefaults(getPullDefaults(targetRepo));
                if (nextFilePath) {
                    syncRelPath(targetRepo, nextFilePath);
                } else if (payload.relPath) {
                    setRelPath(payload.relPath);
                    relPathRef.current = payload.relPath;
                }
            } else {
                setLoading(false);
            }
            initialized.current = true;
            return targetRepo;
        };

        const embeddedInit = getConfigs()?.gitHistoryInit as GitHistoryInitPayload | undefined;
        const initialRepo = embeddedInit ? applyInitPayload(embeddedInit) : null;

        handler
            .on('repositoryLoaded', (payload: { repoInfo: GitRepoInfo; commitData: GitCommitData }) => {
                const info = payload.repoInfo;
                if (info.error) {
                    setError(info.error);
                    setLoading(false);
                    setRefreshing(false);
                    return;
                }
                setBranches(info.branches);
                setBranchHead(info.head);
                setRemotes(info.remotes);
                setStashes(info.stashes);
                stashesRef.current = info.stashes;
                remotesRef.current = info.remotes;
                branchesRef.current = info.branches;
                applyCommitsData(payload.commitData);
            })
            .on('repoExtras', (extras: GitRepoExtras) => {
                setAuthors(extras.authors);
                setHasRemoteUrl(extras.hasRemoteUrl);
                setRemoteWebUrls(extras.remoteWebUrls);
            })
            .on('commits', (data: GitCommitData) => {
                applyCommitsData(data);
            })
            .on('commitDetails', (data: { commitDetails: GitCommitDetails | null; error: string | null }) => {
                setDetailsLoading(false);
                setCommitDetails(data.commitDetails);
                setDetailsError(data.error);
            })
            .on('refresh', (payload: { repos: string[] }) => {
                setRepos(payload.repos);
                if (repoRef.current) {
                    loadRepositoryRef.current(repoRef.current, true);
                }
            })
            .on('repos', (payload: { repos: string[] }) => {
                setRepos(payload.repos);
            })
            .on('openRepo', (payload: { repo: string; repos?: string[] }) => {
                if (payload.repos) {
                    setRepos(payload.repos);
                }
                if (payload.repo && payload.repo !== repoRef.current) {
                    handleRepoChangeRef.current(payload.repo);
                }
            })
            .on('fetch', (payload: { error: string | null }) => {
                setFetching(false);
                if (payload.error) {
                    setError(payload.error);
                    return;
                }
                if (repoRef.current) {
                    loadRepositoryRef.current(repoRef.current, true);
                }
            })
            .on('push', (payload: { error: string | null; cancelled?: boolean }) => {
                setPushing(false);
                if (payload.cancelled) {
                    return;
                }
                if (payload.error) {
                    setError(payload.error);
                    return;
                }
                if (repoRef.current) {
                    loadRepositoryRef.current(repoRef.current, true);
                }
            })
            .on('quickSync', (payload: { error: string | null }) => {
                setSyncing(false);
                if (payload.error) {
                    setError(payload.error);
                    return;
                }
                if (repoRef.current) {
                    loadRepositoryRef.current(repoRef.current, true);
                }
            })
            .on('repoConfig', (payload: { remotes: GitRemoteDetail[] }) => {
                setConfigRemotes(payload.remotes);
                setConfigLoading(false);
            })
            .on('remoteActionResult', (payload: { error: string | null; cancelled?: boolean; refresh?: boolean }) => {
                if (payload.cancelled) return;
                if (payload.error) {
                    setError(payload.error);
                    return;
                }
                if (payload.refresh && repoRef.current) {
                    loadRepositoryRef.current(repoRef.current, true);
                    if (settingsOpenRef.current) {
                        setConfigLoading(true);
                        handler.emit('loadRepoConfig', { repo: repoRef.current });
                    }
                }
            })
            .on('error', (message: string) => {
                setError(message);
            })
            .on('gitActionResult', (result: { error: string | null; refresh: boolean }) => {
                const pendingAction = pendingGitActionRef.current;
                pendingGitActionRef.current = null;
                if (result.error) {
                    setError(result.error);
                    return;
                }
                const checkoutUpdate = pendingAction
                    ? buildCheckoutStateUpdate(
                        pendingAction,
                        commitsRef.current,
                        branchesRef.current,
                    )
                    : null;
                if (checkoutUpdate) {
                    setBranchHead(checkoutUpdate.branchHead);
                    if (checkoutUpdate.commitHead !== null) {
                        setCommitHead(checkoutUpdate.commitHead);
                    }
                    if (checkoutUpdate.branches) {
                        setBranches(checkoutUpdate.branches);
                        branchesRef.current = checkoutUpdate.branches;
                    }
                    if (checkoutUpdate.commits) {
                        setCommits(checkoutUpdate.commits);
                        commitsRef.current = checkoutUpdate.commits;
                    }
                    return;
                }
                if (result.refresh && repoRef.current) {
                    clearCommitList();
                    loadRepositoryRef.current(repoRef.current, true);
                }
            })
            .emit('ready');

        if (initialRepo) {
            loadRepositoryRef.current(initialRepo);
        }
    }, [applyCommitsData]);

    useEffect(() => {
        if (!repo) return;
        const selectedCommitHash = selectedIndex !== null && commits[selectedIndex]
            ? commits[selectedIndex].hash
            : null;
        saveGitHistoryState({
            repo,
            selectedBranch,
            selectedAuthor,
            searchValue,
            selectedCommitHash,
            filePath,
        });
    }, [repo, selectedBranch, selectedAuthor, searchValue, selectedIndex, commits, filePath]);

    const handleRepoChange = (newRepo: string) => {
        setRepo(newRepo);
        repoRef.current = newRepo;
        setBranchHead(null);
        setCommitHead(null);
        setSelectedBranch(null);
        selectedBranchRef.current = null;
        setSelectedAuthor(undefined);
        selectedAuthorRef.current = undefined;
        setSearchValue('');
        searchValueRef.current = '';
        pendingCommitHashRef.current = null;
        if (filePathRef.current) {
            syncRelPath(newRepo, filePathRef.current);
        }
        setPullDefaults(getPullDefaults(newRepo));
        clearCommitList();
        loadRepository(newRepo, true);
    };
    handleRepoChangeRef.current = handleRepoChange;

    const handleSelectCommit = (index: number, event?: MouseEvent) => {
        if (selectedIndex === index) {
            closeCommitDetails();
            return;
        }
        const anchor: PopupAnchor = event
            ? { x: event.clientX, y: event.clientY }
            : { x: window.innerWidth / 2, y: window.innerHeight / 3 };
        setDetailAnchor(anchor);
        setSelectedIndex(index);
        const commit = commits[index];
        requestCommitDetails(repo, commit);
    };

    const handleRefresh = () => {
        if (!repo || refreshing) {
            return;
        }
        setRefreshing(true);
        handler.emit('refresh');
        clearCommitList();
        setLoading(true);
    };

    const handleFetch = () => {
        if (!repo) return;
        setFetching(true);
        setError(null);
        handler.emit('fetch', { repo });
    };

    const handlePush = () => {
        if (!repo || !branchHead) return;
        if (remotes.length === 0) {
            setError('No remotes configured.');
            return;
        }
        if (remotes.length > 1) {
            setToolbarPromptKind('push');
            setToolbarPrompt({
                kind: 'pick',
                id: 'remote',
                title: 'Push Branch',
                message: `Push "${branchHead}" to remote`,
                options: remotes.map((remote) => ({ value: remote, label: remote })),
            });
            return;
        }
        setPushing(true);
        setError(null);
        handler.emit('push', { repo, branch: branchHead, remote: remotes[0] });
    };

    const runQuickSync = (remote: string, commitMessage: string) => {
        if (!repo || !branchHead) {
            return;
        }
        setSyncing(true);
        setError(null);
        handler.emit('quickSync', {
            repo,
            branch: branchHead,
            remote,
            commitMessage,
            noFastForward: pullDefaults.noFastForward,
            squash: pullDefaults.squash,
        });
    };

    const handleQuickSync = () => {
        if (!repo || !branchHead) {
            return;
        }
        if (remotes.length === 0) {
            setError('No remotes configured.');
            return;
        }
        if (branchHead.startsWith('(HEAD detached')) {
            setError('Cannot quick sync in detached HEAD state.');
            return;
        }
        setToolbarPromptKind('quickSyncConfirm');
        setToolbarPrompt({
            kind: 'form',
            id: 'quickSync',
            title: 'Quick Sync',
            message: 'Uncommitted changes will be committed, then the branch will be pulled and pushed.',
            submitLabel: 'Sync',
            fields: [
                {
                    type: 'text',
                    id: 'commitMessage',
                    label: 'Commit message',
                    defaultValue: QUICK_SYNC_DEFAULT_MESSAGE,
                },
            ],
        });
    };

    const handleOpenRemote = () => {
        if (!repo) return;
        if (remoteWebUrls.length === 0) {
            setError('No remote URL found for this repository.');
            return;
        }
        if (remoteWebUrls.length > 1) {
            setToolbarPromptKind('openRemote');
            setToolbarPrompt({
                kind: 'pick',
                id: 'url',
                title: 'Open Remote',
                message: 'Select the remote to open in your browser',
                options: remoteWebUrls.map((remote) => ({
                    value: remote.url,
                    label: remote.name,
                    description: remote.url,
                })),
            });
            return;
        }
        handler.emit('openRemote', { url: remoteWebUrls[0].url });
    };

    const handleToolbarPromptSubmit = (value: PromptSubmitValue) => {
        const kind = toolbarPromptKind;
        if (kind === 'quickSyncConfirm') {
            const formValues = typeof value === 'string' ? null : value;
            const commitMessage = formValues?.commitMessage?.trim() || QUICK_SYNC_DEFAULT_MESSAGE;
            pendingQuickSyncCommitMessageRef.current = commitMessage;
            if (remotes.length > 1) {
                setToolbarPrompt({
                    kind: 'pick',
                    id: 'remote',
                    title: 'Quick Sync',
                    message: `Sync "${branchHead}" with remote`,
                    options: remotes.map((remote) => ({ value: remote, label: remote })),
                });
                setToolbarPromptKind('quickSync');
                return;
            }
            setToolbarPrompt(null);
            setToolbarPromptKind(null);
            runQuickSync(remotes[0], commitMessage);
            return;
        }
        setToolbarPrompt(null);
        setToolbarPromptKind(null);
        if (kind === 'quickSync') {
            if (typeof value !== 'string') {
                return;
            }
            runQuickSync(value, pendingQuickSyncCommitMessageRef.current);
            return;
        }
        if (kind === 'push' && repo && branchHead && typeof value === 'string') {
            setPushing(true);
            setError(null);
            handler.emit('push', { repo, branch: branchHead, remote: value });
        } else if (kind === 'openRemote' && typeof value === 'string') {
            handler.emit('openRemote', { url: value });
        }
    };

    const handleToolbarPromptCancel = () => {
        setToolbarPrompt(null);
        setToolbarPromptKind(null);
    };

    const scrollToCommitIndex = useCallback((index: number | null) => {
        if (index === null || !contentRef.current) return;
        const row = contentRef.current.querySelector(`[data-commit-index="${index}"]`);
        if (!(row instanceof HTMLElement)) return;
        const container = contentRef.current;
        const rowTopInContainer = row.getBoundingClientRect().top - container.getBoundingClientRect().top;
        const rowBottomInContainer = row.getBoundingClientRect().bottom - container.getBoundingClientRect().top;
        const minTop = TABLE_HEADER_HEIGHT;
        const maxBottom = container.clientHeight;
        if (rowTopInContainer < minTop || rowBottomInContainer > maxBottom) {
            container.scrollTop += rowTopInContainer - minTop;
        }
    }, []);

    const handleFindNavigate = useCallback((index: number | null) => {
        setFindMatchIndex(index);
    }, []);

    const handleToggleFind = useCallback(() => {
        setFindOpen((open) => {
            if (open) {
                setFindMatchIndex(null);
            }
            return !open;
        });
        setSettingsOpen(false);
    }, []);

    const handleToggleFindRef = useRef(handleToggleFind);
    handleToggleFindRef.current = handleToggleFind;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                handleToggleFindRef.current();
                return;
            }
            if (e.key !== 'Escape') {
                return;
            }
            if (menu) {
                closeMenu();
                e.preventDefault();
                return;
            }
            if (toolbarPrompt || remoteForm || remoteDeleteName) {
                return;
            }
            if (findOpen) {
                setFindOpen(false);
                setFindMatchIndex(null);
                e.preventDefault();
                return;
            }
            if (settingsOpen) {
                setSettingsOpen(false);
                e.preventDefault();
                return;
            }
            if (selectedIndex !== null && detailAnchor) {
                closeCommitDetails();
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        menu,
        toolbarPrompt,
        remoteForm,
        remoteDeleteName,
        findOpen,
        settingsOpen,
        selectedIndex,
        detailAnchor,
        closeMenu,
        closeCommitDetails,
    ]);

    useEffect(() => {
        if (findMatchIndex === null) {
            return;
        }
        requestAnimationFrame(() => {
            scrollToCommitIndex(findMatchIndex);
        });
    }, [findMatchIndex, scrollToCommitIndex]);

    const handleExpandLayout = useCallback(() => {
        handler.emit('editorLayoutSingle');
    }, []);

    const handleToggleSettings = () => {
        const next = !settingsOpen;
        setSettingsOpen(next);
        setFindOpen(false);
        setFindMatchIndex(null);
        if (next && repo) {
            setConfigLoading(true);
            setPullDefaults(getPullDefaults(repo));
            handler.emit('loadRepoConfig', { repo });
        }
    };

    const handlePullDefaultsChange = (defaults: GitPullDefaults) => {
        setPullDefaults(defaults);
        if (repo) {
            savePullDefaults(repo, defaults);
        }
    };

    const handleFileHistorySplitLayoutChange = (layout: FileHistorySplitLayout) => {
        setFileHistorySplitLayout(layout);
        saveFileHistorySplitLayout(layout);
        handler.emit('saveFileHistorySplitLayout', { layout });
    };

    const handleRemoteAction = (action: 'add' | 'edit' | 'delete', name?: string) => {
        if (!repo) return;
        if (action === 'add') {
            setRemoteForm({ mode: 'add' });
            return;
        }
        if (action === 'edit' && name) {
            const remote = configRemotes.find((item) => item.name === name);
            if (remote) {
                setRemoteForm({ mode: 'edit', remote });
            }
            return;
        }
        if (action === 'delete' && name) {
            setRemoteDeleteName(name);
        }
    };

    const handleRemoteFormSubmit = (data: { name: string; url: string; pushUrl: string }) => {
        if (!repo || !remoteForm) return;
        if (remoteForm.mode === 'add') {
            handler.emit('remoteAction', {
                action: 'add',
                repo,
                name: data.name,
                url: data.url,
                pushUrl: data.pushUrl || undefined,
            });
        } else if (remoteForm.remote) {
            handler.emit('remoteAction', {
                action: 'edit',
                repo,
                name: remoteForm.remote.name,
                newName: data.name,
                url: data.url,
                pushUrl: data.pushUrl || undefined,
            });
        }
        setRemoteForm(null);
        setConfigLoading(true);
    };

    const handleRemoteDeleteConfirm = () => {
        if (!repo || !remoteDeleteName) return;
        handler.emit('remoteAction', { action: 'delete', repo, name: remoteDeleteName });
        setRemoteDeleteName(null);
        setConfigLoading(true);
    };

    const handleSearch = () => {
        clearCommitList();
        loadCommits(repo, selectedBranch, selectedAuthor, searchValue || undefined);
    };

    const handleFilterChange = (
        branch: string | null,
        author: string | undefined,
    ) => {
        clearCommitList();
        loadCommits(repo, branch, author, searchValueRef.current || undefined);
    };

    const loadMoreCommits = useCallback(() => {
        if (!repo || loadingMoreRef.current || !moreAvailable || loading || refreshing) {
            return;
        }
        loadingMoreRef.current = true;
        const nextMax = maxCommitsRef.current + LOAD_MORE_COMMITS;
        maxCommitsRef.current = nextMax;
        setMaxCommits(nextMax);
        loadCommits(
            repo,
            selectedBranchRef.current,
            selectedAuthorRef.current,
            searchValueRef.current || undefined,
            showRemoteBranches,
            stashesRef.current,
            remotesRef.current,
            relPathRef.current ?? undefined,
            nextMax,
            true,
        );
    }, [repo, moreAvailable, loading, refreshing, loadCommits, showRemoteBranches]);

    useEffect(() => {
        const content = contentRef.current;
        if (!content) {
            return;
        }
        const onScroll = () => {
            if (!moreAvailable || loading || loadingMoreRef.current || refreshing) {
                return;
            }
            const { scrollTop, clientHeight, scrollHeight } = content;
            if (scrollTop > 0 && clientHeight > 0 && scrollHeight > 0
                && scrollTop + clientHeight >= scrollHeight - 25) {
                loadMoreCommits();
            }
        };
        content.addEventListener('scroll', onScroll);
        return () => content.removeEventListener('scroll', onScroll);
    }, [moreAvailable, loading, refreshing, loadMoreCommits]);

    if (!initialized.current && loading && repos.length === 0) {
        return (
            <ConfigProvider theme={antTheme}>
                <div className="git-graph git-graph-loading" style={themeStyle(cssVars)}>
                    <div className="git-graph-loading-main">
                        <Spin size="large" tip="Loading Git History..." />
                    </div>
                    <GitHistoryBottomBar />
                </div>
            </ConfigProvider>
        );
    }

    if (repos.length === 0) {
        return (
            <ConfigProvider theme={antTheme}>
                <div className="git-graph git-graph-empty" style={themeStyle(cssVars)}>
                    <div className="git-graph-empty-main">
                        <Alert
                            type="info"
                            message="No Git repositories found"
                            description="Open a workspace folder containing a Git repository."
                        />
                    </div>
                    <GitHistoryBottomBar />
                </div>
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider theme={antTheme}>
        <div ref={viewRef} className={`git-graph${colorMode === 'light' ? ' git-graph-light' : ''}`} style={themeStyle(cssVars)}>
            {filePath && (
                <div className="git-graph-file-banner" title={relPath ?? filePath}>
                    <span className="codicon codicon-file" aria-hidden />
                    <span className="git-graph-file-banner-label">File History:</span>
                    <span className="git-graph-file-banner-path">{relPath ?? fileName ?? filePath}</span>
                </div>
            )}
            <Toolbar
                repos={repos}
                repo={repo}
                branches={branches}
                selectedBranch={selectedBranch}
                authors={authors}
                selectedAuthor={selectedAuthor}
                searchValue={searchValue}
                refreshing={refreshing}
                fetching={fetching}
                pushing={pushing}
                syncing={syncing}
                canPush={Boolean(repo && branchHead && !branchHead.startsWith('(HEAD detached') && remotes.length > 0)}
                canQuickSync={Boolean(repo && branchHead && !branchHead.startsWith('(HEAD detached') && remotes.length > 0)}
                hasRemoteUrl={hasRemoteUrl}
                findActive={findOpen}
                settingsActive={settingsOpen}
                splitView={splitView}
                onRepoChange={handleRepoChange}
                onBranchChange={(b) => {
                    setSelectedBranch(b);
                    selectedBranchRef.current = b;
                    handleFilterChange(b, selectedAuthorRef.current);
                }}
                onAuthorChange={(a) => {
                    setSelectedAuthor(a);
                    selectedAuthorRef.current = a;
                    handleFilterChange(selectedBranchRef.current, a);
                }}
                onSearchChange={setSearchValue}
                onSearch={handleSearch}
                onFetch={handleFetch}
                onPush={handlePush}
                onQuickSync={handleQuickSync}
                onOpenRemote={handleOpenRemote}
                onToggleFind={handleToggleFind}
                onRefresh={handleRefresh}
                onToggleSettings={handleToggleSettings}
                onExpandLayout={handleExpandLayout}
                adaptiveColorMode={adaptiveColorMode}
                onToggleColorMode={onToggleColorMode}
            />
            <div className="git-graph-body">
                <div className="git-graph-body-main">
                    <FindWidget
                        open={findOpen}
                        commits={commits}
                        currentIndex={findMatchIndex}
                        onClose={() => {
                            setFindOpen(false);
                            setFindMatchIndex(null);
                        }}
                        onNavigate={handleFindNavigate}
                    />
                    {error && <Alert type="error" message={error} closable style={{ margin: '8px 12px' }} />}
                    <div className="git-graph-content" ref={contentRef}>
                        {loading && commits.length === 0 ? (
                            <div className="git-graph-content-loading">
                                <Spin size="large" tip="Loading..." />
                            </div>
                        ) : (
                            <CommitTable
                                commits={commits}
                                branchHead={branchHead}
                                commitHead={commitHead}
                                selectedIndex={selectedIndex}
                                findMatchIndex={findMatchIndex}
                                rowHeight={ROW_HEIGHT}
                                graphConfig={graphConfig}
                                fileHistoryMode={Boolean(relPath) || Boolean(searchValue.trim())}
                                onSelect={handleSelectCommit}
                                onRowContextMenu={handleRowContextMenu}
                                onRefContextMenu={handleRefContextMenu}
                            />
                        )}
                    </div>
                    <GitHistoryBottomBar commitCount={commits.length} />
                </div>
                <SettingsWidget
                    open={settingsOpen}
                    repo={repo}
                    remotes={configRemotes}
                    loading={configLoading}
                    pullDefaults={pullDefaults}
                    fileHistorySplitLayout={fileHistorySplitLayout}
                    onClose={() => setSettingsOpen(false)}
                    onPullDefaultsChange={handlePullDefaultsChange}
                    onFileHistorySplitLayoutChange={handleFileHistorySplitLayoutChange}
                    onAddRemote={() => handleRemoteAction('add')}
                    onEditRemote={(name) => handleRemoteAction('edit', name)}
                    onDeleteRemote={(name) => handleRemoteAction('delete', name)}
                />
            </div>
            {actionPromptStep && (
                <ActionDialog
                    step={actionPromptStep}
                    anchored
                    anchor={actionPromptAnchor}
                    onCancel={cancelActionPrompt}
                    onSubmit={submitActionPrompt}
                />
            )}
            {toolbarPrompt && (
                <ActionDialog
                    step={toolbarPrompt}
                    onCancel={handleToolbarPromptCancel}
                    onSubmit={handleToolbarPromptSubmit}
                />
            )}
            {remoteForm && (
                <RemoteFormDialog
                    mode={remoteForm.mode}
                    remote={remoteForm.remote}
                    onCancel={() => setRemoteForm(null)}
                    onSubmit={handleRemoteFormSubmit}
                />
            )}
            {remoteDeleteName && (
                <ActionDialog
                    step={{
                        kind: 'confirm',
                        id: 'confirm',
                        title: 'Delete Remote',
                        message: `Delete remote "${remoteDeleteName}"?`,
                        confirmLabel: 'Delete',
                        danger: true,
                    }}
                    onCancel={() => setRemoteDeleteName(null)}
                    onSubmit={handleRemoteDeleteConfirm}
                />
            )}
            {selectedIndex !== null && detailAnchor && commits[selectedIndex] && (
                <CommitDetailPopup
                    anchor={detailAnchor}
                    containerRef={viewRef}
                    repo={repo}
                    commitHash={commits[selectedIndex].hash}
                    hasParents={commits[selectedIndex].parents.length > 0}
                    details={commitDetails}
                    loading={detailsLoading}
                    error={detailsError}
                    relPath={relPath}
                    filterCurrentFile={filterCurrentFile}
                    onClose={closeCommitDetails}
                    onToggleFilterCurrentFile={() => setFilterCurrentFile((v) => !v)}
                    onFileAction={executeGitAction}
                    onFileContextMenu={handleFileContextMenu}
                />
            )}
            <ContextMenu
                menu={menu}
                onClose={closeMenu}
                onSelect={handleContextMenuSelect}
            />
        </div>
        </ConfigProvider>
    );
}
