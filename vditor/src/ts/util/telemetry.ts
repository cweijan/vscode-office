export const telemetry = (
    vditor: IVditor,
    event: string,
    properties?: Record<string, string | number | boolean>,
) => {
    const fn = vditor.options.onTelemetry;
    if (typeof fn === "function") {
        fn(event, properties);
    }
};

export const telemetryToolbar = (
    vditor: IVditor,
    action: string,
    properties?: Record<string, string | number | boolean>,
) => {
    telemetry(vditor, `markdown.toolbar.${action}`, properties);
};

export const telemetryToolbarClickOnly = (
    vditor: IVditor,
    event: Event,
    action: string,
    properties?: Record<string, string | number | boolean>,
) => {
    if (event instanceof CustomEvent) {
        return;
    }
    telemetryToolbar(vditor, action, properties);
};
