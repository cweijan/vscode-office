import { useEffect, useMemo, useRef, useState } from 'react'
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

    function Pagination() {
        if (!font) return null;
        const totalPage = ((font.numGlyphs / 200) + 1) | 0;
        return new Array(totalPage).fill(0).map((_, i) => (
            <div className="page" key={i}>{i * 200} → {((i + 1) * 200) - 1}</div>
        ))
    }

    return (
        <>
            <div style={{ position: 'fixed', top: 0, right: 0, left: 0, bottom: 0, width: '200px', background: '#171D25', padding: '20px' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', padding: '0 20px', zIndex: 3 }}>
                    <div style={{ fontSize: '10px', color: '#999', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center', position: 'relative', lineHeight: '60px' }}>
                        Powered By OpenType.js
                    </div>
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '40px', zIndex: 2, padding: '15px' }}>
                    <div className="nicescroll-left" style={{ overflow: 'auto', height: '100%', overflowX: 'hidden', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.07)', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <Pagination />
                    </div>
                </div>
            </div>
            <div style={{ position: 'fixed', left: '200px', width: '475px', top: 0, bottom: 0, background: '#1D242E', padding: '20px' }}>
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, bottom: 0, zIndex: 2 }}>
                    <div className="nicescroll-center" style={{ overflow: 'auto', height: '100%', overflowX: 'hidden', padding: '20px', paddingTop: 0 }}>
                        <div style={{ fontSize: '25px', marginTop: '5px', color: '#5B6971', fontWeight: 100, letterSpacing: '1px', textAlign: 'left', marginBottom: '15px' }}>
                            Font
                        </div>
                        <div id="font-data">
                            {
                                !font ? null :
                                    <>
                                        <div><dt>family</dt><dd>{font.names.fontFamily.en}</dd></div>
                                        <div><dt>style</dt><dd>{font.names.fontSubfamily.en}</dd></div>
                                        <div><dt>format</dt><dd>{font.outlinesFormat}</dd></div>
                                        <div><dt>version</dt><dd>{font.names.version.en}</dd></div>
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
                                        <div><dt>name</dt><dd>{glyph.name}</dd></div>
                                        <div><dt>unicode</dt><dd> {glyph.unicodes.map(formatUnicode).join(', ')}</dd></div>
                                    </>
                            }
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ position: 'fixed', left: '675px', right: 0, top: 0, bottom: 0, background: '#FFF' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80px', padding: '20px', boxShadow: 'inset 0 -1px 0 #EEE', zIndex: 3, background: '#FFF' }}>
                    <div style={{ fontSize: '25px', marginTop: '5px', color: '#BBB', fontWeight: 100, letterSpacing: '1px', textAlign: 'left' }}>
                        Glyphs
                    </div>
                </div>
                <div style={{ position: 'absolute', top: '80px', left: 0, right: 0, bottom: 0, zIndex: 2 }}>
                    <div className="nicescroll-right" style={{ overflow: 'auto', height: '100%', overflowX: 'hidden' }}>
                        <div id="glyph-list-end" >
                            {icons}
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <div id="message" />
            </div>
        </>
    )
}