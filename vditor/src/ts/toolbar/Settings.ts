import {
    buildSettingsPanelHTML,
    refreshSettingsPanel,
    SETTINGS_PANEL_CLASS,
} from "../ui/settingsPanel";
import { getEventName } from "../util/compatibility";
import { setEditMode } from "./EditMode";
import { MenuItem } from "./MenuItem";
import { toggleSubMenu } from "./setToolbar";
import {
    UI_FONT_SIZE_KEY,
    EDITOR_FONT_SIZE_KEY,
    UI_FONT_SIZE_DEFAULT,
    EDITOR_FONT_SIZE_DEFAULT,
    FONT_SIZE_MIN,
    FONT_SIZE_MAX,
    LINE_HEIGHT_KEY,
    LINE_HEIGHT_DEFAULT,
    LINE_HEIGHT_MIN,
    LINE_HEIGHT_MAX,
    FONT_FAMILY_KEY,
    FONT_FAMILY_OPTIONS,
    CODE_FONT_FAMILY_KEY,
    BOLD_COLOR_KEY,
    getBoldColorOptions,
    applyBoldColorSetting,
    normalizeBoldColorValue,
    PAGE_WIDTH_KEY,
    PAGE_WIDTH_OPTIONS,
    IMAGE_MAX_WIDTH_KEY,
    IMAGE_MAX_HEIGHT_KEY,
    IMAGE_MAX_WIDTH_DEFAULT,
    IMAGE_MAX_HEIGHT_DEFAULT,
    IMAGE_MAX_WIDTH_MIN,
    IMAGE_MAX_WIDTH_MAX,
    IMAGE_MAX_HEIGHT_MIN,
    IMAGE_MAX_HEIGHT_MAX,
    CODE_BLOCK_MAX_HEIGHT_KEY,
    CODE_BLOCK_MAX_HEIGHT_DEFAULT,
    CODE_BLOCK_MAX_HEIGHT_OPTIONS,
    getGlobalLocalStorageSetting,
    setGlobalLocalStorageSetting,
    resetGlobalSettings,
    applyEditorSettings,
} from "../util/globalLocalStorageSettings";
import {getCodeFontFamilyOptions} from "../util/fontFamilyOptions";
import { telemetry } from "../util/telemetry";

const DROPDOWN_OPTIONS_MAP: Record<string, readonly { label: string; value: string }[] | (() => { label: string; value: string }[])> = {
    [FONT_FAMILY_KEY]: FONT_FAMILY_OPTIONS,
    [CODE_FONT_FAMILY_KEY]: getCodeFontFamilyOptions,
    [BOLD_COLOR_KEY]: getBoldColorOptions,
    [PAGE_WIDTH_KEY]: PAGE_WIDTH_OPTIONS,
    [CODE_BLOCK_MAX_HEIGHT_KEY]: CODE_BLOCK_MAX_HEIGHT_OPTIONS,
};

const resolveDropdownOptions = (key: string) => {
    const options = DROPDOWN_OPTIONS_MAP[key];
    return typeof options === "function" ? options() : options;
};

const getDropdownCurrentValue = (key: string, fallbackValue: string) => {
    if (key === BOLD_COLOR_KEY) {
        return normalizeBoldColorValue(getGlobalLocalStorageSetting<string>(key));
    }
    if (key === CODE_BLOCK_MAX_HEIGHT_KEY) {
        return getGlobalLocalStorageSetting<string>(key, CODE_BLOCK_MAX_HEIGHT_DEFAULT) ?? CODE_BLOCK_MAX_HEIGHT_DEFAULT;
    }
    return getGlobalLocalStorageSetting<string>(key, fallbackValue) ?? fallbackValue;
};

