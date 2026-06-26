import { PROVIDER_ICONS } from "./providerIcons";
import {
    getGlobalLocalStorageSetting,
    UI_FONT_SIZE_KEY,
    EDITOR_FONT_SIZE_KEY,
    UI_FONT_SIZE_DEFAULT,
    EDITOR_FONT_SIZE_DEFAULT,
    LINE_HEIGHT_KEY,
    LINE_HEIGHT_DEFAULT,
    FONT_FAMILY_KEY,
    FONT_FAMILY_OPTIONS,
    BOLD_COLOR_KEY,
    BOLD_COLOR_OPTIONS,
    PAGE_WIDTH_KEY,
    PAGE_WIDTH_DEFAULT,
    PAGE_WIDTH_OPTIONS,
    IMAGE_MAX_WIDTH_KEY,
    IMAGE_MAX_HEIGHT_KEY,
    IMAGE_MAX_WIDTH_DEFAULT,
    IMAGE_MAX_HEIGHT_DEFAULT,
    CODE_BLOCK_MAX_HEIGHT_KEY,
    CODE_BLOCK_MAX_HEIGHT_DEFAULT,
    CODE_BLOCK_MAX_HEIGHT_OPTIONS,
    getAIPrompts,
    setAIPrompts,
    AIPrompt,
    getAIModels,
    setAIModels,
    AIModel,
} from "../util/globalLocalStorageSettings";

export const SETTINGS_PANEL_CLASS = "vditor-settings-panel";

const EDIT_MODES = [
    { id: "wysiwyg", label: "Visual" },
    { id: "ir", label: "Markdown" },
] as const;

const buildEditModeSegmentedHTML = (currentMode: string) => {
    let html = `<div class="${SETTINGS_PANEL_CLASS}__segmented" role="group">`;
    for (const mode of EDIT_MODES) {
        const isCurrent = mode.id === currentMode;
        html += `<button type="button" class="${SETTINGS_PANEL_CLASS}__segment${isCurrent ? ` ${SETTINGS_PANEL_CLASS}__segment--current` : ""}" data-mode="${mode.id}" aria-pressed="${isCurrent}">${mode.label}</button>`;
    }
    html += "</div>";
    return html;
};

const buildFontSizeStepperHTML = (key: string, label: string, value: number) =>
    `<div class="${SETTINGS_PANEL_CLASS}__stepper-row" data-font-key="${key}">
        <span class="${SETTINGS_PANEL_CLASS}__stepper-label">${label}</span>
        <div class="${SETTINGS_PANEL_CLASS}__stepper">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-step="-1">−</button>
            <span class="${SETTINGS_PANEL_CLASS}__stepper-value" data-font-value>${value}px</span>
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-step="1">+</button>
        </div>
    </div>`;

const buildImageStepperHTML = (key: string, label: string, value: number, unit: string) =>
    `<div class="${SETTINGS_PANEL_CLASS}__stepper-row" data-img-key="${key}">
        <span class="${SETTINGS_PANEL_CLASS}__stepper-label">${label}</span>
        <div class="${SETTINGS_PANEL_CLASS}__stepper">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-img-step="-5">−</button>
            <span class="${SETTINGS_PANEL_CLASS}__stepper-value" data-img-value>${value}${unit}</span>
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-img-step="5">+</button>
        </div>
    </div>`;

const buildLineHeightStepperHTML = (value: number) =>
    `<div class="${SETTINGS_PANEL_CLASS}__stepper-row" data-lh-key>
        <span class="${SETTINGS_PANEL_CLASS}__stepper-label">Line Height</span>
        <div class="${SETTINGS_PANEL_CLASS}__stepper">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-lh-step="-0.1">−</button>
            <input type="text" class="${SETTINGS_PANEL_CLASS}__stepper-input" data-lh-value value="${value.toFixed(1)}">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-lh-step="0.1">+</button>
        </div>
    </div>`;

