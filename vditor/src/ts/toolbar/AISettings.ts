import { buildAIPromptsHTML, buildAIModelsHTML, nameFromUrl, SETTINGS_PANEL_CLASS } from "../ui/settingsPanel";
import { getEventName } from "../util/compatibility";
import { MenuItem } from "./MenuItem";
import { toggleSubMenu } from "./setToolbar";
import {
    getAIPrompts, setAIPrompts,
    getAIModels, setAIModels,
} from "../util/globalLocalStorageSettings";
import { showConfirm } from "../util/confirm";
import { telemetry, telemetryToolbarClickOnly } from "../util/telemetry";

export class AISettings extends MenuItem {
    public element: HTMLElement;
    private vditor: IVditor;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        this.vditor = vditor;

        const actionBtn = this.element.children[0] as HTMLElement;
        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = this.buildPanelHTML();
        this.element.appendChild(panelElement);

        actionBtn.addEventListener(getEventName(), (event: Event) => {
            const willOpen = panelElement.style.display !== "block";
            panelElement.innerHTML = this.buildPanelHTML();
            if (willOpen) {
                telemetryToolbarClickOnly(this.vditor, event, "ai-settings");
            }
        }, true);

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            // ── Prompts ──────────────────────────────────────────────
            if (event.target.closest("[data-ai-new-prompt]")) {
                delete panelElement.dataset.editingPromptId;
                clearInputs(panelElement, ["[data-ai-add-name]", "[data-ai-add-content]"]);
                toggleAddRow(panelElement, "[data-ai-add-row]", "[data-ai-new-prompt]", true);
                panelElement.querySelector<HTMLInputElement>("[data-ai-add-name]")?.focus();
                stop(event); return;
            }
            if (event.target.closest("[data-ai-cancel-prompt]")) {
                delete panelElement.dataset.editingPromptId;
                toggleAddRow(panelElement, "[data-ai-add-row]", "[data-ai-new-prompt]", false);
                clearInputs(panelElement, ["[data-ai-add-name]", "[data-ai-add-content]"]);
                stop(event); return;
            }
            if (event.target.closest("[data-ai-save-prompt]")) {
                const name = panelElement.querySelector<HTMLInputElement>("[data-ai-add-name]")?.value.trim();
                const content = panelElement.querySelector<HTMLTextAreaElement>("[data-ai-add-content]")?.value.trim();
                if (name && content) {
                    const editingId = panelElement.dataset.editingPromptId;
                    const prompts = getAIPrompts();
                    if (editingId) {
                        const idx = prompts.findIndex(p => p.id === editingId);
                        if (idx !== -1) prompts[idx] = { id: editingId, name, content };
                        delete panelElement.dataset.editingPromptId;
                    } else {
                        prompts.push({ id: Date.now().toString(), name, content });
                        telemetry(this.vditor, "markdown.ai.addPrompt", { source: "settings" });
                    }
                    setAIPrompts(prompts);
                    panelElement.querySelector("[data-ai-prompts]")!.outerHTML = buildAIPromptsHTML();
                }
                stop(event); return;
            }
            const editPromptBtn = event.target.closest("[data-edit-prompt]") as HTMLElement | null;
            if (editPromptBtn) {
                const id = editPromptBtn.getAttribute("data-edit-prompt")!;
                const p = getAIPrompts().find(p => p.id === id);
                if (!p) { stop(event); return; }
                panelElement.dataset.editingPromptId = id;
                const nameEl = panelElement.querySelector<HTMLInputElement>("[data-ai-add-name]");
                const contentEl = panelElement.querySelector<HTMLTextAreaElement>("[data-ai-add-content]");
                if (nameEl) nameEl.value = p.name;
                if (contentEl) contentEl.value = p.content;
                toggleAddRow(panelElement, "[data-ai-add-row]", "[data-ai-new-prompt]", true);
                nameEl?.focus();
                stop(event); return;
            }
            const delPromptBtn = event.target.closest("[data-del-prompt]") as HTMLElement | null;
            if (delPromptBtn) {
                const id = delPromptBtn.getAttribute("data-del-prompt")!;
                const name = getAIPrompts().find(p => p.id === id)?.name ?? "";
                stop(event);
                showConfirm(`Delete prompt "${name}"?`).then(ok => {
                    if (!ok) return;
                    setAIPrompts(getAIPrompts().filter(p => p.id !== id));
                    panelElement.querySelector("[data-ai-prompts]")!.outerHTML = buildAIPromptsHTML();
                });
                return;
            }

