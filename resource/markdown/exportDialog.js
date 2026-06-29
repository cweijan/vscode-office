const STORAGE_KEY = 'vscode-office.exportPrefs'

const DEFAULT_PREFS = {
    type: 'pdf',
    withOutline: true,
    useTheme: true,
    pageFormat: 'A4',
    fontFamily: 'inherit',
    fontSize: 13,
}

const FONT_FAMILY_OPTIONS = [
    { label: 'Default', value: 'inherit' },
    { label: 'Humanist', value: "Optima, Candara, 'Gill Sans', sans-serif" },
    { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
    { label: 'Old Style', value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
    { label: 'Garamond', value: "Garamond, 'EB Garamond', 'Cormorant Garamond', serif" },
    { label: 'Charter', value: "Charter, 'Bitstream Charter', 'Sitka Text', serif" },
    { label: 'Slab Serif', value: 'Rockwell, Georgia, serif' },
    { label: 'Narrow', value: "'Arial Narrow', 'Liberation Sans Narrow', sans-serif" },
]

const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24]

const isWebExport = () => document.body.classList.contains('is-web')
const isProUser = () => document.body.classList.contains('is-pro')

const loadPrefs = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed.printBackground != null && parsed.useTheme == null) {
                parsed.useTheme = parsed.printBackground
            }
            return { ...DEFAULT_PREFS, ...parsed }
        }
        const legacyRaw = localStorage.getItem('vscode-office.pdfExportPrefs')
        if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw)
            return {
                ...DEFAULT_PREFS,
                withOutline: legacy.withOutline ?? DEFAULT_PREFS.withOutline,
                useTheme: legacy.printBackground ?? DEFAULT_PREFS.useTheme,
                pageFormat: legacy.format ?? DEFAULT_PREFS.pageFormat,
            }
        }
        return { ...DEFAULT_PREFS }
    } catch {
        return { ...DEFAULT_PREFS }
    }
}

const savePrefs = (prefs) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
        // ignore quota errors
    }
}

const parseFontSize = (value) => {
    if (value == null || value === '') return DEFAULT_PREFS.fontSize
    const parsed = parseInt(String(value).replace(/px$/i, ''), 10)
    return Number.isFinite(parsed) ? parsed : DEFAULT_PREFS.fontSize
}

const resolveEditorDefaults = (editor) => {
    const layout = editor?.exportExportSettings?.()?.layout
    return {
        fontFamily: layout?.fontFamily && layout.fontFamily !== 'inherit' ? layout.fontFamily : DEFAULT_PREFS.fontFamily,
        fontSize: parseFontSize(layout?.fontSize),
    }
}

const setToggle = (input, on) => {
    if (!input) return
    input.checked = on
    input.closest('.vditor-pdf-export-toggle')?.setAttribute('aria-checked', on ? 'true' : 'false')
}

const readToggle = (input) => !!input?.checked

const readFormat = (overlay) => {
    const checked = overlay.querySelector('[data-export-option="type"]:checked')
    return checked?.value || DEFAULT_PREFS.type
}

const setFormat = (overlay, type) => {
    for (const input of overlay.querySelectorAll('[data-export-option="type"]')) {
        input.checked = input.value === type
    }
}

const syncSections = (overlay, type) => {
    const pdfSection = overlay.querySelector('[data-export-section="pdf"]')
    const pageSizeRow = overlay.querySelector('[data-export-section="pdf-page-size"]')
    if (pdfSection) pdfSection.hidden = type !== 'pdf'
    if (pageSizeRow) pageSizeRow.hidden = type !== 'pdf'
}

const populateFontSelect = (select) => {
    if (!select || select.options.length) return
    for (const option of FONT_FAMILY_OPTIONS) {
        const el = document.createElement('option')
        el.value = option.value
        el.textContent = option.label
        select.appendChild(el)
    }
}

const populateFontSizeSelect = (select) => {
    if (!select || select.options.length) return
    for (const size of FONT_SIZE_OPTIONS) {
        const el = document.createElement('option')
        el.value = String(size)
        el.textContent = `${size}px`
        select.appendChild(el)
    }
}

const applyWebFormatOptions = (overlay) => {
    if (!isWebExport()) return
    for (const input of overlay.querySelectorAll('[data-export-option="type"]')) {
        if (input.value === 'pdf' || input.value === 'docx') {
            input.disabled = true
            input.closest('.vditor-export-format-option')?.classList.add('vditor-export-format-option--hidden')
        }
    }
    if (readFormat(overlay) === 'pdf' || readFormat(overlay) === 'docx') {
        setFormat(overlay, 'html')
    }
}

const resolveInitialFormat = (prefs, presetFormat) => {
    if (presetFormat) {
        if (isWebExport() && (presetFormat === 'pdf' || presetFormat === 'docx')) {
            return 'html'
        }
        return presetFormat
    }
    if (isWebExport()) {
        if (prefs.type === 'pdf' || prefs.type === 'docx') {
            return 'html'
        }
        return prefs.type || 'html'
    }
    return prefs.type || DEFAULT_PREFS.type
}

const applyProLock = (overlay) => {
    const proBody = overlay.querySelector('[data-export-pro-body]')
    if (!proBody) return
    const locked = !isProUser()
    proBody.classList.toggle('vditor-export-pro--locked', locked)
    for (const control of proBody.querySelectorAll('select, input')) {
        control.disabled = locked
    }
}

export const refreshExportDialogProState = () => {
    const overlay = document.getElementById('export-dialog')
    if (!overlay || overlay.hidden) return
    applyProLock(overlay)
}