const buildDropdownHTML = (key: string, label: string, options: readonly { label: string; value: string }[], currentValue: string) => {
    const current = options.find(o => o.value === currentValue) ?? options[0];
    return `<div class="${SETTINGS_PANEL_CLASS}__dropdown-row">
        <span class="${SETTINGS_PANEL_CLASS}__dropdown-label">${label}</span>
        <button type="button" class="${SETTINGS_PANEL_CLASS}__dropdown-trigger" data-dropdown-trigger data-dropdown-key="${key}">
            <span class="${SETTINGS_PANEL_CLASS}__dropdown-value">${current.label}</span>
            <span class="codicon codicon-chevron-down ${SETTINGS_PANEL_CLASS}__dropdown-chevron" aria-hidden="true"></span>
        </button>
    </div>`;
};


export const buildAIPromptsHTML = () => {
    const i18n = window.VditorI18n;
    const prompts = getAIPrompts();
    const listHTML = prompts.length
        ? prompts.map(p => `
            <div class="${SETTINGS_PANEL_CLASS}__ai-prompt-row" data-prompt-id="${p.id}">
                <span class="${SETTINGS_PANEL_CLASS}__ai-prompt-name" title="${p.content}">${p.name}</span>
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-edit" data-edit-prompt="${p.id}" title="${i18n.aiEdit ?? 'Edit'}">
                    <span class="codicon codicon-edit"></span>
                </button>
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-del" data-del-prompt="${p.id}">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>`).join("")
        : `<div class="${SETTINGS_PANEL_CLASS}__ai-prompt-empty">${i18n.aiNoPrompts}</div>`;
    return `<div class="${SETTINGS_PANEL_CLASS}__ai-prompts" data-ai-prompts>
        ${listHTML}
        <div class="${SETTINGS_PANEL_CLASS}__ai-prompt-add-row" data-ai-add-row style="display:none">
            <input type="text" class="${SETTINGS_PANEL_CLASS}__ai-prompt-input" data-ai-add-name placeholder="${i18n.aiPromptName}" />
            <textarea class="${SETTINGS_PANEL_CLASS}__ai-prompt-textarea" data-ai-add-content placeholder="${i18n.aiPromptContent}"></textarea>
            <div class="${SETTINGS_PANEL_CLASS}__ai-prompt-add-actions">
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-btn" data-ai-save-prompt>${i18n.aiSave}</button>
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-btn ${SETTINGS_PANEL_CLASS}__ai-prompt-btn--cancel" data-ai-cancel-prompt>${i18n.aiCancel}</button>
            </div>
        </div>
        <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-add-btn" data-ai-new-prompt>
            <span class="codicon codicon-add"></span> ${i18n.aiAddPrompt}
        </button>
    </div>`;
};

const PROVIDER_COLORS: Record<string, string> = {
    openai:      "#10a37f",
    anthropic:   "#d97706",
    google:      "#4285f4",
    gemini:      "#4285f4",
    groq:        "#f55036",
    ollama:      "#2563eb",
    mistral:     "#fa520f",
    deepseek:    "#0070f3",
    cohere:      "#39594d",
    azure:       "#0078d4",
    perplexity:  "#20b2aa",
    moonshot:    "#4f46e5",
    zhipuai:     "#7c3aed",
    baidu:       "#2932e1",
    together:    "#6366f1",
    fireworks:   "#ef4444",
    nvidia:      "#76b900",
    huggingface: "#ff9900",
    replicate:   "#000000",
    qwen:        "#6200ea",
    dashscope:   "#6200ea",
    siliconflow: "#0ea5e9",
    silicon:     "#0ea5e9",
    xai:         "#000000",
    minimax:     "#1a73e8",
    minimaxi:    "#1a73e8",
    stepfun:     "#0066ff",
    lingyi:      "#5b4aff",
    doubao:      "#4e6ef2",
    volcengine:  "#4e6ef2",
    ark:         "#4e6ef2",
    hunyuan:     "#0052d9",
    tencent:     "#0052d9",
    qwen:        "#6200ea",
    dashscope:   "#6200ea",
    tongyi:      "#ff6a00",
    ernie:       "#2932e1",
};

export const nameFromUrl = (url: string): string => {
    try {
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const { hostname } = new URL(href);
        // IPv4
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return hostname;
        // IPv6 (brackets stripped by URL parser)
        if (/^[\da-f:]+$/i.test(hostname)) return hostname;
        // Domain: second-to-last label (e.g. "openai" from "api.openai.com")
        const parts = hostname.split(".");
        const name = parts.length >= 2 ? parts[parts.length - 2] : hostname;
        return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
        return url;
    }
};

