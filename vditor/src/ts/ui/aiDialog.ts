import {
    AI_ENGINE_KEY, AI_SELECTED_MODEL_KEY, AI_SELECTED_PROMPT_KEY,
    getAIPrompts, setAIPrompts,
    getAIModels, setAIModels,
    AIPrompt, AIModel,
} from "../util/globalLocalStorageSettings";
import { AI_FORMAT_OPTIONS, nameFromUrl, getProviderIcon } from "./settingsPanel";
import { accessLocalStorage } from "../util/compatibility";
import { telemetry } from "../util/telemetry";

const ls = {
    get: (key: string) => accessLocalStorage() ? (localStorage.getItem(key) ?? "") : "",
    set: (key: string, val: string) => { if (accessLocalStorage()) localStorage.setItem(key, val); },
};

const buildHTML = (): string => {
    const i = window.VditorI18n;
    return `<div class="vditor-ai-dialog-overlay" hidden>
  <div class="vditor-ai-dialog" role="dialog" aria-modal="true">

    <!-- Page: main -->
    <div class="vditor-ai-dialog__page vditor-ai-dialog__page--active" data-page="main">
      <div class="vditor-ai-dialog__header">
        <span class="codicon codicon-sparkle vditor-ai-dialog__icon"></span>
        <h2 class="vditor-ai-dialog__title">${i.aiPolish}</h2>
        <button class="vditor-ai-dialog__close" type="button" data-ai-close title="${i.aiCancel}">
          <span class="codicon codicon-close"></span>
        </button>
      </div>
      <div class="vditor-ai-dialog__body">
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label" for="vditor-ai-goal">${i.aiUpdateGoal}</label>
          <textarea class="vditor-ai-dialog__textarea" id="vditor-ai-goal" rows="2"
            placeholder="${i.aiUpdateGoalPlaceholder}"></textarea>
        </div>
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiPromptLabel}</label>
          <div class="vditor-ai-dialog__row">
            <div class="vditor-ai-dialog__picker" data-picker="prompt">
              <button type="button" class="vditor-ai-dialog__picker-trigger">
                <span class="vditor-ai-dialog__picker-label">${i.aiPromptNone}</span>
                <span class="codicon codicon-chevron-down vditor-ai-dialog__picker-chevron"></span>
              </button>
              <div class="vditor-ai-dialog__picker-list" hidden></div>
            </div>
            <button type="button" class="vditor-ai-dialog__add-btn" data-goto="add-prompt" title="${i.aiAddPrompt}">
              <span class="codicon codicon-add"></span>
            </button>
          </div>
        </div>
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiEngine}</label>
          <div class="vditor-ai-dialog__engine-tabs">
            <button type="button" class="vditor-ai-dialog__engine-tab" data-engine="vscode">
              <span class="codicon codicon-copilot"></span>${i.aiVscodeApi}
            </button>
            <button type="button" class="vditor-ai-dialog__engine-tab" data-engine="custom">
              <span class="codicon codicon-server"></span>${i.aiCustom}
            </button>
          </div>
          <div class="vditor-ai-dialog__vscode-fields" hidden>
            <div class="vditor-ai-dialog__picker" data-picker="vscode-model">
              <button type="button" class="vditor-ai-dialog__picker-trigger">
                <span class="vditor-ai-dialog__picker-label">${i.aiVscodeModelAuto ?? "Auto"}</span>
                <span class="codicon codicon-chevron-down vditor-ai-dialog__picker-chevron"></span>
              </button>
              <div class="vditor-ai-dialog__picker-list" hidden></div>
            </div>
          </div>
          <div class="vditor-ai-dialog__custom-fields" hidden>
            <div class="vditor-ai-dialog__row">
              <div class="vditor-ai-dialog__picker" data-picker="model">
                <button type="button" class="vditor-ai-dialog__picker-trigger">
                  <span class="vditor-ai-dialog__picker-trigger-inner">
                    <span class="vditor-ai-dialog__picker-label">${i.aiNoModelSelected}</span>
                  </span>
                  <span class="codicon codicon-chevron-down vditor-ai-dialog__picker-chevron"></span>
                </button>
                <div class="vditor-ai-dialog__picker-list" hidden></div>
              </div>
              <button type="button" class="vditor-ai-dialog__add-btn" data-goto="add-model" title="${i.aiAddModel}">
                <span class="codicon codicon-add"></span>
              </button>
            </div>
            <div class="vditor-ai-dialog__field" id="vditor-ai-model-name-field" hidden>
              <label class="vditor-ai-dialog__label">${i.aiModel}</label>
              <div class="vditor-ai-dialog__picker" data-picker="model-name">
                <button type="button" class="vditor-ai-dialog__picker-trigger">
                  <span class="vditor-ai-dialog__picker-label">-</span>
                  <span class="codicon codicon-chevron-down vditor-ai-dialog__picker-chevron"></span>
                </button>
                <div class="vditor-ai-dialog__picker-list" hidden></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="vditor-ai-dialog__footer">
        <button class="vditor-ai-dialog__btn vditor-ai-dialog__btn--cancel" type="button" data-ai-cancel>
          ${i.aiCancel}
        </button>
        <button class="vditor-ai-dialog__btn vditor-ai-dialog__btn--submit" type="button" data-ai-submit>
          <span class="codicon codicon-sparkle"></span>${i.aiPolishBtn}
        </button>
      </div>
    </div>

    <!-- Page: add prompt -->
    <div class="vditor-ai-dialog__page" data-page="add-prompt">
      <div class="vditor-ai-dialog__header">
        <button class="vditor-ai-dialog__back" type="button" data-goto="main">
          <span class="codicon codicon-arrow-left"></span>
        </button>
        <h2 class="vditor-ai-dialog__title">${i.aiAddPrompt}</h2>
      </div>
      <div class="vditor-ai-dialog__body">
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiPromptName}</label>
          <input type="text" class="vditor-ai-dialog__input" id="vditor-ai-new-prompt-name" placeholder="${i.aiPromptName}" />
        </div>
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiPromptContent}</label>
          <textarea class="vditor-ai-dialog__textarea" id="vditor-ai-new-prompt-content" rows="4"
            placeholder="${i.aiPromptContent}"></textarea>
        </div>
      </div>
      <div class="vditor-ai-dialog__footer">
        <button class="vditor-ai-dialog__btn vditor-ai-dialog__btn--cancel" type="button" data-goto="main">
          ${i.aiCancel}
        </button>
        <button class="vditor-ai-dialog__btn vditor-ai-dialog__btn--submit" type="button" data-save="prompt">
          ${i.aiSave}
        </button>
      </div>
    </div>

    <!-- Page: add model -->
    <div class="vditor-ai-dialog__page" data-page="add-model">
      <div class="vditor-ai-dialog__header">
        <button class="vditor-ai-dialog__back" type="button" data-goto="main">
          <span class="codicon codicon-arrow-left"></span>
        </button>
        <h2 class="vditor-ai-dialog__title">${i.aiAddModel}</h2>
      </div>
      <div class="vditor-ai-dialog__body">
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiModelName}</label>
          <input type="text" class="vditor-ai-dialog__input" id="vditor-ai-new-model-name" placeholder="${i.aiModelName} (optional)" />
        </div>
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiApiUrl}</label>
          <input type="url" class="vditor-ai-dialog__input" id="vditor-ai-new-model-url" placeholder="${i.aiApiUrl}" />
        </div>
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiApiKey}</label>
          <input type="password" class="vditor-ai-dialog__input" id="vditor-ai-new-model-key" placeholder="${i.aiApiKey}" />
        </div>
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiModel}</label>
          <input type="text" class="vditor-ai-dialog__input" id="vditor-ai-new-model-model" placeholder="${i.aiModel}" />
        </div>
        <div class="vditor-ai-dialog__field">
          <label class="vditor-ai-dialog__label">${i.aiApiFormat}</label>
          <div class="vditor-ai-dialog__picker" data-picker="format">
            <button type="button" class="vditor-ai-dialog__picker-trigger">
              <span class="vditor-ai-dialog__picker-label">${i[AI_FORMAT_OPTIONS[0].i18nKey]}</span>
              <span class="codicon codicon-chevron-down vditor-ai-dialog__picker-chevron"></span>
            </button>
            <div class="vditor-ai-dialog__picker-list" hidden></div>
          </div>
        </div>
      </div>
      <div class="vditor-ai-dialog__footer">
        <button class="vditor-ai-dialog__btn vditor-ai-dialog__btn--cancel" type="button" data-goto="main">
          ${i.aiCancel}
        </button>
        <button class="vditor-ai-dialog__btn vditor-ai-dialog__btn--submit" type="button" data-save="model">
          ${i.aiSave}
        </button>
      </div>
    </div>

  </div>
</div>`;
};

