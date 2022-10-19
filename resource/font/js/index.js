// Code from
// http://nodebox.github.io/opentype.js/

var fileButton, fontFamily;
var pageSelected, font, fontScale, fontSize, fontBaseline, glyphScale, glyphSize, glyphBaseline;

var cellCount = 200,
    cellWidth = 60,
    cellHeight = 70,
    cellMarginTop = 20,
    cellMarginBottom = 20,
    cellMarginLeftRight = 1,
    glyphMargin = 5;

function cellSelect(event) {
    if (!font) return;
    var firstGlyphIndex = pageSelected * cellCount,
        cellIndex = +event.target.id.substr(1),
        glyphIndex = firstGlyphIndex + cellIndex;
    if (glyphIndex < font.numGlyphs) {
        displayGlyph(glyphIndex);
        displayGlyphData(glyphIndex);
    }
}

onload = () => {

    fontFamily = document.getElementById('font-family');
    // fileButton = document.getElementById('file');
    // fileButton.addEventListener('change', onReadFile, false);

    if (vscodeEvent) {
        vscodeEvent.emit("init")
        vscodeEvent.on("open", (content) => {
            opentype.load(content.href, function (err, font) {
                var amount, glyph, ctx, x, y, fontSize;
                if (err) {
                    showErrorMessage(err.toString());
                    return;
                }
                onFontLoaded(font);
            });
        })

    }

    prepareGlyphList();

    // $(".nicescroll-left").niceScroll({
    //     cursorcolor: "rgba(255,255,255,0.2)",
    //     cursorborderradius: "5px",
    //     cursorborder: "none",
    //     cursorwidth: "7"
    // });

    // $(".nicescroll-center").niceScroll({
    //     cursorcolor: "rgba(255,255,255,0.4)",
    //     cursorborderradius: 0,
    //     cursorborder: "none",
    //     cursorwidth: "7"
    // });

    // $(".nicescroll-right").niceScroll({
    //     cursorcolor: "#AAA",
    //     cursorborderradius: 0,
    //     cursorborder: "none",
    //     cursorwidth: "7"
    // });
    // Span
    // var span = document.getElementsByClassName('upload-path');
    // Button
    // var uploader = document.getElementById('upload');
    // Detect changes
    // uploader.onchange = function() {
    //     // Echo filename in span
    //     span[0].innerHTML = this.files[0].name;
    // };
}

/**
 * This function is Path.prototype.draw with an arrow
 * at the end of each contour.
 */
function drawPathWithArrows(ctx, path) {
    var i, cmd, x1, y1, x2, y2;
    var arrows = [];
    ctx.beginPath();
    for (i = 0; i < path.commands.length; i += 1) {
        cmd = path.commands[i];
        if (cmd.type === 'M') {
            if (x1 !== undefined) {
                arrows.push([ctx, x1, y1, x2, y2]);
            }
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            ctx.lineTo(cmd.x, cmd.y);
            x1 = x2;
            y1 = y2;
        } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
            x1 = cmd.x2;
            y1 = cmd.y2;
        } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
            x1 = cmd.x1;
            y1 = cmd.y1;
        } else if (cmd.type === 'Z') {
            arrows.push([ctx, x1, y1, x2, y2]);
            ctx.closePath();
        }
        x2 = cmd.x;
        y2 = cmd.y;
    }
    if (path.fill) {
        ctx.fillStyle = path.fill;
        ctx.fill();
    }
    if (path.stroke) {
        ctx.strokeStyle = path.stroke;
        ctx.lineWidth = path.strokeWidth;
        ctx.fillStyle = path.stroke;
        ctx.stroke();
    }
    arrows.forEach(function (arrow) {
        drawArrow.apply(null, arrow);
    });
}

var arrowLength = 10,
    arrowAperture = 4;

function drawArrow(ctx, x1, y1, x2, y2) {
    var dx = x2 - x1,
        dy = y2 - y1,
        segmentLength = Math.sqrt(dx * dx + dy * dy),
        unitx = dx / segmentLength,
        unity = dy / segmentLength,
        basex = x2 - arrowLength * unitx,
        basey = y2 - arrowLength * unity,
        normalx = arrowAperture * unity,
        normaly = -arrowAperture * unitx;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(basex + normalx, basey + normaly);
    ctx.lineTo(basex - normalx, basey - normaly);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
}

