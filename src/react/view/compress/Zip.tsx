import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { handler, loadDarkMode, applyDarkMode } from '../../util/vscode';
import { getConfigs } from '../../util/vscodeConfig';
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
    const saveSuccessText = getConfigs()?.language?.startsWith('zh') ? '保存成功' : 'Saved';
    const [currentDir, setCurrentDir] = useState('')
    const [size, setSize] = useState('')
    const [extension, setExtension] = useState('')
    const [encrypted, setEncrypted] = useState(false)
    const [archivePassword, setArchivePassword] = useState<string>()
    const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(null)
    const [passwordError, setPasswordError] = useState('')
    const archivePasswordRef = useRef<string>()
    const [tableItems, setTableItems] = useState([] as FileInfo[])
    const [info, setInfo] = useState({ files: [] } as CompressInfo)
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

    archivePasswordRef.current = archivePassword

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
        if (required && !archivePasswordRef.current) {
            setPasswordAction({ label, run })
            return
        }
        setPasswordError('')
        run(archivePasswordRef.current)
    }, [])

    const handleExtract = useCallback(() => {
        withPassword('extract the archive', encrypted, (password) => {
            handler.emit('autoExtract', password)
        })
    }, [encrypted, withPassword])

    const handleOpenPath = useCallback((entry: FileInfo) => {
        if (entry.isDirectory) {
            handler.emit('openPath', { entry, password: archivePasswordRef.current })
            return
        }
        withPassword('open this file', needsPassword(entry), (password) => {
            handler.emit('openPath', { entry, password })
        })
    }, [needsPassword, withPassword])

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
            setPasswordError('Wrong password')
        })
        .on('data', (info: CompressInfo) => {
            setInfo(info)
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
                    <FileItems items={tableItems} onOpenPath={handleOpenPath} />
                </main>
            </div>

            <PasswordModal
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