interface PickerState {
    trigger: HTMLElement;
    label: HTMLElement;
    list: HTMLElement;
    optionsEl: HTMLElement;
    value: string;
}

export class AIDialog {
    private vditor: IVditor;
    private overlay: HTMLElement;
    private goalEl: HTMLTextAreaElement;
    private customFields: HTMLElement;
    private engineTabs: NodeListOf<HTMLElement>;
    private currentEngine: string;
    private pickers: Map<string, PickerState> = new Map();
    private promptValue: string = "";
    private modelValue: string = "";
    private selectedModelName: string = "";
    private formatValue: string = "auto";
    private modelNameField: HTMLElement;
    private capturedMarkdown = "";
    private capturedIsSelection = false;
    private onSubmit: (markdown: string, isSelection: boolean, options: IAIPolishOptions) => void;
    private onClose: (reason: "cancel" | "submit") => void;
    private activePickerName: string | null = null;
    private copilotAvailable = false;
    private vscodeFields: HTMLElement;
    private vscodeModels: Array<{ id: string; name: string; family: string; vendor: string }> = [];
    private vscodeModelValue: string = "";

    constructor(
        vditor: IVditor,
        onSubmit: (markdown: string, isSelection: boolean, options: IAIPolishOptions) => void,
        onClose: (reason: "cancel" | "submit") => void,
    ) {
        this.vditor = vditor;
        this.onSubmit = onSubmit;
        this.onClose = onClose;

        vditor.element.insertAdjacentHTML("beforeend", buildHTML());
        this.overlay = vditor.element.lastElementChild as HTMLElement;

        this.goalEl = this.overlay.querySelector<HTMLTextAreaElement>("#vditor-ai-goal")!;
        this.customFields = this.overlay.querySelector<HTMLElement>(".vditor-ai-dialog__custom-fields")!;
        this.vscodeFields = this.overlay.querySelector<HTMLElement>(".vditor-ai-dialog__vscode-fields")!;
        this.modelNameField = this.overlay.querySelector<HTMLElement>("#vditor-ai-model-name-field")!;
        this.engineTabs = this.overlay.querySelectorAll<HTMLElement>(".vditor-ai-dialog__engine-tab[data-engine]");
        this.currentEngine = ls.get(AI_ENGINE_KEY) || "vscode";

        // Register pickers and move their lists to body as fixed popovers
        this.overlay.querySelectorAll<HTMLElement>(".vditor-ai-dialog__picker").forEach(pickerEl => {
            const name = pickerEl.dataset.picker!;
            const trigger = pickerEl.querySelector<HTMLElement>(".vditor-ai-dialog__picker-trigger")!;
            // Model picker uses __picker-trigger-inner for icon+text; others use __picker-label
            const label = pickerEl.querySelector<HTMLElement>(".vditor-ai-dialog__picker-trigger-inner")
                ?? pickerEl.querySelector<HTMLElement>(".vditor-ai-dialog__picker-label")!;
            const list = pickerEl.querySelector<HTMLElement>(".vditor-ai-dialog__picker-list")!;

            // Wrap raw list contents in a scrollable __picker-options div
            const optionsEl = document.createElement("div");
            optionsEl.className = "vditor-ai-dialog__picker-options";
            while (list.firstChild) optionsEl.appendChild(list.firstChild);
            list.appendChild(optionsEl);

            // For the vscode-model picker, prepend a search input
            if (name === "vscode-model") {
                const searchEl = document.createElement("input");
                searchEl.type = "text";
                searchEl.className = "vditor-ai-dialog__picker-search";
                searchEl.placeholder = window.VditorI18n.aiSearch ?? "Search…";
                list.insertBefore(searchEl, optionsEl);
                searchEl.addEventListener("input", () => {
                    const q = searchEl.value.toLowerCase();
                    optionsEl.querySelectorAll<HTMLElement>(".vditor-ai-dialog__picker-option").forEach(btn => {
                        btn.style.display = (q && !btn.textContent?.toLowerCase().includes(q)) ? "none" : "";
                    });
                });
            }

            // Move list to body so it escapes overflow/stacking context
            document.body.appendChild(list);
            this.pickers.set(name, { trigger, label, list, optionsEl, value: "" });
        });

        // Populate format picker options (static)
        const formatPicker = this.pickers.get("format")!;
        const i = window.VditorI18n;
        formatPicker.list.innerHTML = AI_FORMAT_OPTIONS.map(o =>
            `<button type="button" class="vditor-ai-dialog__picker-option${o.value === "auto" ? " vditor-ai-dialog__picker-option--selected" : ""}" data-value="${o.value}">${i[o.i18nKey]}</button>`
        ).join("");

        this.bindEvents();
    }

