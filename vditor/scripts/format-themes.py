#!/usr/bin/env python3
"""Format vditor theme CSS files with categorized CSS variables."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDITOR_DIR = ROOT / "src/css/editor-theme"
CODE_DIR = ROOT / "src/css/code-theme"

EDITOR_VAR_SECTIONS: list[tuple[str, list[str]]] = [
    ("Surface", ["bg-color", "front-color", "second-bg-color", "second-color"]),
    ("Border & Divider", ["hr-bg", "border-color"]),
    ("Link & State", ["link-color", "list-hover-color", "dropdown-hover-background", "error-color"]),
    ("Blockquote", ["blockquote-color", "blockquote-border", "blockquote-bg"]),
    ("Table", ["table-border", "table-row-border", "table-stripe-bg"]),
    ("Inline Code", ["code-bg-color", "code-fg-color"]),
    (
        "Toolbar & Panel",
        [
            "toolbar-background-color",
            "toolbar-icon-color",
            "toolbar-icon-hover-color",
            "panel-background-color",
            "panel-shadow",
            "textarea-background-color",
            "textarea-text-color",
            "count-background-color",
        ],
    ),
    ("Outline", ["outline-bg-color", "outline-hover-bg", "outline-active-bg"]),
    (
        "CodeMirror",
        [
            "cm-bg-color",
            "cm-fg-color",
            "cm-lang-trigger-bg",
            "cm-active-line-bg",
            "cm-active-line-gutter-fg",
            "cm-fold-fg",
            "cm-fold-fg-hover",
            "cm-fold-bg",
            "cm-cursor-fg",
            "cm-line-number-fg",
            "cm-line-number-active-fg",
            "cm-selection-bg",
            "cm-selection-bg-focused",
            "cm-selection-bg-inactive",
            "cm-selection-highlight-bg",
            "cm-lang-search-focus-color",
        ],
    ),
    (
        "Embed & Link Card",
        [
            "linkcard-bg",
            "linkcard-title-color",
            "linkcard-abstract-color",
            "linkcard-site-color",
            "linkcard-icon-color",
            "linkcard-shadow",
            "linkcard-shadow-hover",
            "linkcard-image-bg",
            "linenumber-fg",
        ],
    ),
    (
        "Resize",
        [
            "resize-icon-color",
            "resize-background-color",
            "resize-hover-icon-color",
            "resize-hover-background-color",
        ],
    ),
    (
        "Scrollbar",
        [
            "scrollbar-thumb",
            "scrollbar-thumb-hover",
        ],
    ),
]

IR_VARS = [
    "ir-heading-color",
    "ir-title-color",
    "ir-bi-color",
    "ir-link-color",
    "ir-bracket-color",
    "ir-paren-color",
]

CODE_VAR_SECTIONS: list[tuple[str, list[str]]] = [
    ("Surface", ["cm-bg-color", "cm-lang-trigger-bg", "cm-fg-color"]),
    ("Actions", ["cm-copy-color", "cm-copy-done-color", "cm-delete-color"]),
    ("Editor State", ["cm-active-line-bg", "cm-cursor-fg"]),
    ("Gutter", ["cm-line-number-fg", "cm-line-number-active-fg"]),
    (
        "Selection",
        ["cm-selection-bg-inactive", "cm-selection-bg-focused", "cm-selection-highlight-bg"],
    ),
    ("Bracket Match", ["cm-bracket-match-bg", "cm-bracket-match-border"]),
    (
        "Syntax",
        [
            "cm-syntax-comment",
            "cm-syntax-keyword",
            "cm-syntax-string",
            "cm-syntax-number",
            "cm-syntax-atom",
            "cm-syntax-property",
            "cm-syntax-attribute",
            "cm-syntax-variable",
            "cm-syntax-def",
            "cm-syntax-bracket",
            "cm-syntax-tag",
            "cm-syntax-link",
            "cm-syntax-error",
        ],
    ),
]

LIGHT_IR_DEFAULTS = {
    "ir-heading-color": "#660e7a",
    "ir-title-color": "#808080",
    "ir-bi-color": "#0033b3",
    "ir-link-color": "#008000",
    "ir-bracket-color": "#0000ff",
    "ir-paren-color": "#008000",
}

VAR_RE = re.compile(r"--([a-z0-9-]+)\s*:\s*([^;]+);")
RULE_RE = re.compile(
    r"(?P<selectors>[^{]+)\{(?P<body>[^}]*)\}",
    re.MULTILINE | re.DOTALL,
)


def parse_css(path: Path) -> list[tuple[str, dict[str, str]]]:
    text = path.read_text(encoding="utf-8")
    rules: list[tuple[str, dict[str, str]]] = []
    for match in RULE_RE.finditer(text):
        selectors = " ".join(match.group("selectors").split())
        body = match.group("body")
        vars_map = {name: value.strip() for name, value in VAR_RE.findall(body)}
        if vars_map:
            rules.append((selectors, vars_map))
    return rules


def is_dark_editor_theme(name: str, vars_map: dict[str, str]) -> bool:
    if name in {"One Dark", "Github Dark", "Nord", "Monokai", "Dracula"}:
        return True
    bg = vars_map.get("bg-color", "")
    if bg.startswith("#") and len(bg) == 7:
        r = int(bg[1:3], 16)
        g = int(bg[3:5], 16)
        b = int(bg[5:7], 16)
        return (0.299 * r + 0.587 * g + 0.114 * b) < 128
    return False


def normalize_border_vars(vars_map: dict[str, str]) -> dict[str, str]:
    v = dict(vars_map)
    if "ext-border-color" in v:
        border = v.get("border-color")
        if not border or border == "var(--ext-border-color)":
            v["border-color"] = v["ext-border-color"]
        del v["ext-border-color"]
    heading = v.get("heading-border-color")
    if heading in (None, "var(--ext-border-color)", "var(--border-color)"):
        v.pop("heading-border-color", None)
    elif "border-color" not in v:
        v["border-color"] = heading
        del v["heading-border-color"]
    for key, value in list(v.items()):
        v[key] = value.replace("var(--ext-border-color)", "var(--border-color)")
    return v


def apply_surface_tier_defaults(name: str, v: dict[str, str]) -> None:
  """Ensure toolbar, editor body, and sidebar use distinct surface colors."""
  dark = is_dark_editor_theme(name, v)

  if v.get("toolbar-background-color") in (None, "var(--bg-color)"):
    v["toolbar-background-color"] = (
      "var(--second-bg-color)"
      if dark
      else "color-mix(in srgb, var(--front-color) 6%, var(--bg-color))"
    )

  if v.get("textarea-background-color") in (None, "var(--bg-color)"):
    v["textarea-background-color"] = "var(--bg-color)"

  if "outline-bg-color" not in v:
    v["outline-bg-color"] = (
      "color-mix(in srgb, var(--front-color) 4%, var(--bg-color))"
      if dark
      else "color-mix(in srgb, var(--front-color) 3%, var(--bg-color))"
    )
    v.setdefault(
      "outline-hover-bg",
      "color-mix(in srgb, var(--front-color) 6%, var(--outline-bg-color))",
    )
    v.setdefault(
      "outline-active-bg",
      "color-mix(in srgb, var(--front-color) 10%, var(--outline-hover-bg))",
    )


def apply_shared_defaults(v: dict[str, str]) -> None:
    def set_default(key: str, value: str) -> None:
        if key not in v:
            v[key] = value

    set_default("table-row-border", "var(--border-color)")
    set_default("blockquote-border", "var(--border-color)")
    set_default("blockquote-bg", "transparent")
    set_default("second-color", "color-mix(in srgb, var(--front-color) 45%, transparent)")
    set_default("link-color", "var(--list-hover-color)")
    set_default("blockquote-color", "var(--front-color)")
    set_default("code-fg-color", "var(--front-color)")
    set_default("toolbar-icon-color", "var(--front-color)")
    set_default("toolbar-icon-hover-color", "var(--list-hover-color)")
    set_default("panel-background-color", "var(--bg-color)")
    set_default(
        "panel-shadow",
        "0 2px 8px color-mix(in srgb, var(--front-color) 12%, transparent)",
    )
    set_default("textarea-text-color", "var(--front-color)")
    set_default(
        "count-background-color",
        "color-mix(in srgb, var(--front-color) 8%, transparent)",
    )
    set_default("cm-bg-color", "var(--code-bg-color)")
    set_default("cm-fg-color", "var(--front-color)")
    set_default("cm-lang-trigger-bg", "var(--second-bg-color)")
    set_default(
        "cm-active-line-bg",
        "color-mix(in srgb, var(--front-color) 6%, var(--cm-bg-color))",
    )
    set_default("cm-active-line-gutter-fg", "var(--cm-line-number-active-fg)")
    set_default("cm-fold-fg", "var(--list-hover-color)")
    set_default("cm-fold-fg-hover", "var(--front-color)")
    set_default(
        "cm-fold-bg",
        "color-mix(in srgb, var(--cm-fold-fg) 12%, var(--cm-bg-color))",
    )
    set_default("cm-cursor-fg", "var(--front-color)")
    set_default(
        "cm-line-number-fg",
        "color-mix(in srgb, var(--front-color) 55%, transparent)",
    )
    set_default("cm-line-number-active-fg", "var(--front-color)")
    set_default(
        "cm-selection-bg",
        "color-mix(in srgb, var(--list-hover-color) 32%, transparent)",
    )
    set_default(
        "cm-selection-bg-focused",
        "color-mix(in srgb, var(--list-hover-color) 42%, transparent)",
    )
    set_default(
        "cm-selection-bg-inactive",
        "color-mix(in srgb, var(--list-hover-color) 24%, transparent)",
    )
    set_default(
        "cm-selection-highlight-bg",
        "color-mix(in srgb, var(--list-hover-color) 18%, transparent)",
    )
    set_default("cm-lang-search-focus-color", "var(--list-hover-color)")
    set_default("linkcard-bg", "var(--second-bg-color)")
    set_default("linkcard-title-color", "var(--front-color)")
    set_default("linkcard-abstract-color", "var(--second-color)")
    set_default("linkcard-site-color", "var(--link-color)")
    set_default("linkcard-icon-color", "var(--toolbar-icon-color)")
    set_default("linkcard-shadow", "var(--panel-shadow)")
    set_default(
        "linkcard-shadow-hover",
        "0 0 3px color-mix(in srgb, var(--front-color) 13%, transparent), 0 3px 6px color-mix(in srgb, var(--front-color) 26%, transparent)",
    )
    set_default("linkcard-image-bg", "var(--second-color)")
    set_default(
        "linenumber-fg",
        "color-mix(in srgb, var(--front-color) 38%, transparent)",
    )
    set_default(
        "scrollbar-thumb",
        "color-mix(in srgb, var(--front-color) 30%, transparent)",
    )
    set_default(
        "scrollbar-thumb-hover",
        "color-mix(in srgb, var(--front-color) 44%, transparent)",
    )


def enrich_auto_vars(vars_map: dict[str, str]) -> dict[str, str]:
    v = dict(vars_map)
    apply_shared_defaults(v)
    set_default = lambda key, value: v.setdefault(key, value)
    set_default(
        "resize-icon-color",
        "var(--vscode-icon-foreground, var(--second-color))",
    )
    set_default(
        "resize-background-color",
        "var(--vscode-scrollbarSlider-background, var(--second-color))",
    )
    set_default("resize-hover-icon-color", "var(--vscode-editor-foreground)")
    set_default(
        "resize-hover-background-color",
        "var(--vscode-scrollbarSlider-hoverBackground, var(--vscode-focusBorder))",
    )
    v["scrollbar-thumb"] = (
        "var(--vscode-scrollbarSlider-background, color-mix(in srgb, var(--front-color) 30%, transparent))"
    )
    v["scrollbar-thumb-hover"] = (
        "var(--vscode-scrollbarSlider-hoverBackground, color-mix(in srgb, var(--front-color) 44%, transparent))"
    )
    return v


def extract_ir_vars(vars_map: dict[str, str]) -> dict[str, str]:
    ir: dict[str, str] = {}
    for key in IR_VARS:
        if key in vars_map:
            ir[key] = vars_map.pop(key)
    return ir


def enrich_editor_vars(name: str, vars_map: dict[str, str]) -> dict[str, str]:
    v = dict(vars_map)
    apply_shared_defaults(v)
    apply_surface_tier_defaults(name, v)

    if not any(key.startswith("ir-") for key in v) and not is_dark_editor_theme(name, v):
        for key, value in LIGHT_IR_DEFAULTS.items():
            v.setdefault(key, value)

    return v


def render_sections(sections: list[tuple[str, list[str]]], vars_map: dict[str, str]) -> str:
    lines: list[str] = []
    used: set[str] = set()
    for title, keys in sections:
        section_lines: list[str] = []
        for key in keys:
            if key in vars_map:
                section_lines.append(f"    --{key}: {vars_map[key]};")
                used.add(key)
        if section_lines:
            lines.append(f"    /* {title} */")
            lines.extend(section_lines)
            lines.append("")
    extra = [key for key in sorted(vars_map) if key not in used]
    if extra:
        lines.append("    /* Other */")
        for key in extra:
            lines.append(f"    --{key}: {vars_map[key]};")
        lines.append("")
    if lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def editor_selectors(name: str) -> str:
    return f'html[data-editor-theme="{name}"],\n#vditor[data-editor-theme="{name}"]'


def format_editor_theme(path: Path) -> str:
    name = path.stem
    rules = parse_css(path)
    if not rules:
        raise ValueError(f"No rules found in {path}")

    _, main_vars = rules[0]
    main_vars = normalize_border_vars(main_vars)
    if name == "Auto":
        main_vars = enrich_auto_vars(main_vars)
    else:
        main_vars = enrich_editor_vars(name, main_vars)

    ir_vars: dict[str, str] = {}
    auto_dark_ir: dict[str, str] = {}
    for selectors, vars_map in rules[1:]:
        vars_map = normalize_border_vars(vars_map)
        if name == "Auto" and "vditor--dark" in selectors:
            auto_dark_ir = vars_map
            continue
        for key in IR_VARS:
            if key in vars_map:
                ir_vars[key] = vars_map[key]

    ir_from_main = extract_ir_vars(main_vars)
    if ir_from_main and name != "Auto":
        ir_vars = {**ir_from_main, **ir_vars}

    main_body = render_sections(EDITOR_VAR_SECTIONS, main_vars)
    chunks = [f"{editor_selectors(name)} {{\n{main_body}\n}}"]

    if name == "Auto" and auto_dark_ir:
        ir_body = render_sections([("IR Syntax", IR_VARS)], auto_dark_ir)
        chunks.append(f"#vditor[data-editor-theme=\"Auto\"].vditor--dark {{\n{ir_body}\n}}")
    elif ir_vars:
        ir_body = render_sections([("IR Syntax", IR_VARS)], ir_vars)
        chunks.append(f'#vditor[data-editor-theme="{name}"] {{\n{ir_body}\n}}')

    return "\n\n".join(chunks) + "\n"


def format_code_theme(path: Path) -> str:
    name = path.stem
    rules = parse_css(path)
    if not rules:
        raise ValueError(f"No rules found in {path}")
    _, vars_map = rules[0]
    body = render_sections(CODE_VAR_SECTIONS, vars_map)
    selectors = f'html[data-cm-theme="{name}"],\n#vditor[data-cm-theme="{name}"]'
    return f"{selectors} {{\n{body}\n}}\n"


def main() -> None:
    for path in sorted(EDITOR_DIR.glob("*.css")):
        path.write_text(format_editor_theme(path), encoding="utf-8")
        print(f"formatted editor theme: {path.name}")

    for path in sorted(CODE_DIR.glob("*.css")):
        path.write_text(format_code_theme(path), encoding="utf-8")
        print(f"formatted code theme: {path.name}")


if __name__ == "__main__":
    main()
