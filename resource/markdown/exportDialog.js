const STORAGE_KEY = 'vscode-office.exportPrefs'

const DEFAULT_PREFS = {
    type: 'pdf',
    withOutline: true,
    printBackground: true,
    pageFormat: 'A4',
}

const isWebExport = () => document.body.classList.contains('is-web')

const loadPrefs = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            return { ...DEFAULT_PREFS, ...parsed }
        }
        const legacyRaw = localStorage.getItem('vscode-office.pdfExportPrefs')
        if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw)
            return {
                ...DEFAULT_PREFS,
                withOutline: legacy.withOutline ?? DEFAULT_PREFS.withOutline,
                printBackground: legacy.printBackground ?? DEFAULT_PREFS.printBackground,
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

const setToggle = (input, on) => {
    input.checked = on
    input.closest('.vditor-pdf-export-toggle')?.setAttribute('aria-checked', on ? 'true' : 'false')
}

const readToggle = (input) => input.checked

const syncPdfSection = (overlay, type) => {
    const section = overlay.querySelector('[data-export-section="pdf"]')
    if (section) section.hidden = type !== 'pdf'
}

const applyWebFormatOptions = (typeSelect) => {
    if (!isWebExport() || !typeSelect) return
    for (const option of typeSelect.options) {
        if (option.value === 'pdf' || option.value === 'docx') {
            option.disabled = true
            option.hidden = true
        }
    }
    if (typeSelect.value === 'pdf' || typeSelect.value === 'docx') {
        typeSelect.value = 'html'
    }
}

/**
 * @returns {Promise<{ type: string, withoutOutline?: boolean, printBackground?: boolean, format?: string } | null>}
 */
export const openExportDialog = () => {
    const overlay = document.getElementById('export-dialog')
    if (!overlay) return Promise.resolve(null)

    const prefs = loadPrefs()
    const typeSelect = overlay.querySelector('[data-export-option="type"]')
    const outlineInput = overlay.querySelector('[data-export-option="outline"]')
    const backgroundInput = overlay.querySelector('[data-export-option="background"]')
    const pageFormatSelect = overlay.querySelector('[data-export-option="pageFormat"]')
    const cancelBtn = overlay.querySelector('[data-export-action="cancel"]')
    const exportBtn = overlay.querySelector('[data-export-action="export"]')

    applyWebFormatOptions(typeSelect)
    if (typeSelect) typeSelect.value = isWebExport() && (prefs.type === 'pdf' || prefs.type === 'docx') ? 'html' : prefs.type
    setToggle(outlineInput, prefs.withOutline)
    setToggle(backgroundInput, prefs.printBackground)
    if (pageFormatSelect) pageFormatSelect.value = prefs.pageFormat
    syncPdfSection(overlay, typeSelect?.value || 'pdf')

    return new Promise(resolve => {
        let settled = false
        const finish = (result) => {
            if (settled) return
            settled = true
            overlay.hidden = true
            document.removeEventListener('keydown', onKeydown)
            overlay.removeEventListener('click', onOverlayClick)
            typeSelect?.removeEventListener('change', onTypeChange)
            cancelBtn?.removeEventListener('click', onCancel)
            exportBtn?.removeEventListener('click', onExport)
            for (const input of overlay.querySelectorAll('.vditor-pdf-export-toggle input')) {
                input.removeEventListener('change', onToggleChange)
            }
            resolve(result)
        }

        const onCancel = () => finish(null)

        const onTypeChange = () => {
            syncPdfSection(overlay, typeSelect?.value || 'pdf')
        }

        const onExport = () => {
            const type = typeSelect?.value || DEFAULT_PREFS.type
            const next = {
                type,
                withOutline: readToggle(outlineInput),
                printBackground: readToggle(backgroundInput),
                pageFormat: pageFormatSelect?.value || DEFAULT_PREFS.pageFormat,
            }
            savePrefs(next)
            if (type === 'pdf') {
                finish({
                    type: 'pdf',
                    withoutOutline: !next.withOutline,
                    printBackground: next.printBackground,
                    format: next.pageFormat,
                })
                return
            }
            finish({ type })
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

        typeSelect?.addEventListener('change', onTypeChange)
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