function renderGlyphItem(canvas, glyphIndex) {
    var cellMarkSize = 6;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cellWidth, cellHeight);
    if (glyphIndex >= font.numGlyphs) return;

    ctx.fillStyle = '#AAA';
    ctx.font = '9px "Open Sans"';
    ctx.fillText(glyphIndex, 2, cellHeight - 2);
    var glyph = font.glyphs.glyphs[glyphIndex],
        glyphWidth = glyph.advanceWidth * fontScale,
        xmin = (cellWidth - glyphWidth) / 2,
        xmax = (cellWidth + glyphWidth) / 2,
        x0 = xmin;

    // ctx.fillStyle = '#e67e22';
    // ctx.fillRect(xmin - cellMarkSize + 2, fontBaseline, cellMarkSize, 2);
    // ctx.fillRect(xmin, fontBaseline, 2, cellMarkSize);
    // ctx.fillRect(xmax, fontBaseline, cellMarkSize, 2);
    // ctx.fillRect(xmax, fontBaseline, 2, cellMarkSize);

    ctx.fillStyle = '#FFFFFF';

    var path = glyph.getPath(x0, fontBaseline, fontSize);
    path.fill = "#333";
    path.draw(ctx);
}

var resolveGlyphDpi;
var glyphBgCanvasHeight;

function initGlyphDisplay() {
    var glyphBgCanvas = document.getElementById('glyph-bg'),
        ctx = glyphBgCanvas.getContext('2d');

    if (!resolveGlyphDpi) {
        hidpi(glyphBgCanvas, glyphBgCanvas.width, glyphBgCanvas.height);
        resolveGlyphDpi = true;
    }

    var w = glyphBgCanvas.width,
        h = 300,
        glyphW = w - glyphMargin * 2,
        glyphH = h - glyphMargin * 2,
        head = font.tables.head,
        maxHeight = head.yMax - head.yMin;

    glyphScale = Math.min(glyphW / (head.xMax - head.xMin), glyphH / maxHeight);
    glyphSize = glyphScale * font.unitsPerEm;
    glyphBaseline = glyphMargin + glyphH * head.yMax / maxHeight;

    function hline(text, yunits) {
        ypx = glyphBaseline - yunits * glyphScale;
        ctx.fillStyle = '#788b94';
        ctx.font = 'bold 12px "Open Sans"';
        ctx.fillText(text.toUpperCase(), 2, ypx + 3);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(90, ypx, w, 1);
    }

    ctx.clearRect(0, 0, w, glyphBgCanvas.height);
    hline('Baseline', 0);
    hline('yMax', font.tables.head.yMax);
    hline('yMin', font.tables.head.yMin);
    hline('Ascender', font.tables.os2.sTypoAscender);
    hline('Descender', font.tables.os2.sTypoDescender);
}

function onReadFile(e) {
    var file = e.target.files[0];
    var reader = new FileReader();

    reader.onload = function (e) {
        try {
            font = opentype.parse(e.target.result);
            // fontFamily.innerHTML = font.familyName || this.files[0].name.replace(/\.[^/.]+$/, "");
            showErrorMessage('');
            onFontLoaded(font);
        } catch (err) {
            showErrorMessage(err.toString());
            throw (err);
        }
    };
    reader.onerror = function (err) {
        showErrorMessage(err.toString());
    };

    reader.readAsArrayBuffer(file);
}

