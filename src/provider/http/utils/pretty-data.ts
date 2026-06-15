/**
 * pretty-data - TypeScript module to pretty-print or minify data in XML, JSON, CSS and SQL formats.
 */

export class PrettyData {
    private shift: string[];
    private step: string;
    private readonly maxdeep: number;

    constructor() {
        this.shift = ['\n'];
        this.step = '  '; // 2 spaces
        this.maxdeep = 100; // nesting level

        // initialize array with shifts
        for (let ix = 0; ix < this.maxdeep; ix++) {
            this.shift.push(this.shift[ix] + this.step);
        }
    }

    /**
     * Pretty print XML
     * @param text XML string to beautify
     */
    xml(text: string): string {
        const ar = text.replace(/>\s{0,}</g, "><")
            .replace(/</g, "~::~<")
            .replace(/xmlns\:/g, "~::~xmlns:")
            .replace(/xmlns\=/g, "~::~xmlns=")
            .split('~::~');

        let inComment = false;
        let deep = 0;
        let str = '';

        for (const line of ar) {
            // start comment or <![CDATA[...]]> or <!DOCTYPE
            if (line.search(/<!/) > -1) {
                str += this.shift[deep] + line;
                inComment = true;
                // end comment or <![CDATA[...]]>
                if (line.search(/-->/) > -1 || line.search(/\]>/) > -1 || line.search(/!DOCTYPE/) > -1) {
                    inComment = false;
                }
            } else if (line.search(/-->/) > -1 || line.search(/\]>/) > -1) {
                str += line;
                inComment = false;
            } else if (/^<\w/.test(ar[ar.indexOf(line) - 1]) && /^<\/\w/.test(line) &&
                /^<[\w:\-\.\,]+/.exec(ar[ar.indexOf(line) - 1])?.[0] === /^<\/[\w:\-\.\,]+/.exec(line)?.[0].replace('/', '')) {
                str += line;
                if (!inComment) deep--;
            } else if (line.search(/<\w/) > -1 && line.search(/<\//) === -1 && line.search(/\/>/) === -1) {
                str = !inComment ? str += this.shift[deep++] + line : str += line;
            } else if (line.search(/<\w/) > -1 && line.search(/<\//) > -1) {
                str = !inComment ? str += this.shift[deep] + line : str += line;
            } else if (line.search(/<\//) > -1) {
                str = !inComment ? str += this.shift[--deep] + line : str += line;
            } else if (line.search(/\/>/) > -1) {
                str = !inComment ? str += this.shift[deep] + line : str += line;
            } else if (line.search(/<\?/) > -1) {
                str += this.shift[deep] + line;
            } else if (line.search(/xmlns\:/) > -1 || line.search(/xmlns\=/) > -1) {
                str += this.shift[deep] + line;
            } else {
                str += line;
            }
        }

        return str[0] === '\n' ? str.slice(1) : str;
    }

    /**
     * Pretty print JSON
     * @param text JSON string or object to beautify
     */
    json(text: string | object): string | null {
        try {
            if (typeof text === "string") {
                return JSON.stringify(JSON.parse(text), null, this.step);
            }
            if (typeof text === "object") {
                return JSON.stringify(text, null, this.step);
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Pretty print CSS
     * @param text CSS string to beautify
     */
    css(text: string): string {
        const ar = text.replace(/\s{1,}/g, ' ')
            .replace(/\{/g, "{~::~")
            .replace(/\}/g, "~::~}~::~")
            .replace(/\;/g, ";~::~")
            .replace(/\/\*/g, "~::~/*")
            .replace(/\*\//g, "*/~::~")
            .replace(/~::~\s{0,}~::~/g, "~::~")
            .split('~::~');

        let deep = 0;
        let str = '';

        for (const line of ar) {
            if (/\{/.test(line)) {
                str += this.shift[deep++] + line;
            } else if (/\}/.test(line)) {
                str += this.shift[--deep] + line;
            } else if (/\*\\/.test(line)) {
                str += this.shift[deep] + line;
            } else {
                str += this.shift[deep] + line;
            }
        }

        return str.replace(/^\n{1,}/, '');
    }

    /**
     * Pretty print SQL
     * @param text SQL string to beautify
     */
    sql(text: string): string {
        const splitSql = (str: string, tab: string): string[] => {
            return str.replace(/\s{1,}/g, " ")
                .replace(/ AND /ig, "~::~" + tab + tab + "AND ")
                .replace(/ BETWEEN /ig, "~::~" + tab + "BETWEEN ")
                .replace(/ CASE /ig, "~::~" + tab + "CASE ")
                .replace(/ ELSE /ig, "~::~" + tab + "ELSE ")
                .replace(/ END /ig, "~::~" + tab + "END ")
                .replace(/ FROM /ig, "~::~FROM ")
                .replace(/ GROUP\s{1,}BY/ig, "~::~GROUP BY ")
                .replace(/ HAVING /ig, "~::~HAVING ")
                .replace(/ IN /ig, " IN ")
                .replace(/ JOIN /ig, "~::~JOIN ")
                .replace(/ CROSS~::~{1,}JOIN /ig, "~::~CROSS JOIN ")
                .replace(/ INNER~::~{1,}JOIN /ig, "~::~INNER JOIN ")
                .replace(/ LEFT~::~{1,}JOIN /ig, "~::~LEFT JOIN ")
                .replace(/ RIGHT~::~{1,}JOIN /ig, "~::~RIGHT JOIN ")
                .replace(/ ON /ig, "~::~" + tab + "ON ")
                .replace(/ OR /ig, "~::~" + tab + tab + "OR ")
                .replace(/ ORDER\s{1,}BY/ig, "~::~ORDER BY ")
                .replace(/ OVER /ig, "~::~" + tab + "OVER ")
                .replace(/\(\s{0,}SELECT /ig, "~::~(SELECT ")
                .replace(/\)\s{0,}SELECT /ig, ")~::~SELECT ")
                .replace(/ THEN /ig, " THEN~::~" + tab + "")
                .replace(/ UNION /ig, "~::~UNION~::~")
                .replace(/ USING /ig, "~::~USING ")
                .replace(/ WHEN /ig, "~::~" + tab + "WHEN ")
                .replace(/ WHERE /ig, "~::~WHERE ")
                .replace(/ WITH /ig, "~::~WITH ")
                .replace(/ ALL /ig, " ALL ")
                .replace(/ AS /ig, " AS ")
                .replace(/ ASC /ig, " ASC ")
                .replace(/ DESC /ig, " DESC ")
                .replace(/ DISTINCT /ig, " DISTINCT ")
                .replace(/ EXISTS /ig, " EXISTS ")
                .replace(/ NOT /ig, " NOT ")
                .replace(/ NULL /ig, " NULL ")
                .replace(/ LIKE /ig, " LIKE ")
                .replace(/\s{0,}SELECT /ig, "SELECT ")
                .replace(/~::~{1,}/g, "~::~")
                .split('~::~');
        };

        const isSubquery = (str: string, parenthesisLevel: number): number => {
            return parenthesisLevel - (str.replace(/\(/g, '').length - str.replace(/\)/g, '').length);
        };

        const arByQuote = text.replace(/\s{1,}/g, " ")
            .replace(/\'/ig, "~::~\'")
            .split('~::~');

        const ar: string[] = [];
        let deep = 0;
        const tab = this.step;
        let str = '';
        let parenthesisLevel = 0;

        for (let ix = 0; ix < arByQuote.length; ix++) {
            if (ix % 2) {
                ar.push(arByQuote[ix]);
            } else {
                ar.push(...splitSql(arByQuote[ix], tab));
            }
        }

        for (const line of ar) {
            parenthesisLevel = isSubquery(line, parenthesisLevel);

            if (/\s{0,}\s{0,}SELECT\s{0,}/.test(line)) {
                str += this.shift[deep] + line.replace(/\,/g, ",\n" + tab + tab + "");
            } else if (/\s{0,}\(\s{0,}SELECT\s{0,}/.test(line)) {
                deep++;
                str += this.shift[deep] + line;
            } else if (/\'/.test(line)) {
                if (parenthesisLevel < 1 && deep) {
                    deep--;
                }
                str += line;
            } else {
                str += this.shift[deep] + line;
                if (parenthesisLevel < 1 && deep) {
                    deep--;
                }
            }
        }

        return str.replace(/^\n{1,}/, '').replace(/\n{1,}/g, "\n");
    }

    /**
     * Minify XML
     * @param text XML string to minify
     * @param preserveComments Whether to preserve comments
     */
    xmlmin(text: string, preserveComments?: boolean): string {
        const str = preserveComments ? text
            : text.replace(/\<![ \r\n\t]*(--([^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)\>/g, "");
        return str.replace(/>\s{0,}</g, "><");
    }

    /**
     * Minify JSON
     * @param text JSON string to minify
     */
    jsonmin(text: string): string {
        return text.replace(/\s{0,}\{\s{0,}/g, "{")
            .replace(/\s{0,}\[$/g, "[")
            .replace(/\[\s{0,}/g, "[")
            .replace(/:\s{0,}\[/g, ':[')
            .replace(/\s{0,}\}\s{0,}/g, "}")
            .replace(/\s{0,}\]\s{0,}/g, "]")
            .replace(/\"\s{0,}\,/g, '",')
            .replace(/\,\s{0,}\"/g, ',"')
            .replace(/\"\s{0,}:/g, '":')
            .replace(/:\s{0,}\"/g, ':"')
            .replace(/:\s{0,}\[/g, ':[')
            .replace(/\,\s{0,}\[/g, ',[')
            .replace(/\,\s{2,}/g, ', ')
            .replace(/\]\s{0,},\s{0,}\[/g, '],[');
    }

    /**
     * Minify CSS
     * @param text CSS string to minify
     * @param preserveComments Whether to preserve comments
     */
    cssmin(text: string, preserveComments?: boolean): string {
        const str = preserveComments ? text
            : text.replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g, "");
        return str.replace(/\s{1,}/g, ' ')
            .replace(/\{\s{1,}/g, "{")
            .replace(/\}\s{1,}/g, "}")
            .replace(/\;\s{1,}/g, ";")
            .replace(/\/\*\s{1,}/g, "/*")
            .replace(/\*\/\s{1,}/g, "*/");
    }

    /**
     * Minify SQL
     * @param text SQL string to minify
     */
    sqlmin(text: string): string {
        return text.replace(/\s{1,}/g, " ")
            .replace(/\s{1,}\(/, "(")
            .replace(/\s{1,}\)/, ")");
    }
}

// Export a singleton instance
export const pd = new PrettyData(); 