import { useCallback, useEffect, useState } from 'react';
import { App } from 'antd';
import { handler, loadDarkMode, applyDarkMode } from '../../util/vscode';
import { $t } from '../../i18n/i18nConfig';
import { useWindowSize } from '../../util/reactUtils';
import FileItems from './components/FileItems';
import PasswordModal from './components/PasswordModal';
import Sponsor from '../components/Sponsor';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import './Zip.less';
import { CompressInfo, FileInfo } from './zipTypes';

type PasswordAction = { label: string; run: (password?: string) => void };

const NARROW_WIDTH_BREAKPOINT = 640;

export default function Zip() {
    return (
        <App>
            <ZipViewer />
        </App>
    );
}

function ZipViewer() {
    const { message } = App.useApp();
    const saveSuccessText = $t('common.saved');
    const [currentDir, setCurrentDir] = useState('')
    const [size, setSize] = useState('')
    const [extension, setExtension] = useState('')
    const [encrypted, setEncrypted] = useState(false)
    const [archivePassword, setArchivePassword] = useState<string>()
    const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(null)
    const [passwordError, setPasswordError] = useState('')
    const [tableItems, setTableItems] = useState([] as FileInfo[])
    const [info, setInfo] = useState({ files: [] } as CompressInfo)
    const [loaded, setLoaded] = useState(false)
    const [dark, setDark] = useState(loadDarkMode)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [width] = useWindowSize()
    const effectiveWidth = width || window.innerWidth
    const isNarrowWidth = effectiveWidth <= NARROW_WIDTH_BREAKPOINT
    const showSidebar = !isNarrowWidth && !sidebarCollapsed

    const toggleSidebar = useCallback(() => {
        if (isNarrowWidth) {
            return;
        }
        setSidebarCollapsed((collapsed) => !collapsed);
    }, [isNarrowWidth]);

    const changeFiles = (dirPath: string) => {
        setCurrentDir(dirPath)
        setTableItems(dirPath ? [
            {
                name: '..',
                isDirectory: true,
                entryName: dirPath.includes('/') ? dirPath.replace(/\/[^\/]+$/, '') : null,
            },
            ...info.folderMap[dirPath].children
        ] : info.files)
    }

    const needsPassword = useCallback((entry?: FileInfo) => {
        return encrypted || Boolean(entry?.encrypted)
    }, [encrypted])

    const withPassword = useCallback((label: string, required: boolean, run: (password?: string) => void) => {
        if (required && !archivePassword) {
            setPasswordAction({ label, run })
            return
        }
        setPasswordError('')
        run(archivePassword)
    }, [archivePassword])

    const handleExtract = useCallback(() => {
        withPassword('extract the archive', encrypted, (password) => {
            handler.emit('autoExtract', password)
        })
    }, [encrypted, withPassword])

    const handleOpenPath = useCallback((entry: FileInfo) => {
        if (entry.isDirectory) {
            handler.emit('openPath', { entry, password: archivePassword })
            return
        }
        withPassword('open this file', needsPassword(entry), (password) => {
            handler.emit('openPath', { entry, password })
        })
    }, [archivePassword, needsPassword, withPassword])

    useEffect(() => {
        document.body.classList.toggle('office-dark', dark)
    }, [dark])

    const toggleDark = () => {
        setDark(prev => {
            const next = !prev
            applyDarkMode(next)
            return next
        })
    }

    handler
        .on('size', (size: string) => {
            setSize(size)
        })
        .on('extension', (extension: string) => {
            setExtension(extension)
            setEncrypted(false)
            setArchivePassword(undefined)
        })
        .on('encrypted', (value: boolean) => {
            setEncrypted(value)
        })
        .on('passwordError', () => {
            setArchivePassword(undefined)
            setPasswordError($t('compress.wrongPassword'))
        })
        .on('data', (info: CompressInfo) => {
            setInfo(info)
            setLoaded(true)
            setTableItems(info.files)
        })
        .on('openDir', changeFiles)

    useEffect(() => {
        handler
            .on('zipChange', () => handler.emit('init'))
            .on('saveDone', () => {
                message.success({
                    duration: 2,
                    content: saveSuccessText,
                });
            })
            .emit('init')
    }, [message, saveSuccessText])

    return (
        <div className="zip-viewer">
            <Toolbar
                currentDir={currentDir}
                size={size}
                extension={extension}
                dark={dark}
                onToggleDark={toggleDark}
                onExtract={handleExtract}
                showSidebar={showSidebar}
                sidebarToggleDisabled={isNarrowWidth}
                onToggleSidebar={toggleSidebar}
            />
            <div className={`zip-body${showSidebar ? '' : ' zip-body--sidebar-hidden'}`}>
                <aside className="zip-sider">
                    <div className="zip-sider-tree">
                        <Sidebar
                            name={info.fileName}
                            folderMap={info.folderMap}
                            rootFiles={info.files}
                            currentDir={currentDir}
                            onClickFolder={changeFiles}
                        />
                    </div>
                    <Sponsor dark={dark} variant="sidebar" />
                </aside>
                <main className="zip-content">
                    <FileItems items={tableItems} loaded={loaded} onOpenPath={handleOpenPath} />
                </main>
            </div>

            <PasswordModal
                key={passwordAction?.label ?? 'closed'}
                open={passwordAction !== null}
                action={passwordAction?.label ?? ''}
                error={passwordError}
                onCancel={() => {
                    setPasswordAction(null)
                    setPasswordError('')
                }}
                onSubmit={(password) => {
                    const trimmed = password.trim()
                    setArchivePassword(trimmed || undefined)
                    setPasswordError('')
                    const action = passwordAction
                    setPasswordAction(null)
                    action?.run(trimmed || undefined)
                }}
            />

        </div>
    )
}