function displayGlyphData(glyphIndex) {
    var container = document.getElementById('glyph-data');
    var holdtext = document.getElementById('copy-char');

    if (glyphIndex < 0) {
        container.innerHTML = '';
        return;
    }
    var glyph = font.glyphs.glyphs[glyphIndex],
        html;
    html = '<div><dt>name</dt><dd>' + glyph.name + '</dd></div>';

    if (glyph.unicodes.length > 0) {
        html += '<div><dt>unicode</dt><dd>' + glyph.unicodes.map(formatUnicode).join(', ') + '</dd></div>';
        holdtext.value = String.fromCharCode(parseInt(glyph.unicodes.map(formatUnicode)[0], 16));
    }

    html += '<div><dt>index</dt><dd>' + glyph.index + '</dd></div>';

    if (glyph.xMin !== 0 || glyph.xMax !== 0 || glyph.yMin !== 0 || glyph.yMax !== 0) {
        html += '<div><dt>xMin</dt><dd>' + glyph.xMin + '</dd></div>' +
            '<div><dt>xMax</dt><dd>' + glyph.xMax + '</dd></div>' +
            '<div><dt>yMin</dt><dd>' + glyph.yMin + '</dd></div>' +
            '<div><dt>yMax</dt><dd>' + glyph.yMax + '</dd></div>';
    }
    html += '<div><dt>advWidth</dt><dd>' + glyph.advanceWidth + '</dd></div>';
    if (glyph.leftSideBearing !== undefined) {
        html += '<div><dt>leftBearing</dt><dd>' + glyph.leftSideBearing + '</dd></div>';
    }
    container.innerHTML = html;
}

function displayFontBasic() {
    var container = document.getElementById('font-data');

    var html = '<div><dt>family</dt><dd>' + font.names.fontFamily.en + '</dd></div>';
    html += '<div><dt>style</dt><dd>' + font.names.fontSubfamily.en + '</dd></div>';
    html += '<div><dt>format</dt><dd>' + font.outlinesFormat + '</dd></div>';
    html += '<div><dt>version</dt><dd>' + font.names.version.en + '</dd></div>';

    container.innerHTML = html;
}


var resolveDisplayGlyph;

