// @ts-ignore
import sponsorIconUrl from "../../assets/sponsor-icon.png";

const SPONSOR_URL = "https://database-client.com/";

const SPONSOR_DESC: Record<string, string> = {
    zh_CN: "你好，我是 Office Viewer 的作者。如果你觉得这个扩展还不错，欢迎试试我的另一款扩展 <strong>Database Client</strong>，可直接在 VS Code 内管理 MySQL、PostgreSQL、MongoDB、Redis，内置 SSH 终端一站式完成数据库运维，已有超过 100 万开发者信赖。",
    zh_TW: "你好，我是 Office Viewer 的作者。如果你覺得這個擴展還不錯，歡迎試試我的另一款擴展 <strong>Database Client</strong>，可直接在 VS Code 內管理 MySQL、PostgreSQL、MongoDB、Redis，內置 SSH 終端一站式完成資料庫運維，已有超過 100 萬開發者信賴。",
    ja_JP: "こんにちは、Office Viewer の作者です。このExtensionが気に入ったら、もう一つのExtension <strong>Database Client</strong> もぜひ試してみてください。MySQL、PostgreSQL、MongoDB、Redis、SSH ターミナルなど、VS Code 内ですべて管理できます。100万人以上の開発者に利用されています。",
    ko_KR: "안녕하세요, Office Viewer 제작자입니다. 이 확장이 유용하셨다면 제 다른 확장 <strong>Database Client</strong> 도 확인해 보세요. MySQL, PostgreSQL, MongoDB, Redis, SSH 터미널 등을 VS Code 안에서 모두 관리할 수 있습니다. 100만 명 이상의 개발자가 신뢰하고 있습니다.",
    ru_RU: "Привет, я автор Office Viewer. Если расширение вам нравится, попробуйте моё другое расширение <strong>Database Client</strong>. Поддерживает MySQL, PostgreSQL, MongoDB, Redis, SSH-терминалы и другое — всё внутри VS Code. Более 1 миллиона разработчиков уже используют его.",
};
const DEFAULT_SPONSOR_DESC = "Hi, I'm the author of Office Viewer. If you find it useful, check out my other extension <strong>Database Client</strong>. It supports MySQL, PostgreSQL, MongoDB, Redis, SSH terminals and more — all inside VS Code. Trusted by 1M+ developers.";

export class SponsorPanel {
    public element: HTMLElement;
    private onLogoClick: (() => void) | undefined;
    private onSiteClick: (() => void) | undefined;

    constructor(container: HTMLElement, lang: string, onLogoClick?: () => void, onSiteClick?: () => void) {
        this.onLogoClick = onLogoClick;
        this.onSiteClick = onSiteClick;

        this.element = document.createElement("div");
        this.element.className = "vditor-sponsor-popup";
        this.element.style.display = "none";

        const desc = SPONSOR_DESC[lang] || DEFAULT_SPONSOR_DESC;
        this.element.innerHTML = `
<div class="vditor-sponsor-popup__inner">
    <p class="vditor-sponsor-popup__desc">${desc}</p>
    <div class="vditor-sponsor-popup__bar">
        <button type="button" class="vditor-sponsor-popup__logo js-logo" title="Open Database Client">
            <img src="${sponsorIconUrl}" alt="Database Client" draggable="false"/>
        </button>
        <span class="vditor-sponsor-popup__bar-text">
            Supported by <a href="${SPONSOR_URL}" class="js-site">Database Client</a>
        </span>
    </div>
</div>`;

        container.appendChild(this.element);
        this.bindEvents();
    }

    private bindEvents() {
        this.element.querySelector(".js-logo").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.onLogoClick) { this.onLogoClick(); } else { window.open(SPONSOR_URL, "_blank"); }
        });

        this.element.querySelector(".js-site").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.onSiteClick) { this.onSiteClick(); } else { window.open(SPONSOR_URL, "_blank"); }
        });
    }

    public toggle(anchorEl: HTMLElement) {
        if (this.element.style.display === "block") {
            this.hide();
            return;
        }
        this.show(anchorEl);
    }

    public show(anchorEl: HTMLElement) {
        this.element.style.display = "block";
        // position: align right edge to anchor button
        const containerRect = (this.element.parentElement as HTMLElement).getBoundingClientRect();
        const anchorRect = anchorEl.getBoundingClientRect();
        const rightOffset = containerRect.right - anchorRect.right;
        this.element.style.right = `${rightOffset}px`;
    }

    public hide() {
        this.element.style.display = "none";
    }

    public isVisible() {
        return this.element.style.display === "block";
    }
}
