import { useEffect } from 'react'
import './FontViewer.css'
import { handler } from '../../util/vscode'
import opentype from 'opentype.js'
import { onFontLoaded, prepareGlyphList, showErrorMessage } from './fontViewerMain'

/**
 * CharMap - Powered by OpenType.js
 * https://github.com/mathew-kurian/CharacterMap
 */
export default function FontViewer() {

    useEffect(() => {
        prepareGlyphList()
        handler.on("open", async (content) => {
            if (content.path.includes('woff2')) {
                const loadScript = (src) => new Promise((onload) => document.documentElement.append(
                    Object.assign(document.createElement('script'), { src, onload })
                ));
                return loadScript('woff2_decompress_binding.js')
                    .then(() => fetch(content.path))
                    .then(f => f.arrayBuffer())
                    .then((buffer) => window['Module'].decompress(buffer))
                    .then((buffer) => onFontLoaded(opentype.parse(Uint8Array.from(buffer).buffer)));
            }
            opentype.load(content.path, function (err, font) {
                // var amount, glyph, ctx, x, y, fontSize;
                if (err) {
                    showErrorMessage(err.toString());
                    return;
                }
                onFontLoaded(font);
            });
        }).emit("init")
    }, [])

    return (
        <>
            <div style={{ position: 'fixed', top: 0, right: 0, left: 0, bottom: 0, width: '200px', background: '#171D25', padding: '20px' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', padding: '0 20px', zIndex: 3 }}>
                    <div style={{ fontSize: '10px', color: '#999', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center', position: 'relative', lineHeight: '60px' }}>
                        Powered By OpenType.js
                    </div>
                </div>
                {/* <div style="position:absolute;top:0;left:0;right:0;height:40px;box-shadow:0 -1px 3px rgba(0,0,0,0.2);z-index:3;background:#171D25;padding:15px;">
        <div class="browse-wrap" style="position:relative;height:40px;border-radius:4px;">
            <div class="title" id="font-family" style="text-align:center;line-height:40px;">Select font</div>
            <input id="file" type="file" name="upload" class="upload" title="select font"/>
        </div>
    </div> */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '40px', zIndex: 2, padding: '15px' }}>
                    <div className="nicescroll-left" style={{ overflow: 'auto', height: '100%', overflowX: 'hidden', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.07)', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <div id="pagination" />
                    </div>
                </div>
            </div>
            <div style={{ position: 'fixed', left: '200px', width: '475px', top: 0, bottom: 0, background: '#1D242E', padding: '20px' }}>
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, bottom: 0, zIndex: 2 }}>
                    <div className="nicescroll-center" style={{ overflow: 'auto', height: '100%', overflowX: 'hidden', padding: '20px', paddingTop: 0 }}>
                        <div style={{ fontSize: '25px', marginTop: '5px', color: '#5B6971', fontWeight: 100, letterSpacing: '1px', textAlign: 'left', marginBottom: '15px' }}>
                            Font
                        </div>
                        <div id="font-data" />
                        <div style={{ fontSize: '25px', marginTop: '10px', color: '#5B6971', fontWeight: 100, letterSpacing: '1px', textAlign: 'left', marginBottom: '20px' }}>
                            Character <input id="copy-char" style={{ border: 'none', color: '#14bfff', borderBottom: '1px dotted rgba(255,255,255,0.5)', background: 'transparent', fontSize: '15px', borderRadius: '2px', fontWeight: 600, position: 'relative', top: '-4px', left: '5px', width: '30px', height: '30px', textAlign: 'center', outline: 'none', fontFamily: 'Arial' }} />
                        </div>
                        <div id="glyph-display" style={{ position: 'relative' }}>
                            <canvas id="glyph-bg" width={420} height={310} />
                            <canvas id="glyph" width={300} height={300} />
                        </div>
                        <div id="glyph-data" />
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
                        <div id="glyph-list-end" />
                    </div>
                </div>
            </div>
            <div>
                <div id="message" />
            </div>
        </>
    )
}