const parsePxValue = (value: string): number | undefined => {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)px$/i);
    if (!match) {
        return undefined;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveCurrentFontSize = (vditor: IVditor, isUI: boolean, fallback: number): number => {
    const key = isUI ? UI_FONT_SIZE_KEY : EDITOR_FONT_SIZE_KEY;
    const stored = getGlobalLocalStorageSetting<number>(key);
    if (stored !== undefined) {
        return stored;
    }

    if (isUI) {
        return parsePxValue(getComputedStyle(vditor.element).getPropertyValue("--ui-font-size")) ?? fallback;
    }

    const content = vditor.element.querySelector<HTMLElement>(".vditor-ir")
        || vditor.element.querySelector<HTMLElement>(".vditor-wysiwyg")
        || vditor.element;
    return parsePxValue(getComputedStyle(vditor.element).getPropertyValue("--editor-font-size"))
        ?? parsePxValue(getComputedStyle(content).fontSize)
        ?? fallback;
};

export class Settings extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildSettingsPanelHTML(vditor);
        this.element.appendChild(panelElement);

        // Floating dropdown (singleton, appended to body)
        const floatingMenu = document.createElement("div");
        floatingMenu.className = `${SETTINGS_PANEL_CLASS}__floating-menu`;
        floatingMenu.hidden = true;
        document.body.appendChild(floatingMenu);

        let activeDropdownKey = "";
        let activeTrigger: HTMLElement | null = null;

        const closeFloatingMenu = () => {
            floatingMenu.hidden = true;
            activeTrigger?.classList.remove(`${SETTINGS_PANEL_CLASS}__dropdown-trigger--open`);
            activeTrigger = null;
            activeDropdownKey = "";
        };

        const openFloatingMenu = (trigger: HTMLElement, key: string) => {
            const options = resolveDropdownOptions(key);
            if (!options) return;
            const currentValue = getDropdownCurrentValue(key, options[0].value);

            floatingMenu.innerHTML = options.map(o =>
                `<button type="button" class="${SETTINGS_PANEL_CLASS}__dropdown-option${o.value === currentValue ? ` ${SETTINGS_PANEL_CLASS}__dropdown-option--current` : ""}" data-value="${o.value}" data-dropdown-key="${key}">${o.label}</button>`
            ).join("");

            floatingMenu.hidden = false;
            const rect = trigger.getBoundingClientRect();
            floatingMenu.style.top = `${rect.bottom + 4}px`;
            floatingMenu.style.left = `${rect.left}px`;
            floatingMenu.style.minWidth = `${rect.width}px`;

            activeDropdownKey = key;
            activeTrigger = trigger;
            trigger.classList.add(`${SETTINGS_PANEL_CLASS}__dropdown-trigger--open`);
        };

        // Close floating menu on outside click
        const onDocumentClick = (e: MouseEvent) => {
            if (!floatingMenu.hidden && !floatingMenu.contains(e.target as Node) && e.target !== activeTrigger) {
                closeFloatingMenu();
            }
        };
        document.addEventListener(getEventName(), onDocumentClick, true);

        // Handle option click in floating menu
        floatingMenu.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const option = event.target.closest(`.${SETTINGS_PANEL_CLASS}__dropdown-option`) as HTMLElement | null;
            if (!option) return;
            const key = option.getAttribute("data-dropdown-key") || "";
            const value = option.getAttribute("data-value") || "";
            const label = option.textContent || "";
            const storedValue = key === CODE_BLOCK_MAX_HEIGHT_KEY && value === CODE_BLOCK_MAX_HEIGHT_DEFAULT
                ? undefined
                : value;
            setGlobalLocalStorageSetting(key, storedValue);
            if (key === FONT_FAMILY_KEY) vditor.element.style.setProperty("--editor-font-family", value);
            else if (key === CODE_FONT_FAMILY_KEY) {
                if (value === "inherit") vditor.element.style.removeProperty("--code-font-family");
                else vditor.element.style.setProperty("--code-font-family", value);
            }
            else if (key === BOLD_COLOR_KEY) {
                applyBoldColorSetting(vditor.element, value);
            }
            else if (key === PAGE_WIDTH_KEY) {
                if (value === "100%") vditor.element.style.removeProperty("--vditor-page-width");
                else vditor.element.style.setProperty("--vditor-page-width", value);
            }
            else if (key === CODE_BLOCK_MAX_HEIGHT_KEY) {
                if (value === CODE_BLOCK_MAX_HEIGHT_DEFAULT) vditor.element.style.removeProperty("--cm-block-max-height");
                else vditor.element.style.setProperty("--cm-block-max-height", value);
            }
            // update trigger label
            const trigger = panelElement.querySelector(`[data-dropdown-key="${key}"]`) as HTMLElement | null;
            if (trigger) trigger.querySelector(`.${SETTINGS_PANEL_CLASS}__dropdown-value`)!.textContent = label;
            closeFloatingMenu();
            event.preventDefault();
            event.stopPropagation();
        });

        actionBtn.addEventListener(getEventName(), () => {
            const willOpen = panelElement.style.display !== "block";
            closeFloatingMenu();
            refreshSettingsPanel(panelElement, vditor);
            if (willOpen) {
                telemetry(vditor, "markdown.settings.open");
            }
        }, true);

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            // Edit mode
            const modeButton = event.target.closest("button[data-mode]") as HTMLElement | null;
            if (modeButton) {
                setEditMode(vditor, modeButton.getAttribute("data-mode") || "", event, { keepToolbarPanel: true });
                refreshSettingsPanel(panelElement, vditor);
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Font size stepper
            const stepBtn = event.target.closest(`button[data-step]`) as HTMLElement | null;
            if (stepBtn) {
                const row = stepBtn.closest("[data-font-key]") as HTMLElement | null;
                if (!row) return;
                const key = row.getAttribute("data-font-key") || "";
                const isUI = key === UI_FONT_SIZE_KEY;
                const defaultVal = isUI ? UI_FONT_SIZE_DEFAULT : EDITOR_FONT_SIZE_DEFAULT;
                const current = resolveCurrentFontSize(vditor, isUI, defaultVal);
                const step = parseInt(stepBtn.getAttribute("data-step") || "0", 10);
                const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, current + step));
                setGlobalLocalStorageSetting(key, next);
                vditor.element.style.setProperty(isUI ? "--ui-font-size" : "--editor-font-size", `${next}px`);
                const valueEl = row.querySelector("[data-font-value]");
                if (valueEl) valueEl.textContent = `${next}px`;
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Line height stepper
            const lhBtn = event.target.closest("button[data-lh-step]") as HTMLElement | null;
            if (lhBtn) {
                const row = lhBtn.closest("[data-lh-key]") as HTMLElement | null;
                if (!row) return;
                const current = getGlobalLocalStorageSetting<number>(LINE_HEIGHT_KEY, LINE_HEIGHT_DEFAULT) ?? LINE_HEIGHT_DEFAULT;
                const step = parseFloat(lhBtn.getAttribute("data-lh-step") || "0");
                const next = Math.round(Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, current + step)) * 10) / 10;
                setGlobalLocalStorageSetting(LINE_HEIGHT_KEY, next);
                vditor.element.style.setProperty("--editor-line-height", String(next));
                const input = row.querySelector<HTMLInputElement>("[data-lh-value]");
                if (input) input.value = next.toFixed(1);
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Dropdown trigger
            const dropdownTrigger = event.target.closest(`[data-dropdown-trigger]`) as HTMLElement | null;
            if (dropdownTrigger) {
                const key = dropdownTrigger.getAttribute("data-dropdown-key") || "";
                if (activeDropdownKey === key) {
                    closeFloatingMenu();
                } else {
                    closeFloatingMenu();
                    openFloatingMenu(dropdownTrigger, key);
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Image size stepper
            const imgStepBtn = event.target.closest("button[data-img-step]") as HTMLElement | null;
            if (imgStepBtn) {
                const row = imgStepBtn.closest("[data-img-key]") as HTMLElement | null;
                if (!row) return;
                const key = row.getAttribute("data-img-key") || "";
                const isWidth = key === IMAGE_MAX_WIDTH_KEY;
                const defaultVal = isWidth ? IMAGE_MAX_WIDTH_DEFAULT : IMAGE_MAX_HEIGHT_DEFAULT;
                const min = isWidth ? IMAGE_MAX_WIDTH_MIN : IMAGE_MAX_HEIGHT_MIN;
                const max = isWidth ? IMAGE_MAX_WIDTH_MAX : IMAGE_MAX_HEIGHT_MAX;
                const unit = isWidth ? "%" : "vh";
                const cssProp = isWidth ? "--vditor-image-max-width" : "--vditor-image-max-height";
                const current = getGlobalLocalStorageSetting<number>(key, defaultVal) ?? defaultVal;
                const step = parseInt(imgStepBtn.getAttribute("data-img-step") || "0", 10);
                const next = Math.min(max, Math.max(min, current + step));
                setGlobalLocalStorageSetting(key, next);
                vditor.element.style.setProperty(cssProp, `${next}${unit}`);
                const valueEl = row.querySelector("[data-img-value]");
                if (valueEl) valueEl.textContent = `${next}${unit}`;
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Edit settings file
            if (event.target.closest("[data-edit-settings]")) {
                const fn = vditor.options.onEditSettings;
                if (typeof fn === "function") {
                    fn();
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Reset settings
            if (event.target.closest("[data-reset-settings]")) {
                resetGlobalSettings();
                for (const prop of ["--ui-font-size", "--editor-font-size", "--editor-line-height", "--editor-font-family", "--code-font-family", "--bold-color", "--vditor-page-width", "--vditor-image-max-width", "--vditor-image-max-height"]) {
                    vditor.element.style.removeProperty(prop);
                }
                applyEditorSettings(vditor.element);
                panelElement.innerHTML = buildSettingsPanelHTML(vditor);
                event.preventDefault();
                event.stopPropagation();
                return;
            }

        });

        // Line height manual input
        panelElement.addEventListener("change", (event: Event) => {
            const input = event.target as HTMLInputElement;
            if (input.dataset.lhValue !== undefined) {
                const parsed = parseFloat(input.value);
                const next = isNaN(parsed) ? LINE_HEIGHT_DEFAULT : Math.round(Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, parsed)) * 10) / 10;
                input.value = next.toFixed(1);
                setGlobalLocalStorageSetting(LINE_HEIGHT_KEY, next);
                vditor.element.style.setProperty("--editor-line-height", String(next));
            }
        });

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
    }
}