    public setCopilotAvailable(available: boolean) {
        this.copilotAvailable = available;
        this.refreshEngine();
    }

    public setVSCodeModels(models: Array<{ id: string; name: string; family: string; vendor: string }>) {
        this.vscodeModels = models;
        this.refreshVSCodeModelPicker();
    }

    public open(capturedMarkdown: string, capturedIsSelection: boolean) {
        this.capturedMarkdown = capturedMarkdown;
        this.capturedIsSelection = capturedIsSelection;
        this.goalEl.value = "";
        this.closeActivePicker();
        this.refreshPrompts();
        this.refreshModels();
        this.refreshEngine();
        this.showPage("main");
        this.overlay.hidden = false;
    }

    private close(reason: "cancel" | "submit" = "cancel") {
        this.overlay.hidden = true;
        this.closeActivePicker();
        this.onClose(reason);
    }

    private showPage(name: string) {
        this.closeActivePicker();
        this.overlay.querySelectorAll<HTMLElement>(".vditor-ai-dialog__page").forEach(p => {
            p.classList.toggle("vditor-ai-dialog__page--active", p.dataset.page === name);
        });
    }

    private openPicker(name: string) {
        if (this.activePickerName && this.activePickerName !== name) {
            this.closeActivePicker();
        }
        const picker = this.pickers.get(name)!;
        const rect = picker.trigger.getBoundingClientRect();
        const list = picker.list;
        // Position below trigger, matching its width
        list.style.left = `${rect.left}px`;
        list.style.width = `${rect.width}px`;
        list.style.top = `${rect.bottom + 4}px`;
        list.hidden = false;
        this.activePickerName = name;
        // If this picker has a search input, reset it and show all options
        if (name === "vscode-model") {
            const searchEl = list.querySelector<HTMLInputElement>(".vditor-ai-dialog__picker-search");
            if (searchEl) {
                searchEl.value = "";
                picker.optionsEl.querySelectorAll<HTMLElement>(".vditor-ai-dialog__picker-option").forEach(btn => {
                    btn.style.display = "";
                });
                requestAnimationFrame(() => searchEl.focus());
            }
        }
        // Flip up if overflows viewport bottom
        requestAnimationFrame(() => {
            const listRect = list.getBoundingClientRect();
            if (listRect.bottom > window.innerHeight - 8) {
                list.style.top = `${rect.top - listRect.height - 4}px`;
            }
        });
    }