const matchFontFamilyValue = (value) => {
    if (!value || value === 'inherit') return 'inherit'
    for (const option of FONT_FAMILY_OPTIONS) {
        if (option.value === value) return option.value
    }
    return FONT_FAMILY_OPTIONS[0].value
}

/**
 * @param {object | null | undefined} editor
 * @param {{ initialFormat?: string }} [options]
 * @returns {Promise<{ type: string, withoutOutline?: boolean, printBackground?: boolean, format?: string, proSettings?: object } | null>}
 */
export const openExportDialog = (editor, options = {}) => {
    const overlay = document.getElementById('export-dialog')
    if (!overlay) return Promise.resolve(null)

    const prefs = loadPrefs()
    const editorDefaults = resolveEditorDefaults(editor)
    const outlineInput = overlay.querySelector('[data-export-option="outline"]')
    const themeInput = overlay.querySelector('[data-export-option="useTheme"]')
    const pageFormatSelect = overlay.querySelector('[data-export-option="pageFormat"]')
    const fontFamilySelect = overlay.querySelector('[data-export-option="fontFamily"]')
    const fontSizeSelect = overlay.querySelector('[data-export-option="fontSize"]')
    const cancelBtn = overlay.querySelector('[data-export-action="cancel"]')
    const exportBtn = overlay.querySelector('[data-export-action="export"]')
    const proBody = overlay.querySelector('[data-export-pro-body]')

    populateFontSelect(fontFamilySelect)
    populateFontSizeSelect(fontSizeSelect)
    applyWebFormatOptions(overlay)

    const initialType = resolveInitialFormat(prefs, options.initialFormat)
    setFormat(overlay, initialType)
    setToggle(outlineInput, prefs.withOutline)
    setToggle(themeInput, isProUser() ? prefs.useTheme : false)
    if (pageFormatSelect) pageFormatSelect.value = prefs.pageFormat
    if (fontFamilySelect) {
        fontFamilySelect.value = matchFontFamilyValue(prefs.fontFamily || editorDefaults.fontFamily)
    }
    if (fontSizeSelect) {
        const size = prefs.fontSize || editorDefaults.fontSize
        fontSizeSelect.value = String(size)
        if (!fontSizeSelect.value) fontSizeSelect.value = String(DEFAULT_PREFS.fontSize)
    }
    syncSections(overlay, initialType)
    applyProLock(overlay)

    return new Promise(resolve => {
        let settled = false
        const finish = (result) => {
            if (settled) return
            settled = true
            overlay.hidden = true
            document.removeEventListener('keydown', onKeydown)
            overlay.removeEventListener('click', onOverlayClick)
            proBody?.removeEventListener('click', onProBodyClick)
            for (const input of overlay.querySelectorAll('[data-export-option="type"]')) {
                input.removeEventListener('change', onTypeChange)
            }
            cancelBtn?.removeEventListener('click', onCancel)
            exportBtn?.removeEventListener('click', onExport)
            for (const input of overlay.querySelectorAll('.vditor-pdf-export-toggle input')) {
                input.removeEventListener('change', onToggleChange)
            }
            resolve(result)
        }

        const onCancel = () => finish(null)

        const onTypeChange = () => {
            syncSections(overlay, readFormat(overlay))
        }

        const onProBodyClick = (e) => {
            if (isProUser()) return
            if (e.target.closest('[data-export-action]')) return
            e.preventDefault()
            handler.emit('openProPanel')
        }

        const readProSettings = () => {
            if (!isProUser()) return null
            return {
                fontFamily: fontFamilySelect?.value || DEFAULT_PREFS.fontFamily,
                fontSize: parseFontSize(fontSizeSelect?.value),
            }
        }

        const onExport = () => {
            const type = readFormat(overlay)
            const next = {
                type,
                withOutline: readToggle(outlineInput),
                useTheme: readToggle(themeInput),
                pageFormat: pageFormatSelect?.value || DEFAULT_PREFS.pageFormat,
                fontFamily: fontFamilySelect?.value || DEFAULT_PREFS.fontFamily,
                fontSize: parseFontSize(fontSizeSelect?.value),
            }
            savePrefs(next)

            const payload = { type }
            const pro = isProUser()
            payload.useProExport = pro
            if (pro) {
                const proSettings = readProSettings()
                if (proSettings) {
                    payload.proSettings = proSettings
                }
                payload.printBackground = next.useTheme
            } else {
                payload.printBackground = true
            }

            if (type === 'pdf') {
                payload.withoutOutline = !next.withOutline
                if (isProUser()) {
                    payload.format = next.pageFormat
                }
            }
            finish(payload)
        }

        const onKeydown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onCancel()
            } else if (e.key === 'Enter' && !e.isComposing && e.target?.tagName !== 'SELECT') {
                e.preventDefault()
                onExport()
            }
        }

        const onOverlayClick = (e) => {
            if (e.target === overlay) onCancel()
        }

        const onToggleChange = (e) => {
            const input = e.target
            input.closest('.vditor-pdf-export-toggle')?.setAttribute('aria-checked', input.checked ? 'true' : 'false')
        }

        for (const input of overlay.querySelectorAll('[data-export-option="type"]')) {
            input.addEventListener('change', onTypeChange)
        }
        proBody?.addEventListener('click', onProBodyClick)
        cancelBtn?.addEventListener('click', onCancel)
        exportBtn?.addEventListener('click', onExport)
        for (const input of overlay.querySelectorAll('.vditor-pdf-export-toggle input')) {
            input.addEventListener('change', onToggleChange)
        }
        document.addEventListener('keydown', onKeydown)
        overlay.addEventListener('click', onOverlayClick)

        overlay.hidden = false
        exportBtn?.focus()
    })
}
