let configs = null;

export function getConfigs() {
    if (configs) return configs;
    const elem = document.getElementById('office-configs')
    const value = elem.getAttribute('data-config');
    if (value == '{{configs}}') return null;
    configs = JSON.parse(value);
    return configs;
}

// export function getConfig(key, defaultValue) {
//     const config = configs?.config;
//     if (!config) return false;
//     return config[key] ?? defaultValue ?? false
// }