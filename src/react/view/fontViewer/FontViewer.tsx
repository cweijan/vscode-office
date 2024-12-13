import { Card, Flex, Input } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useWindowSize } from '../../util/reactUtils'
import { handler } from '../../util/vscode'
import './FontViewer.less'
import { FontInfo, formatUnicode, loadFont, renderGlyphItem } from './fontViewerMain'

/**
 * https://github.com/mathew-kurian/CharacterMap
 */
export default function FontViewer() {
    const [font, setFont] = useState(null)
    const [search, setSearch] = useState(null)
    const fontInfoRef = useRef<FontInfo>(null)
    const [glyph, setGlyph] = useState(null)
    const [_, height] = useWindowSize();

    useEffect(() => {
        handler.on("open", async (content) => {
            const fontInfo = await loadFont(content.path)
            setFont(fontInfo.font)
            fontInfoRef.current = fontInfo
        }).emit("init")
    }, [])

    const icons = useMemo(() => (
        font ? Object.keys(font.glyphs.glyphs)
            .filter(i => {
                if (!search) return true
                const glyph = font.glyphs.glyphs[i]
                return glyph.name.match(new RegExp(search, 'i'))
            })
            .map((i) => (
                <canvas width="100" height="84" key={i}
                    className="item" id={`g${i}`}
                    onClick={() => { setGlyph(font.glyphs.glyphs[i]) }}
                ></canvas>
            )) : null
    ), [font, search])

    useEffect(() => {
        if (!font) return;
        for (const key of Object.keys(font.glyphs.glyphs)) {
            const ele = document.getElementById(`g${key}`);
            if (!ele) continue;
            renderGlyphItem(fontInfoRef.current, document.getElementById(`g${key}`) as HTMLCanvasElement, key);
        }
    }, [icons])

    return (
        <Flex>
            {/* 图标 */}
            <div style={{ background: '#FFF', overflow: 'auto', height, flexGrow: 1 }}>
                <div id="glyph-list-end" >
                    {icons}
                </div>
            </div>
            {/* 字体信息 */}
            <Flex style={{ width: '280px', background: '#f0f2f5', flexShrink: 0, paddingTop: '20px', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ padding: '0 10px' }}>
                    <Card title="Search" style={{ marginBottom: 15 }}>
                        <Input placeholder="Name" size="middle" allowClear autoFocus onChange={e => setSearch(e.target.value)} />
                    </Card>
                    <Card title="Font" style={{ marginBottom: 15 }}>
                        <div className='info-card'>
                            {
                                !font ? null :
                                    <>
                                        <div><dt>Family</dt><dd>{font.names.fontFamily.en}</dd></div>
                                        <div><dt>Style</dt><dd>{font.names.fontSubfamily.en}</dd></div>
                                        <div><dt>Format</dt><dd>{font.outlinesFormat}</dd></div>
                                        <div><dt>Version</dt><dd>{font.names.version.en}</dd></div>
                                    </>
                            }
                        </div>
                    </Card>
                    <Card title="Character">
                        <div className='info-card'>
                            {
                                <>
                                    <div><dt>Unicode</dt><dd> {glyph?.unicodes.map(formatUnicode).join(', ') || '-'}</dd></div>
                                    <div><dt>Name</dt><dd>{glyph?.name || '-'}</dd></div>
                                    <div>
                                        <dt>Class</dt>
                                        <dd>
                                            {glyph ? `${font.names.fontFamily.en}-${glyph.name}` : '-'}
                                        </dd>
                                    </div>
                                </>
                            }
                        </div>
                    </Card>
                </div>
                <div style={{ textAlign: 'center', marginBottom: '15px', color: 'rgb(70 69 69)' }}>
                    Powered By OpenType.js
                </div>
            </Flex>

        </Flex>
    )
}