    private closeActivePicker() {
        if (this.activePickerName) {
            const picker = this.pickers.get(this.activePickerName);
            if (picker) picker.list.hidden = true;
            this.activePickerName = null;
        }
    }

    private updatePickerSelection(list: HTMLElement, value: string) {
        list.querySelectorAll<HTMLElement>(".vditor-ai-dialog__picker-option").forEach(btn => {
            btn.classList.toggle("vditor-ai-dialog__picker-option--selected", btn.dataset.value === value);
        });
    }

    private refreshPrompts() {
        const i = window.VditorI18n;
        const prompts = getAIPrompts();
        const picker = this.pickers.get("prompt")!;
        // Restore persisted selection on first load, then validate it still exists
        if (!this.promptValue) {
            this.promptValue = ls.get(AI_SELECTED_PROMPT_KEY);
        }
        picker.list.innerHTML = `<button type="button" class="vditor-ai-dialog__picker-option" data-value="">${i.aiPromptNone}</button>` +
            prompts.map(p =>
                `<button type="button" class="vditor-ai-dialog__picker-option" data-value="${p.id}" title="${p.content}">${p.name}</button>`
            ).join("");
        const found = prompts.find(p => p.id === this.promptValue);
        picker.label.textContent = found ? found.name : i.aiPromptNone;
        if (!found) this.promptValue = "";
        this.updatePickerSelection(picker.list, this.promptValue);
    }