            // ── Models ───────────────────────────────────────────────
            if (event.target.closest("[data-ai-new-model]")) {
                delete panelElement.dataset.editingModelId;
                clearInputs(panelElement, ["[data-ai-add-model-name]", "[data-ai-add-model-url]", "[data-ai-add-model-key]", "[data-ai-add-model-model]"]);
                const formatEl = panelElement.querySelector<HTMLSelectElement>("[data-ai-add-model-format]");
                if (formatEl) formatEl.value = "auto";
                toggleAddRow(panelElement, "[data-ai-add-model-row]", "[data-ai-new-model]", true);
                panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-url]")?.focus();
                stop(event); return;
            }
            if (event.target.closest("[data-ai-cancel-model]")) {
                delete panelElement.dataset.editingModelId;
                toggleAddRow(panelElement, "[data-ai-add-model-row]", "[data-ai-new-model]", false);
                clearInputs(panelElement, ["[data-ai-add-model-name]", "[data-ai-add-model-url]", "[data-ai-add-model-key]", "[data-ai-add-model-model]"]);
                stop(event); return;
            }
            if (event.target.closest("[data-ai-save-model]")) {
                const name = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-name]")?.value.trim();
                const url = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-url]")?.value.trim();
                const key = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-key]")?.value.trim() || "";
                const model = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-model]")?.value.trim() || "";
                const format = panelElement.querySelector<HTMLSelectElement>("[data-ai-add-model-format]")?.value || "auto";
                if (url) {
                    const effectiveName = name || nameFromUrl(url);
                    const editingId = panelElement.dataset.editingModelId;
                    const models = getAIModels();
                    if (editingId) {
                        const idx = models.findIndex(m => m.id === editingId);
                        if (idx !== -1) models[idx] = { id: editingId, name, url, key, model, format };
                        delete panelElement.dataset.editingModelId;
                    } else {
                        models.push({ id: Date.now().toString(), name, url, key, model, format });
                        telemetry(this.vditor, "markdown.ai.addModel", { source: "settings" });
                    }
                    setAIModels(models);
                    panelElement.querySelector("[data-ai-models]")!.outerHTML = buildAIModelsHTML();
                }
                stop(event); return;
            }
            const editModelBtn = event.target.closest("[data-edit-model]") as HTMLElement | null;
            if (editModelBtn) {
                const id = editModelBtn.getAttribute("data-edit-model")!;
                const m = getAIModels().find(m => m.id === id);
                if (!m) { stop(event); return; }
                panelElement.dataset.editingModelId = id;
                const nameEl = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-name]");
                const urlEl = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-url]");
                const keyEl = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-key]");
                const modelEl = panelElement.querySelector<HTMLInputElement>("[data-ai-add-model-model]");
                const formatEl = panelElement.querySelector<HTMLSelectElement>("[data-ai-add-model-format]");
                if (nameEl) nameEl.value = m.name;
                if (urlEl) urlEl.value = m.url;
                if (keyEl) keyEl.value = m.key || "";
                if (modelEl) modelEl.value = m.model || "";
                if (formatEl) formatEl.value = m.format || "auto";
                toggleAddRow(panelElement, "[data-ai-add-model-row]", "[data-ai-new-model]", true);
                urlEl?.focus();
                stop(event); return;
            }
            const delModelBtn = event.target.closest("[data-del-model]") as HTMLElement | null;
            if (delModelBtn) {
                const id = delModelBtn.getAttribute("data-del-model")!;
                const name = getAIModels().find(m => m.id === id)?.name ?? "";
                stop(event);
                showConfirm(`Delete model "${name}"?`).then(ok => {
                    if (!ok) return;
                    setAIModels(getAIModels().filter(m => m.id !== id));
                    panelElement.querySelector("[data-ai-models]")!.outerHTML = buildAIModelsHTML();
                });
                return;
            }
        });

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
    }

    private buildPanelHTML() {
        const i18n = window.VditorI18n;
        return `<div class="${SETTINGS_PANEL_CLASS}">
            <div class="${SETTINGS_PANEL_CLASS}__ai-hint">
                <span class="codicon codicon-info"></span>
                <span>${i18n.aiHint ?? 'Right-click to use <b>AI Polish</b>'}</span>
            </div>
            <div class="${SETTINGS_PANEL_CLASS}__section">
                <div class="${SETTINGS_PANEL_CLASS}__title">${i18n.aiPrompts}</div>
                ${buildAIPromptsHTML()}
            </div>
            <div class="${SETTINGS_PANEL_CLASS}__section">
                <div class="${SETTINGS_PANEL_CLASS}__title">${i18n.aiCustomModels}</div>
                ${buildAIModelsHTML()}
            </div>
        </div>`;
    }
}

function toggleAddRow(panel: HTMLElement, rowSel: string, btnSel: string, show: boolean) {
    const row = panel.querySelector<HTMLElement>(rowSel);
    const btn = panel.querySelector<HTMLElement>(btnSel);
    if (row) row.style.display = show ? "" : "none";
    if (btn) btn.style.display = show ? "none" : "";
}

function clearInputs(panel: HTMLElement, selectors: string[]) {
    selectors.forEach(sel => {
        const el = panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
        if (el) el.value = "";
    });
}

function stop(event: Event) {
    event.preventDefault();
    event.stopPropagation();
}
