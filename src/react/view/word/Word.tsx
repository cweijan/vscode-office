import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Alert, Spin } from "antd";
import { DocxEditor, type DocxEditorRef } from "@eigenpal/docx-editor-react";
import "@eigenpal/docx-editor-react/styles.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { handler, vscodeApi } from "../../util/vscode";
import { loadOfficeBuffer } from "../../util/loadOfficeContent";
import SponsorBar from "../components/SponsorBar";
import { getConfigs } from "../../util/vscodeConfig";
import "./Word.css";

type WordColorMode = "light" | "adaptive";

const WORD_COLOR_MODE_KEY = "office-word-color-mode";

function loadWordColorMode(): WordColorMode {
    const state = vscodeApi?.getState?.() as { wordColorMode?: WordColorMode } | undefined;
    if (state?.wordColorMode === "light" || state?.wordColorMode === "adaptive") {
        return state.wordColorMode;
    }
    try {
        const saved = localStorage.getItem(WORD_COLOR_MODE_KEY);
        if (saved === "light" || saved === "adaptive") {
            return saved;
        }
    } catch { }
    return "light";
}

function saveWordColorMode(mode: WordColorMode) {
    try {
        localStorage.setItem(WORD_COLOR_MODE_KEY, mode);
    } catch { }
    if (vscodeApi?.setState) {
        const prev = (vscodeApi.getState?.() ?? {}) as Record<string, unknown>;
        vscodeApi.setState({ ...prev, wordColorMode: mode });
    }
}

interface WordOpenPayload {
    path?: string;
    buffer?: number[];
    error?: string;
    readOnly?: boolean;
    fileName?: string;
    documentCacheId?: string;
    nonce?: number;
}

export default function Word() {
    const editorRef = useRef<DocxEditorRef>(null);
    const readOnlyRef = useRef(false);
    const [colorMode, setColorMode] = useState<WordColorMode>(loadWordColorMode);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [readOnly, setReadOnly] = useState(false);
    const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | undefined>(undefined);
    const [documentKey, setDocumentKey] = useState("");
    const [fileName, setFileName] = useState("");
    const [commentsSidebarOpen, setCommentsSidebarOpen] = useState(false);
    const skipCommentsAutoOpenRef = useRef(true);

    const adaptiveColorMode = colorMode === "adaptive";

    const toggleColorMode = () => {
        setColorMode((prev) => {
            const next: WordColorMode = prev === "adaptive" ? "light" : "adaptive";
            saveWordColorMode(next);
            return next;
        });
    };

    const emitSave = useCallback((buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        const content: number[] = new Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            content[i] = bytes[i];
        }
        handler.emit("save", content);
    }, []);

    const handleSave = useCallback(async () => {
        const buffer = await editorRef.current?.save();
        if (!buffer) {
            return;
        }
        emitSave(buffer);
    }, [emitSave]);

    const loadDocument = useCallback(async (payload: WordOpenPayload) => {
        setLoading(true);
        setError(null);
        setDocumentBuffer(undefined);

        try {
            const fileReadOnly = payload.readOnly === true;
            readOnlyRef.current = fileReadOnly;
            setReadOnly(fileReadOnly);
            setFileName(payload.fileName ?? "");
            setDocumentKey(`${payload.documentCacheId ?? ""}-${payload.nonce ?? Date.now()}`);
            skipCommentsAutoOpenRef.current = true;
            setCommentsSidebarOpen(false);
            const buffer = await loadOfficeBuffer(payload);
            setDocumentBuffer(buffer);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load document");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handler
            .on("open", (payload: WordOpenPayload) => {
                void loadDocument(payload);
            })
            .emit("init");
    }, [loadDocument]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
                e.preventDefault();
                void handleSave();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [handleSave]);

    return (
        <div className={`word-viewer${adaptiveColorMode ? " word-viewer--vscode-theme" : ""}`}>
            <button
                type="button"
                className="dark-mode-toggle"
                title={adaptiveColorMode ? "切换亮色" : "切换暗色（跟随 VS Code 主题）"}
                aria-label={adaptiveColorMode ? "Switch to light mode" : "Switch to adaptive dark mode"}
                onClick={toggleColorMode}
            >
                {adaptiveColorMode ? <SunOutlined /> : <MoonOutlined />}
            </button>
            <Spin spinning={loading} fullscreen />
            {error && <Alert type="error" message={error} showIcon style={{ margin: 16 }} />}
            {readOnly && !loading && !error && documentBuffer && (
                <div className="word-readonly-banner">Read-only — edits will be saved to a new file</div>
            )}
            {documentBuffer && !loading && !error && (
                <>
                    <DocxEditor
                        key={documentKey}
                        ref={editorRef}
                        className="word-editor"
                        documentBuffer={documentBuffer}
                        documentName={fileName}
                        documentNameEditable={false}
                        readOnly={readOnly}
                        {...(readOnly ? { mode: "viewing" as const } : {})}
                        commentsSidebarOpen={commentsSidebarOpen}
                        onCommentsSidebarOpenChange={(open) => {
                            if (open && skipCommentsAutoOpenRef.current) {
                                skipCommentsAutoOpenRef.current = false;
                                return;
                            }
                            setCommentsSidebarOpen(open);
                        }}
                        colorMode="light"
                        showFileOpen={false}
                        showHelpMenu={false}
                        onChange={() => {
                            if (!readOnlyRef.current) {
                                handler.emit("change");
                            }
                        }}
                        onSave={emitSave}
                    />
                    {getConfigs()?.sponsorBaseUrl && (
                        <footer className="word-sponsor-footer">
                            <SponsorBar placement="right" />
                        </footer>
                    )}
                </>
            )}
        </div>
    );
}
