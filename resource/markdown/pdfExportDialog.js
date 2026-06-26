const STORAGE_KEY = 'vscode-office.pdfExportPrefs'

const DEFAULT_PREFS = {
    withOutline: true,
    printBackground: true,
    format: 'A4',
}

const loadPrefs = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...DEFAULT_PREFS }
        const parsed = JSON.parse(raw)
        return { ...DEFAULT_PREFS, ...parsed }
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

/**
 * @returns {Promise<{ withOutline: boolean, printBackground: boolean, format: string } | null>}
 */
export const openPdfExportDialog = () => {
    const overlay = document.getElementById('pdf-export-dialog')
    if (!overlay) return Promise.resolve(null)

    const prefs = loadPrefs()
    const outlineInput = overlay.querySelector('[data-pdf-option="outline"]')
    const backgroundInput = overlay.querySelector('[data-pdf-option="background"]')
    const formatSelect = overlay.querySelector('[data-pdf-option="format"]')
    const cancelBtn = overlay.querySelector('[data-pdf-action="cancel"]')
    const exportBtn = overlay.querySelector('[data-pdf-action="export"]')

    setToggle(outlineInput, prefs.withOutline)
    setToggle(backgroundInput, prefs.printBackground)
    if (formatSelect) formatSelect.value = prefs.format

    return new Promise(resolve => {
        let settled = false
        const finish = (result) => {
            if (settled) return
            settled = true
            overlay.hidden = true
            document.removeEventListener('keydown', onKeydown)
            overlay.removeEventListener('click', onOverlayClick)
            cancelBtn?.removeEventListener('click', onCancel)
            exportBtn?.removeEventListener('click', onExport)
            for (const input of overlay.querySelectorAll('.vditor-pdf-export-toggle input')) {
                input.removeEventListener('change', onToggleChange)
            }
            resolve(result)
        }

        const onCancel = () => finish(null)

        const onExport = () => {
            const next = {
                withOutline: readToggle(outlineInput),
                printBackground: readToggle(backgroundInput),
                format: formatSelect?.value || DEFAULT_PREFS.format,
            }
            savePrefs(next)
            finish({
                withoutOutline: !next.withOutline,
                printBackground: next.printBackground,
                format: next.format,
            })
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