export const getProviderIcon = (url: string, cls = `${SETTINGS_PANEL_CLASS}__provider-icon`): string => {
    const host = nameFromUrl(url).toLowerCase();
    const imgSrc = PROVIDER_ICONS[host];
    if (imgSrc) {
        return `<img class="${cls}" src="${imgSrc}" alt="${host}" aria-hidden="true">`;
    }
    const color = PROVIDER_COLORS[host] ?? "#6b7280";
    const letter = host.charAt(0).toUpperCase();
    return `<i class="${cls}" style="background:${color}" aria-hidden="true">${letter}</i>`;
};

export const AI_FORMAT_OPTIONS = [
    { value: "auto", i18nKey: "aiApiFormatAuto" },
    { value: "openai", i18nKey: "aiApiFormatOpenAI" },
    { value: "anthropic", i18nKey: "aiApiFormatAnthropic" },
    { value: "gemini", i18nKey: "aiApiFormatGemini" },
    { value: "ollama", i18nKey: "aiApiFormatOllama" },
] as const;

export const buildAIModelsHTML = () => {
    const i18n = window.VditorI18n;
    const models = getAIModels();
    const listHTML = models.length
        ? models.map(m => `
            <div class="${SETTINGS_PANEL_CLASS}__ai-prompt-row" data-model-id="${m.id}">
                ${getProviderIcon(m.url)}
                <span class="${SETTINGS_PANEL_CLASS}__ai-prompt-name" title="${m.url}">${m.name || nameFromUrl(m.url)}</span>
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-edit" data-edit-model="${m.id}" title="${i18n.aiEdit ?? 'Edit'}">
                    <span class="codicon codicon-edit"></span>
                </button>
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-del" data-del-model="${m.id}">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>`).join("")
        : `<div class="${SETTINGS_PANEL_CLASS}__ai-prompt-empty">${i18n.aiNoModels}</div>`;
    const formatOptions = AI_FORMAT_OPTIONS.map(o =>
        `<option value="${o.value}">${i18n[o.i18nKey]}</option>`).join("");
    return `<div class="${SETTINGS_PANEL_CLASS}__ai-prompts" data-ai-models>
        ${listHTML}
        <div class="${SETTINGS_PANEL_CLASS}__ai-prompt-add-row" data-ai-add-model-row style="display:none">
            <input type="text" class="${SETTINGS_PANEL_CLASS}__ai-prompt-input" data-ai-add-model-name placeholder="${i18n.aiModelName} (optional)" />
            <input type="url" class="${SETTINGS_PANEL_CLASS}__ai-prompt-input" data-ai-add-model-url placeholder="${i18n.aiApiUrl}" />
            <input type="password" class="${SETTINGS_PANEL_CLASS}__ai-prompt-input" data-ai-add-model-key placeholder="${i18n.aiApiKey}" />
            <input type="text" class="${SETTINGS_PANEL_CLASS}__ai-prompt-input" data-ai-add-model-model placeholder="${i18n.aiModel}" />
            <select class="${SETTINGS_PANEL_CLASS}__ai-prompt-input" data-ai-add-model-format>${formatOptions}</select>
            <div class="${SETTINGS_PANEL_CLASS}__ai-prompt-add-actions">
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-btn" data-ai-save-model>${i18n.aiSave}</button>
                <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-prompt-btn ${SETTINGS_PANEL_CLASS}__ai-prompt-btn--cancel" data-ai-cancel-model>${i18n.aiCancel}</button>
            </div>
        </div>
        <button type="button" class="${SETTINGS_PANEL_CLASS}__ai-add-btn" data-ai-new-model>
            <span class="codicon codicon-add"></span> ${i18n.aiAddModel}
        </button>
    </div>`;
};

