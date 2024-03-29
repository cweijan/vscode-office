import { Flex } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useWindowSize } from '../../util/reactUtils'
import { handler } from '../../util/vscode'
import './FontViewer.css'
import { FontInfo, formatUnicode, loadFont, renderGlyphItem } from './fontViewerMain'

/**
 * CharMap - Powered by OpenType.js
 * https://github.com/mathew-kurian/CharacterMap
 */
export default function FontViewer() {
    const [font, setFont] = useState(null)
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
        font ? Object.keys(font.glyphs.glyphs).map((i) => (
            <canvas width="60p" height="70" key={i}
                className="item" id={`g${i}`}
                onClick={() => { setGlyph(font.glyphs.glyphs[i]) }}
            ></canvas>
        )) : null
    ), [font])

    useEffect(() => {
        if (!font) return;
        for (const key of Object.keys(font.glyphs.glyphs)) {
            renderGlyphItem(fontInfoRef.current, document.getElementById(`g${key}`), key);
        }
    }, [icons])

    return (
        <Flex>
            {/* 字体信息 */}
            <Flex style={{ width: '280px', background: '#171D25', flexShrink: 0, paddingTop: '20px', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ overflow: 'auto', height: '100%', overflowX: 'hidden', padding: '20px', paddingTop: 0 }}>
                    <div style={{ fontSize: '25px', marginTop: '5px', color: '#5B6971', fontWeight: 100, letterSpacing: '1px', textAlign: 'left', marginBottom: '15px' }}>
                        Font
                    </div>
                    <div id="font-data">
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
                    <div style={{ fontSize: '25px', marginTop: '10px', color: '#5B6971', fontWeight: 100, letterSpacing: '1px', textAlign: 'left', marginBottom: '20px' }}>
                        Character
                    </div>
                    <div id="glyph-data" >
                        {
                            !glyph ? null :
                                <>
                                    <div><dt>Name</dt><dd>{glyph.name}</dd></div>
                                    <div><dt>Unicode</dt><dd> {glyph.unicodes.map(formatUnicode).join(', ')}</dd></div>
                                </>
                        }
                    </div>
                </div>
                <div style={{ fontSize: '14px', color: '#999', textAlign: 'center', marginBottom: '15px' }}>
                    Powered By OpenType.js
                </div>
            </Flex>
            {/* 图标 */}
            <div style={{ background: '#FFF', overflow: 'auto', height: height - 20 }}>
                <div id="glyph-list-end" >
                    {icons}
                </div>
            </div>
        </Flex>
    )
}