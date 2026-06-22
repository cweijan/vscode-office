import { SearchOutlined } from '@ant-design/icons'
import { Card, Flex, Input } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useWindowSize } from '../../util/reactUtils'
import { handler } from '../../util/vscode'
import Sponsor from '../components/Sponsor'
import './FontViewer.less'
import { FontInfo, formatUnicode, loadFont, renderGlyphItem, renderGlyphPreview } from './fontViewerMain'

/**
 * https://github.com/mathew-kurian/CharacterMap
 */
export default function FontViewer() {
    const [font, setFont] = useState(null)
    const [search, setSearch] = useState('')
    const fontInfoRef = useRef<FontInfo>(null)
    const [glyph, setGlyph] = useState(null)
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const previewRef = useRef<HTMLCanvasElement>(null)
    const [_, height] = useWindowSize()

    useEffect(() => {
        handler.on("open", async (content) => {
            const fontInfo = await loadFont(content)
            setFont(fontInfo.font)
            fontInfoRef.current = fontInfo
            setGlyph(null)
            setSelectedKey(null)
        }).emit("init")
    }, [])

    const glyphKeys = useMemo(() => {
        if (!font) return []
        const keys = Object.keys(font.glyphs.glyphs)
        if (!search) return keys
        const pattern = new RegExp(search, 'i')
        const filtered: string[] = []
        for (const key of keys) {
            if (font.glyphs.glyphs[key].name.match(pattern)) {
                filtered.push(key)
            }
        }
        return filtered
    }, [font, search])

    const icons = useMemo(() => (
        glyphKeys.map((key) => (
            <canvas
                width="100"
                height="84"
                key={key}
                className={`item${selectedKey === key ? ' selected' : ''}`}
                id={`g${key}`}
                onClick={() => {
                    setGlyph(font.glyphs.glyphs[key])
                    setSelectedKey(key)
                }}
            />
        ))
    ), [font, glyphKeys, selectedKey])

    useEffect(() => {
        if (!font) return
        for (const key of glyphKeys) {
            const ele = document.getElementById(`g${key}`)
            if (!ele) continue
            renderGlyphItem(fontInfoRef.current, ele as HTMLCanvasElement, key)
        }
    }, [icons, font, glyphKeys])

    useEffect(() => {
        if (!glyph || !previewRef.current || !fontInfoRef.current) return
        renderGlyphPreview(fontInfoRef.current, previewRef.current, selectedKey)
    }, [glyph, selectedKey])

    return (
        <Flex className="font-viewer">
            <div style={{ background: '#FFF', overflow: 'auto', height, flexGrow: 1 }}>
                <div id="glyph-list-end">
                    {icons}
                </div>
            </div>

            <Flex className="sidebar" style={{ height }}>
                <div className="sidebar-content">
                    <Card className="sidebar-card" title="Search">
                        <Input
                            placeholder="Search by glyph name"
                            prefix={<SearchOutlined />}
                            allowClear
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {font && (
                            <div className="glyph-count">
                                {glyphKeys.length} / {Object.keys(font.glyphs.glyphs).length} glyphs
                            </div>
                        )}
                    </Card>

                    <Card className="sidebar-card" title="Font">
                        <div className="info-card">
                            {!font ? (
                                <div><dt>Status</dt><dd>Waiting for font file…</dd></div>
                            ) : (
                                <>
                                    <div><dt>Family</dt><dd>{font.names.fontFamily.en}</dd></div>
                                    <div><dt>Style</dt><dd>{font.names.fontSubfamily.en}</dd></div>
                                    <div><dt>Format</dt><dd>{font.outlinesFormat}</dd></div>
                                    <div><dt>Version</dt><dd>{font.names.version.en}</dd></div>
                                </>
                            )}
                        </div>
                    </Card>

                    <Card className="sidebar-card" title="Character">
                        <div className="glyph-preview">
                            {glyph ? (
                                <canvas ref={previewRef} width="180" height="120" />
                            ) : (
                                <span className="preview-placeholder">Select a glyph to preview</span>
                            )}
                        </div>
                        <div className="info-card">
                            <div><dt>Unicode</dt><dd>{glyph?.unicodes.map(formatUnicode).join(', ') || '-'}</dd></div>
                            <div><dt>Name</dt><dd>{glyph?.name || '-'}</dd></div>
                            <div>
                                <dt>Class</dt>
                                <dd>{glyph && font ? `${font.names.fontFamily.en}-${glyph.name}` : '-'}</dd>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="sidebar-bottom">
                    <Sponsor variant="sidebar" />
                </div>
            </Flex>
        </Flex>
    )
}