export const buildSettingsPanelHTML = (vditor: IVditor) => {
    const i18n = window.VditorI18n;
    const uiSize = getGlobalLocalStorageSetting<number>(UI_FONT_SIZE_KEY, UI_FONT_SIZE_DEFAULT);
    const editorSize = getGlobalLocalStorageSetting<number>(EDITOR_FONT_SIZE_KEY, EDITOR_FONT_SIZE_DEFAULT);
    const lineHeight = getGlobalLocalStorageSetting<number>(LINE_HEIGHT_KEY, LINE_HEIGHT_DEFAULT);
    const fontFamily = getGlobalLocalStorageSetting<string>(FONT_FAMILY_KEY, FONT_FAMILY_OPTIONS[0].value);
    const boldColor = getGlobalLocalStorageSetting<string>(BOLD_COLOR_KEY, BOLD_COLOR_OPTIONS[0].value);
    const pageWidth = getGlobalLocalStorageSetting<string>(PAGE_WIDTH_KEY, PAGE_WIDTH_DEFAULT) ?? PAGE_WIDTH_DEFAULT;
    const imgMaxWidth = getGlobalLocalStorageSetting<number>(IMAGE_MAX_WIDTH_KEY, IMAGE_MAX_WIDTH_DEFAULT);
    const imgMaxHeight = getGlobalLocalStorageSetting<number>(IMAGE_MAX_HEIGHT_KEY, IMAGE_MAX_HEIGHT_DEFAULT);
    const codeBlockMaxHeight = getGlobalLocalStorageSetting<string>(CODE_BLOCK_MAX_HEIGHT_KEY, CODE_BLOCK_MAX_HEIGHT_DEFAULT) ?? CODE_BLOCK_MAX_HEIGHT_DEFAULT;
    return `<div class="${SETTINGS_PANEL_CLASS}">
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">Edit Mode</div>
            ${buildEditModeSegmentedHTML(vditor.currentMode)}
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">Font Size</div>
            <div class="${SETTINGS_PANEL_CLASS}__group">
                ${buildFontSizeStepperHTML(UI_FONT_SIZE_KEY, "UI", uiSize)}
                ${buildFontSizeStepperHTML(EDITOR_FONT_SIZE_KEY, "Editor", editorSize)}
            </div>
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">Typography</div>
            <div class="${SETTINGS_PANEL_CLASS}__group">
                ${buildDropdownHTML(FONT_FAMILY_KEY, "Font", FONT_FAMILY_OPTIONS, fontFamily)}
                ${buildDropdownHTML(BOLD_COLOR_KEY, "Bold", BOLD_COLOR_OPTIONS, boldColor)}
                ${buildDropdownHTML(PAGE_WIDTH_KEY, i18n.pageWidth, PAGE_WIDTH_OPTIONS, pageWidth)}
                ${buildDropdownHTML(CODE_BLOCK_MAX_HEIGHT_KEY, i18n.codeBlockHeight, CODE_BLOCK_MAX_HEIGHT_OPTIONS, codeBlockMaxHeight)}
                ${buildLineHeightStepperHTML(lineHeight)}
            </div>
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">${i18n.imageSize}</div>
            <div class="${SETTINGS_PANEL_CLASS}__group">
                ${buildImageStepperHTML(IMAGE_MAX_WIDTH_KEY, i18n.imageMaxWidth, imgMaxWidth, "%")}
                ${buildImageStepperHTML(IMAGE_MAX_HEIGHT_KEY, i18n.imageMaxHeight, imgMaxHeight, "vh")}
            </div>
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__footer">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__reset-btn" data-reset-settings>Reset to Defaults</button>
        </div>
    </div>`;
};

export const refreshSettingsPanel = (panelElement: HTMLElement, vditor: IVditor) => {
    for (const button of panelElement.querySelectorAll(`.${SETTINGS_PANEL_CLASS}__segment[data-mode]`)) {
        const mode = button.getAttribute("data-mode") || "";
        const isCurrent = mode === vditor.currentMode;
        button.classList.toggle(`${SETTINGS_PANEL_CLASS}__segment--current`, isCurrent);
        button.setAttribute("aria-pressed", String(isCurrent));
    }
};

export const refreshSettingsToolbarPanel = (vditor: IVditor) => {
    const settingsItem = vditor.toolbar.elements.settings;
    if (!settingsItem) return;
    const panelElement = settingsItem.querySelector(".vditor-hint") as HTMLElement | null;
    if (!panelElement || panelElement.style.display !== "block") return;
    refreshSettingsPanel(panelElement, vditor);
};
