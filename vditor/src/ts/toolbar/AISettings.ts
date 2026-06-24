import { buildAIPromptsHTML, SETTINGS_PANEL_CLASS } from "../ui/settingsPanel";
import { getEventName } from "../util/compatibility";
import { MenuItem } from "./MenuItem";
import { toggleSubMenu } from "./setToolbar";
import {
    getAIPrompts,
    setAIPrompts,
} from "../util/globalLocalStorageSettings";

export class AISettings extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = this.buildPanelHTML();
        this.element.appendChild(panelElement);

        actionBtn.addEventListener(getEventName(), () => {
            // Refresh prompts list each time panel opens
            panelElement.innerHTML = this.buildPanelHTML();
        }, true);

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            // Add prompt
            if (event.target.closest("[data-ai-new-prompt]")) {
                const addRow = panelElement.querySelector("[data-ai-add-row]") as HTMLElement | null;
                const addBtn = panelElement.querySelector("[data-ai-new-prompt]") as HTMLElement | null;
                if (addRow) addRow.style.display = "";
                if (addBtn) addBtn.style.display = "none";
                panelElement.querySelector<HTMLInputElement>("[data-ai-add-name]")?.focus();
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Cancel add
            if (event.target.closest("[data-ai-cancel-prompt]")) {
                const addRow = panelElement.querySelector("[data-ai-add-row]") as HTMLElement | null;
                const addBtn = panelElement.querySelector("[data-ai-new-prompt]") as HTMLElement | null;
                if (addRow) addRow.style.display = "none";
                if (addBtn) addBtn.style.display = "";
                const nameInput = panelElement.querySelector<HTMLInputElement>("[data-ai-add-name]");
                const contentInput = panelElement.querySelector<HTMLTextAreaElement>("[data-ai-add-content]");
                if (nameInput) nameInput.value = "";
                if (contentInput) contentInput.value = "";
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Save prompt
            if (event.target.closest("[data-ai-save-prompt]")) {
                const nameInput = panelElement.querySelector<HTMLInputElement>("[data-ai-add-name]");
                const contentInput = panelElement.querySelector<HTMLTextAreaElement>("[data-ai-add-content]");
                const name = nameInput?.value.trim();
                const content = contentInput?.value.trim();
                if (name && content) {
                    const prompts = getAIPrompts();
                    prompts.push({ id: Date.now().toString(), name, content });
                    setAIPrompts(prompts);
                    const container = panelElement.querySelector("[data-ai-prompts]");
                    if (container) container.outerHTML = buildAIPromptsHTML();
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Delete prompt
            const delBtn = event.target.closest("[data-del-prompt]") as HTMLElement | null;
            if (delBtn) {
                const id = delBtn.getAttribute("data-del-prompt") || "";
                setAIPrompts(getAIPrompts().filter(p => p.id !== id));
                const container = panelElement.querySelector("[data-ai-prompts]");
                if (container) container.outerHTML = buildAIPromptsHTML();
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        });

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
    }

    private buildPanelHTML() {
        const i18n = window.VditorI18n;
        return `<div class="${SETTINGS_PANEL_CLASS}">
            <div class="${SETTINGS_PANEL_CLASS}__section">
                <div class="${SETTINGS_PANEL_CLASS}__title">${i18n.aiPrompts}</div>
                ${buildAIPromptsHTML()}
            </div>
        </div>`;
    }
}
