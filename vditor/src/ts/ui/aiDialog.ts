import {
    AI_ENGINE_KEY, AI_CUSTOM_URL_KEY, AI_CUSTOM_KEY_KEY, AI_CUSTOM_MODEL_KEY,
    getAIPrompts,
} from "../util/globalLocalStorageSettings";
import { accessLocalStorage } from "../util/compatibility";

const ls = {
    get: (key: string) => accessLocalStorage() ? (localStorage.getItem(key) ?? "") : "",
    set: (key: string, val: string) => { if (accessLocalStorage()) localStorage.setItem(key, val); },
};

const buildHTML = (): string => {
    const i = window.VditorI18n;
    return `<div class="vditor-ai-dialog-overlay" hidden>
  <div class="vditor-ai-dialog" role="dialog" aria-modal="true">
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
        <label class="vditor-ai-dialog__label" for="vditor-ai-prompt-select">${i.aiPromptLabel}</label>
        <div class="vditor-ai-dialog__select-wrap">
          <select class="vditor-ai-dialog__select" id="vditor-ai-prompt-select">
            <option value="">${i.aiPromptNone}</option>
          </select>
        </div>
      </div>
      <div class="vditor-ai-dialog__field">
        <label class="vditor-ai-dialog__label">${i.aiEngine}</label>
        <div class="vditor-ai-dialog__engine-tabs">
          <button type="button" class="vditor-ai-dialog__engine-tab" data-engine="vscode">
            <span class="codicon codicon-extensions"></span>${i.aiVscodeApi}
          </button>
          <button type="button" class="vditor-ai-dialog__engine-tab" data-engine="custom">
            <span class="codicon codicon-server"></span>${i.aiCustom}
          </button>
        </div>
        <div class="vditor-ai-dialog__custom-fields" hidden>
          <input type="url" class="vditor-ai-dialog__input" id="vditor-ai-url" placeholder="${i.aiApiUrl}" />
          <input type="password" class="vditor-ai-dialog__input" id="vditor-ai-key" placeholder="${i.aiApiKey}" />
          <input type="text" class="vditor-ai-dialog__input" id="vditor-ai-model" placeholder="${i.aiModel}" />
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
</div>`;
};

export class AIDialog {
    private overlay: HTMLElement;
    private goalEl: HTMLTextAreaElement;
    private promptSelect: HTMLSelectElement;
    private customFields: HTMLElement;
    private urlEl: HTMLInputElement;
    private keyEl: HTMLInputElement;
    private modelEl: HTMLInputElement;
    private engineTabs: NodeListOf<HTMLElement>;
    private currentEngine: string;
    private capturedMarkdown = "";
    private capturedIsSelection = false;
    private onSubmit: (markdown: string, isSelection: boolean, options: IAIPolishOptions) => void;
    private onClose: (reason: "cancel" | "submit") => void;

    constructor(
        container: HTMLElement,
        onSubmit: (markdown: string, isSelection: boolean, options: IAIPolishOptions) => void,
        onClose: (reason: "cancel" | "submit") => void,
    ) {
        this.onSubmit = onSubmit;
        this.onClose = onClose;

        container.insertAdjacentHTML("beforeend", buildHTML());
        this.overlay = container.lastElementChild as HTMLElement;

        this.goalEl = this.overlay.querySelector<HTMLTextAreaElement>("#vditor-ai-goal")!;
        this.promptSelect = this.overlay.querySelector<HTMLSelectElement>("#vditor-ai-prompt-select")!;
        this.customFields = this.overlay.querySelector<HTMLElement>(".vditor-ai-dialog__custom-fields")!;
        this.urlEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-url")!;
        this.keyEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-key")!;
        this.modelEl = this.overlay.querySelector<HTMLInputElement>("#vditor-ai-model")!;
        this.engineTabs = this.overlay.querySelectorAll<HTMLElement>(".vditor-ai-dialog__engine-tab");
        this.currentEngine = ls.get(AI_ENGINE_KEY) || "vscode";

        this.bindEvents();
    }

    public open(capturedMarkdown: string, capturedIsSelection: boolean) {
        this.capturedMarkdown = capturedMarkdown;
        this.capturedIsSelection = capturedIsSelection;

        // Refresh prompts
        const prompts = getAIPrompts();
        const i = window.VditorI18n;
        this.promptSelect.innerHTML = `<option value="">${i.aiPromptNone}</option>` +
            prompts.map(p => `<option value="${p.id}" title="${p.content}">${p.name}</option>`).join("");

        this.goalEl.value = "";
        this.urlEl.value = ls.get(AI_CUSTOM_URL_KEY);
        this.keyEl.value = ls.get(AI_CUSTOM_KEY_KEY);
        this.modelEl.value = ls.get(AI_CUSTOM_MODEL_KEY);
        this.refreshEngine();
        this.overlay.hidden = false;
    }

    private close(reason: "cancel" | "submit" = "cancel") {
        this.overlay.hidden = true;
        this.onClose(reason);
    }

    private refreshEngine() {
        this.engineTabs.forEach(tab => {
            tab.classList.toggle("vditor-ai-dialog__engine-tab--active", tab.dataset.engine === this.currentEngine);
        });
        this.customFields.hidden = this.currentEngine !== "custom";
    }

    private bindEvents() {
        this.engineTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                this.currentEngine = tab.dataset.engine!;
                ls.set(AI_ENGINE_KEY, this.currentEngine);
                this.refreshEngine();
            });
        });

        this.overlay.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            if (target === this.overlay) { this.close(); return; }
            if (target.closest("[data-ai-close]") || target.closest("[data-ai-cancel]")) { this.close(); return; }
            if (target.closest("[data-ai-submit]")) {
                this.submit();
                return;
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !this.overlay.hidden) {
                this.close("cancel");
            }
        });
    }

    private submit() {
        const goal = this.goalEl.value.trim();
        const promptId = this.promptSelect.value;
        const promptText = promptId
            ? (getAIPrompts().find(p => p.id === promptId)?.content || "")
            : "";
        const options: IAIPolishOptions = { goal, prompt: promptText, engine: this.currentEngine };
        if (this.currentEngine === "custom") {
            const url = this.urlEl.value.trim();
            const key = this.keyEl.value.trim();
            const model = this.modelEl.value.trim();
            if (url) ls.set(AI_CUSTOM_URL_KEY, url);
            if (key) ls.set(AI_CUSTOM_KEY_KEY, key);
            if (model) ls.set(AI_CUSTOM_MODEL_KEY, model);
            options.customUrl = url;
            options.customKey = key;
            options.customModel = model;
        }
        this.close("submit");
        this.onSubmit(this.capturedMarkdown, this.capturedIsSelection, options);
    }
}