function displayGlyph(glyphIndex) {
    var canvas = document.getElementById('glyph'),
        ctx = canvas.getContext('2d');
    if (!resolveDisplayGlyph) {
        hidpi(canvas, canvas.width, canvas.height);
        resolveDisplayGlyph = true;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (glyphIndex < 0) return;

    var glyph = font.glyphs.glyphs[glyphIndex],
        glyphWidth = glyph.advanceWidth * glyphScale,
        xmin = (canvas.width / window.devicePixelRatio - glyphWidth) / 2,
        xmax = (canvas.width / window.devicePixelRatio + glyphWidth) / 2,
        x0 = xmin,
        markSize = 10;

    ctx.fillStyle = '#14bfff';
    ctx.fillRect(xmin - markSize + 1, glyphBaseline, markSize, 2);
    ctx.fillRect(xmin, glyphBaseline, 2, markSize);
    ctx.fillRect(xmax, glyphBaseline, markSize, 2);
    ctx.fillRect(xmax, glyphBaseline, 2, markSize);
    ctx.textAlign = 'center';
    ctx.fillText('0', xmin, glyphBaseline + markSize + 10);
    ctx.fillText(glyph.advanceWidth, xmax, glyphBaseline + markSize + 10);

    ctx.fillStyle = '#FFFFFF';
    var path = glyph.getPath(x0, glyphBaseline, glyphSize);
    path.fill = '#2a3340';
    path.stroke = '#677a95';
    path.strokeWidth = 1;
    drawPathWithArrows(ctx, path);
    drawPoints(glyph, ctx, x0, glyphBaseline, glyphSize);
}

function drawPoints(glyph, ctx, x, y, fontSize) {

    function drawCircles(l, x, y, scale) {
        var j, PI_SQ = Math.PI * 2;
        ctx.beginPath();
        for (j = 0; j < l.length; j += 1) {
            ctx.moveTo(x + (l[j].x * scale), y + (l[j].y * scale));
            ctx.arc(x + (l[j].x * scale), y + (l[j].y * scale), 2, 0, PI_SQ, false);
        }
        ctx.closePath();
        ctx.fill();
    }

    var scale, i, blueCircles, redCircles, path, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / font.unitsPerEm * fontSize;

    blueCircles = [];
    redCircles = [];
    path = glyph.path;
    for (i = 0; i < path.commands.length; i += 1) {
        cmd = path.commands[i];
        if (cmd.x !== undefined) {
            blueCircles.push({
                x: cmd.x,
                y: -cmd.y
            });
        }
        if (cmd.x1 !== undefined) {
            redCircles.push({
                x: cmd.x1,
                y: -cmd.y1
            });
        }
        if (cmd.x2 !== undefined) {
            redCircles.push({
                x: cmd.x2,
                y: -cmd.y2
            });
        }
    }

    ctx.fillStyle = '#9eacbf';
    drawCircles(blueCircles, x, y, scale);
    ctx.fillStyle = '#9eacbf';
    drawCircles(redCircles, x, y, scale);
}

function onFontLoaded(font) {
    window.font = font;

    var w = cellWidth - cellMarginLeftRight * 2,
        h = cellHeight - cellMarginTop - cellMarginBottom,
        head = font.tables.head,
        maxHeight = head.yMax - head.yMin;
    fontScale = Math.min(w / (head.xMax - head.xMin), h / maxHeight);
    fontSize = fontScale * font.unitsPerEm;
    fontBaseline = cellMarginTop + h * head.yMax / maxHeight;

    var pagination = document.getElementById("pagination");
    pagination.innerHTML = '';
    var fragment = document.createDocumentFragment();
    var numPages = Math.ceil(font.numGlyphs / cellCount);
    for (var i = 0; i < numPages; i++) {
        var link = document.createElement('div');
        var lastIndex = Math.min(font.numGlyphs - 1, (i + 1) * cellCount - 1);
        link.textContent = i * cellCount + ' → ' + lastIndex;
        link.id = 'p' + i;
        link.className = 'page';
        link.addEventListener('click', pageSelect, false);
        fragment.appendChild(link);
        // A white space allows to break very long lines into multiple lines.
        // This is needed for fonts with thousands of glyphs.
        fragment.appendChild(document.createTextNode(' '));
    }
    pagination.appendChild(fragment);

    displayFontBasic(font);
    initGlyphDisplay();
    displayGlyphPage(0);
    displayGlyph(-1);
    displayGlyphData(-1);
}

function pathCommandToString(cmd) {
    var str = '<strong>' + cmd.type + '</strong> ' +
        ((cmd.x !== undefined) ? 'x=' + cmd.x + ' y=' + cmd.y + ' ' : '') +
        ((cmd.x1 !== undefined) ? 'x1=' + cmd.x1 + ' y1=' + cmd.y1 + ' ' : '') +
        ((cmd.x2 !== undefined) ? 'x2=' + cmd.x2 + ' y2=' + cmd.y2 : '');
    return str;
}

function contourToString(contour) {
    return '<pre class="contour">' + contour.map(function (point) {
        return '<span class="' + (point.onCurve ? 'on' : 'off') + 'curve">x=' + point.x + ' y=' + point.y + '</span>';
    }).join('\n') + '</pre>';
}

function formatUnicode(unicode) {
    unicode = unicode.toString(16);
    if (unicode.length > 4) {
        return ("000000" + unicode.toUpperCase()).substr(-6)
    } else {
        return ("0000" + unicode.toUpperCase()).substr(-4)
    }
}

function pageSelect(event) {
    var selected = document.getElementsByClassName('page-selected');
    if (selected.length > 0) {
        selected[0].className = 'page';
    }

    displayGlyphPage(+event.target.id.substr(1));
}

function displayGlyphPage(pageNum) {
    pageSelected = pageNum;
    document.getElementById('p' + pageNum).className = 'page-selected page';
    var firstGlyph = pageNum * cellCount;
    for (var i = 0; i < cellCount; i++) {
        renderGlyphItem(document.getElementById('g' + i), firstGlyph + i);
    }
}

function prepareGlyphList() {
    var marker = document.getElementById('glyph-list-end'),
        parent = marker.parentElement;
    for (var i = 0; i < cellCount; i++) {
        var canvas = document.createElement('canvas');
        hidpi(canvas, cellWidth, cellHeight);
        canvas.className = 'item';
        canvas.id = 'g' + i;
        canvas.addEventListener('click', cellSelect, false);
        parent.insertBefore(canvas, marker);
    }
}

function hidpi(canvas, height, width) {
    canvas.width = height * window.devicePixelRatio;
    canvas.height = width * window.devicePixelRatio;
    canvas.style.width = height + 'px';
    canvas.style.height = width + 'px';
    canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
}

function showErrorMessage(message) {
    if (message) alert(message);
}