    private setModelPickerLabel(el: HTMLElement, model: AIModel | null, placeholder: string) {
        if (model) {
            const displayName = model.name || nameFromUrl(model.url);
            el.innerHTML = `${getProviderIcon(model.url, "vditor-ai-dialog__provider-icon")}<span class="vditor-ai-dialog__picker-trigger-text">${displayName}</span>`;
        } else {
            el.innerHTML = `<span class="vditor-ai-dialog__picker-trigger-text">${placeholder}</span>`;
        }
    }

    private refreshModels() {
        const i = window.VditorI18n;
        const models = getAIModels();
        const picker = this.pickers.get("model")!;
        const savedId = ls.get(AI_SELECTED_MODEL_KEY);
        if (savedId) this.modelValue = savedId;
        picker.list.innerHTML = `<button type="button" class="vditor-ai-dialog__picker-option" data-value="">${i.aiNoModelSelected}</button>` +
            models.map(m =>
                `<button type="button" class="vditor-ai-dialog__picker-option" data-value="${m.id}">${getProviderIcon(m.url, "vditor-ai-dialog__provider-icon")}<span>${m.name || nameFromUrl(m.url)}</span></button>`
            ).join("");
        const found = models.find(m => m.id === this.modelValue);
        this.setModelPickerLabel(picker.label, found ?? null, i.aiNoModelSelected);
        if (!found) this.modelValue = "";
        this.updatePickerSelection(picker.list, this.modelValue);
        this.refreshModelNames(found ?? null);
    }

    private refreshModelNames(provider: AIModel | null) {
        const picker = this.pickers.get("model-name")!;
        if (!provider || !provider.model.trim()) {
            this.modelNameField.hidden = true;
            this.selectedModelName = "";
            return;
        }
        const names = provider.model.split(",").map(s => s.trim()).filter(Boolean);
        if (names.length === 0) {
            this.modelNameField.hidden = true;
            this.selectedModelName = "";
            return;
        }
        // Keep current selection if still valid, otherwise default to first
        if (!names.includes(this.selectedModelName)) {
            this.selectedModelName = names[0];
        }
        picker.list.innerHTML = names.map(n =>
            `<button type="button" class="vditor-ai-dialog__picker-option" data-value="${n}">${n}</button>`
        ).join("");
        picker.label.textContent = this.selectedModelName;
        this.updatePickerSelection(picker.list, this.selectedModelName);
        this.modelNameField.hidden = false;
    }

