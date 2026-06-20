declare const VDITOR_VERSION: string;

const _VDITOR_VERSION = VDITOR_VERSION;

export {_VDITOR_VERSION as VDITOR_VERSION};

export abstract class Constants {
  public static readonly ZWSP: string = "\u200b";
  public static readonly DROP_EDITOR: string = "application/editor";
  public static readonly MOBILE_WIDTH: number = 520;
  public static readonly CLASS_MENU_DISABLED: string = "vditor-menu--disabled";
  public static readonly EDIT_TOOLBARS: string[] = ["emoji", "headings", "bold", "italic", "strike", "link", "list",
    "ordered-list", "outdent", "indent", "check", "line", "quote", "code", "inline-code", "insert-after",
    "insert-before", "upload", "record", "table"];
  /** Code block theme ids; UI only until CodeMirror themes are wired in setCodeTheme. */
  public static readonly CODE_THEME: string[] = ["default", "github", "dracula", "monokai", "one-dark"];
  public static readonly CODE_LANGUAGES: string[] = ["mermaid", "plantuml", "apache",
    "js", "ts", "html",
    // common
    "properties", "apache", "bash", "c", "csharp", "cpp", "css", "coffeescript", "diff", "go", "xml", "http",
    "json", "java", "javascript", "kotlin", "less", "lua", "makefile", "markdown", "nginx", "objectivec", "php",
    "php-template", "perl", "plaintext", "python", "python-repl", "r", "ruby", "rust", "scss", "sql", "shell",
    "swift", "ini", "typescript", "vbnet", "yaml",
    "ada", "clojure", "dart", "erb", "fortran", "gradle", "haskell", "julia", "julia-repl", "lisp", "matlab",
    "pgsql", "powershell", "sql_more", "stata", "cmake", "mathematica",
    // ext
    "solidity", "yul"
  ];
  public static readonly CDN = `https://unpkg.com/vscode-vditor@${VDITOR_VERSION}`;
  public static readonly MARKDOWN_OPTIONS = {
    autoSpace: false,
    codeBlockPreview: true,
    fixTermTypo: false,
    footnotes: true,
    linkBase: "",
    linkPrefix: "",
    listStyle: false,
    mark: false,
    mathBlockPreview: true,
    paragraphBeginningSpace: false,
    sanitize: true,
    toc: false,
  };
  public static readonly HLJS_OPTIONS = {
    enable: true,
    lineNumber: false,
    style: "default",
  };
  public static readonly MATH_OPTIONS: IMath = {
    inlineDigit: false,
    macros: {},
  };
  public static readonly THEME_OPTIONS = {
    current: "light",
    list: {
      "ant-design": "Ant Design",
      "dark": "Dark",
      "light": "Light",
      "wechat": "WeChat",
    },
    path: `css/content-theme`,
  };
}
