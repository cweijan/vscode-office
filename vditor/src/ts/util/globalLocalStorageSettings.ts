import {accessLocalStorage} from "./compatibility";

const GLOBAL_SETTINGS_STORAGE_KEY = "vditor-global-settings";

type GlobalLocalStorageSettings = {
    outlineEnable?: boolean;
    outlineWidth?: number;
    [key: string]: boolean | number | string | undefined;
};

const readGlobalSettings = (): GlobalLocalStorageSettings => {
    if (!accessLocalStorage()) {
        return {};
    }
    try {
        const raw = localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

const writeGlobalSettings = (settings: GlobalLocalStorageSettings) => {
    if (!accessLocalStorage()) {
        return;
    }
    try {
        localStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
};

export const getGlobalLocalStorageSetting = <T extends GlobalLocalStorageSettings[keyof GlobalLocalStorageSettings]>(
    key: string,
    fallback?: T,
): T | undefined => {
    const settings = readGlobalSettings();
    const value = settings[key];
    return value === undefined ? fallback : value as T;
};

export const setGlobalLocalStorageSetting = (
    key: string,
    value: GlobalLocalStorageSettings[keyof GlobalLocalStorageSettings],
) => {
    const settings = readGlobalSettings();
    if (value === undefined) {
        delete settings[key];
    } else {
        settings[key] = value;
    }
    writeGlobalSettings(settings);
};