    private refreshVSCodeModelPicker() {
        const picker = this.pickers.get("vscode-model");
        if (!picker) return;
        const i = window.VditorI18n;
        const autoLabel = i.aiVscodeModelAuto ?? "Auto";
        picker.optionsEl.innerHTML =
            `<button type="button" class="vditor-ai-dialog__picker-option" data-value="">${autoLabel}</button>` +
            this.vscodeModels.map(m =>
                `<button type="button" class="vditor-ai-dialog__picker-option" data-value="${m.id}">${m.name}</button>`
            ).join("");
        const found = this.vscodeModels.find(m => m.id === this.vscodeModelValue);
        picker.label.textContent = found ? found.name : autoLabel;
        this.updatePickerSelection(picker.optionsEl, this.vscodeModelValue);
    }

    private refreshEngine() {
        const vscodeTab = this.overlay.querySelector<HTMLButtonElement>('.vditor-ai-dialog__engine-tab[data-engine="vscode"]');
        if (vscodeTab) {
            vscodeTab.disabled = !this.copilotAvailable;
            vscodeTab.classList.toggle("vditor-ai-dialog__engine-tab--disabled", !this.copilotAvailable);
            vscodeTab.title = this.copilotAvailable ? "" : window.VditorI18n.aiCopilotUnavailable;
        }
        if (!this.copilotAvailable && this.currentEngine === "vscode") {
            this.currentEngine = "custom";
            ls.set(AI_ENGINE_KEY, this.currentEngine);
        }
        this.engineTabs.forEach(tab => {
            tab.classList.toggle("vditor-ai-dialog__engine-tab--active", tab.dataset.engine === this.currentEngine);
        });
        this.customFields.hidden = this.currentEngine !== "custom";
        this.vscodeFields.hidden = this.currentEngine !== "vscode";
    }

