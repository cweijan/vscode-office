const eventTargetElement = (event: Event): Element | null => {
    const target = event.target;
    if (target instanceof Element) {
        return target;
    }
    if (target instanceof Text) {
        return target.parentElement;
    }
    return null;
};

export interface IPopoverOutsideDismissRule {
    isActive: () => boolean;
    shouldIgnoreTarget: (target: Element | null) => boolean;
    dismiss: () => void;
}

const rules: IPopoverOutsideDismissRule[] = [];
let documentDismissBound = false;

const handleDocumentPointerDown = (event: Event) => {
    const target = eventTargetElement(event);
    for (const rule of rules) {
        if (!rule.isActive()) {
            continue;
        }
        if (rule.shouldIgnoreTarget(target)) {
            continue;
        }
        rule.dismiss();
    }
};

const ensureDocumentDismissListener = () => {
    if (documentDismissBound) {
        return;
    }
    documentDismissBound = true;
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
};

export const registerPopoverOutsideDismiss = (rule: IPopoverOutsideDismissRule) => {
    ensureDocumentDismissListener();
    rules.push(rule);
    return () => {
        const index = rules.indexOf(rule);
        if (index >= 0) {
            rules.splice(index, 1);
        }
    };
};

export const isInsideToolbar = (target: Element | null) => {
    return !!target?.closest(".vditor-toolbar");
};

export const isInsideCmLangPopover = (target: Element | null) => {
    return !!target?.closest(".vditor-cm-chrome__lang");
};

export const isInsideCmThemePopover = (target: Element | null) => {
    return !!target?.closest(
        ".vditor-cm-chrome__theme, .vditor-cm-chrome__theme-panel",
    );
};

export const isInsideMermaidThemePopover = (target: Element | null) => {
    return !!target?.closest(
        ".vditor-mermaid-chrome__theme, .vditor-mermaid-chrome__theme-panel",
    );
};