    private bindEvents() {
        this.engineTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                if (tab.dataset.engine === "vscode" && !this.copilotAvailable) {
                    return;
                }
                this.currentEngine = tab.dataset.engine!;
                ls.set(AI_ENGINE_KEY, this.currentEngine);
                this.refreshEngine();
            });
        });

        this.overlay.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            if (target === this.overlay) { this.close(); return; }
            if (target.closest("[data-ai-close]") || target.closest("[data-ai-cancel]")) { this.close(); return; }

            // Picker trigger toggle
            const pickerTrigger = target.closest<HTMLElement>(".vditor-ai-dialog__picker-trigger");
            if (pickerTrigger) {
                const pickerEl = pickerTrigger.closest<HTMLElement>(".vditor-ai-dialog__picker")!;
                const name = pickerEl.dataset.picker!;
                const picker = this.pickers.get(name)!;
                if (this.activePickerName === name && !picker.list.hidden) {
                    this.closeActivePicker();
                } else {
                    this.openPicker(name);
                }
                return;
            }

            const gotoBtn = target.closest<HTMLElement>("[data-goto]");
            if (gotoBtn) { this.showPage(gotoBtn.dataset.goto!); return; }

            if (target.closest("[data-save='prompt']")) { this.savePrompt(); return; }
            if (target.closest("[data-save='model']")) { this.saveModel(); return; }
            if (target.closest("[data-ai-submit]")) { this.submit(); return; }
        });

        // Handle picker option clicks (lists are in body, not inside overlay)
        document.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            const option = target.closest<HTMLElement>(".vditor-ai-dialog__picker-option");
            if (option && this.activePickerName) {
                const value = option.dataset.value!;
                const name = this.activePickerName;
                const picker = this.pickers.get(name)!;
                if (name === "prompt") {
                    this.promptValue = value;
                    ls.set(AI_SELECTED_PROMPT_KEY, value);
                    const found = getAIPrompts().find(p => p.id === value);
                    picker.label.textContent = found ? found.name : window.VditorI18n.aiPromptNone;
                } else if (name === "vscode-model") {
                    this.vscodeModelValue = value;
                    const found = this.vscodeModels.find(m => m.id === value);
                    picker.label.textContent = found ? found.name : (window.VditorI18n.aiVscodeModelAuto ?? "Auto");
                } else if (name === "model") {
                    this.modelValue = value;
                    ls.set(AI_SELECTED_MODEL_KEY, value);
                    const found = getAIModels().find(m => m.id === value);
                    this.setModelPickerLabel(picker.label, found ?? null, window.VditorI18n.aiNoModelSelected);
                    this.selectedModelName = "";
                    this.refreshModelNames(found ?? null);
                } else if (name === "model-name") {
                    this.selectedModelName = value;
                    picker.label.textContent = value;
                } else if (name === "format") {
                    this.formatValue = value;
                    const opt = AI_FORMAT_OPTIONS.find(o => o.value === value);
                    picker.label.textContent = opt ? window.VditorI18n[opt.i18nKey] : value;
                }
                this.updatePickerSelection(picker.list, value);
                this.closeActivePicker();
                return;
            }

            // Close picker when clicking outside (but not inside the list itself)
            if (this.activePickerName
                && !target.closest(".vditor-ai-dialog__picker-trigger")
                && !target.closest(".vditor-ai-dialog__picker-list")) {
                this.closeActivePicker();
            }
        }, true);

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !this.overlay.hidden) {
                if (this.activePickerName) { this.closeActivePicker(); return; }
                this.close("cancel");
            }
        });
    }

    private savePrompt() {
        const nameEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-new-prompt-name")!;
        const contentEl = this.overlay.querySelector<HTMLTextAreaElement>("#vditor-ai-new-prompt-content")!;
        const name = nameEl.value.trim();
        const content = contentEl.value.trim();
        if (!name || !content) return;
        const prompts = getAIPrompts();
        const newId = Date.now().toString();
        prompts.push({ id: newId, name, content } as AIPrompt);
        setAIPrompts(prompts);
        telemetry(this.vditor, "markdown.ai.addPrompt", { source: "dialog" });
        nameEl.value = "";
        contentEl.value = "";
        this.promptValue = newId;
        this.refreshPrompts();
        this.showPage("main");
    }

    private saveModel() {
        const nameEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-new-model-name")!;
        const urlEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-new-model-url")!;
        const keyEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-new-model-key")!;
        const modelEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-new-model-model")!;
        const name = nameEl.value.trim();
        const url = urlEl.value.trim();
        if (!url) return;
        const id = Date.now().toString();
        const models = getAIModels();
        models.push({ id, name, url, key: keyEl.value.trim(), model: modelEl.value.trim(), format: this.formatValue } as AIModel);
        setAIModels(models);
        telemetry(this.vditor, "markdown.ai.addModel", { source: "dialog" });
        nameEl.value = ""; urlEl.value = ""; keyEl.value = ""; modelEl.value = "";
        // Reset format picker
        this.formatValue = "auto";
        const formatPicker = this.pickers.get("format")!;
        const firstOpt = AI_FORMAT_OPTIONS[0];
        formatPicker.label.textContent = window.VditorI18n[firstOpt.i18nKey];
        this.updatePickerSelection(formatPicker.list, "auto");
        // Auto-select saved model
        this.modelValue = id;
        ls.set(AI_SELECTED_MODEL_KEY, id);
        this.refreshModels();
        this.showPage("main");
    }

    private submit() {
        const goal = this.goalEl.value.trim();
        const promptText = this.promptValue ? (getAIPrompts().find(p => p.id === this.promptValue)?.content || "") : "";
        const options: IAIPolishOptions = { goal, prompt: promptText, engine: this.currentEngine as "vscode" | "custom" };
        if (this.currentEngine === "vscode" && this.vscodeModelValue) {
            options.vscodeModelId = this.vscodeModelValue;
        }
        if (this.currentEngine === "custom") {
            const m = getAIModels().find(m => m.id === this.modelValue);
            if (m) {
                options.customUrl = m.url;
                options.customKey = m.key;
                options.customModel = this.selectedModelName || m.model.split(",")[0].trim();
                options.customApiFormat = m.format as IAIPolishOptions["customApiFormat"];
            }
        }
        this.close("submit");
        this.onSubmit(this.capturedMarkdown, this.capturedIsSelection, options);
    }
}
