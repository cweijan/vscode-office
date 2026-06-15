const extensionMap: Record<string, string> = {
    'application/json': 'json',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/javascript': 'js',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'text/plain': 'txt',
};

class MimeType {
    public readonly type: string;
    public readonly subtype: string;
    public readonly charset?: string;
    public constructor(type: string, subtype: string, charset?: string) {
        this.type = type.toLowerCase();
        this.subtype = subtype?.toLowerCase() ?? '';
        this.charset = charset;
    }

    public get essence(): string {
        return `${this.type}/${this.subtype}`;
    }
}

export class MimeUtility {
    private static readonly supportedImagesFormats = [
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/png',
        'image/bmp'
    ];

    public static parse(contentTypeString: string) {
        // application/json; charset=utf-8
        // application/vnd.github.chitauri-preview+sha
        const [essence, ...parameters] = contentTypeString.split(';').map(v => v.trim());
        const [type, subtype] = essence.split('/');
        const charset = parameters.find(p => p.startsWith('charset='))?.split('=')[1]?.replace(/^["']|["']$/g, '');
        return new MimeType(type, subtype, charset);
    }

    public static toBufferEncoding(charset?: string): BufferEncoding {
        if (!charset) {
            return 'utf8';
        }

        switch (charset.trim().toLowerCase().replace(/_/g, '-')) {
            case 'utf-8':
            case 'utf8':
                return 'utf8';
            case 'iso-8859-1':
            case 'iso8859-1':
            case 'latin1':
            case 'latin-1':
                return 'latin1';
            case 'us-ascii':
            case 'ascii':
                return 'ascii';
            case 'utf-16le':
                return 'utf16le';
            case 'utf-16be':
                return 'utf16be';
            default:
                return 'utf8';
        }
    }

    public static decodeBuffer(buffer: Buffer, charset?: string): string {
        try {
            return buffer.toString(this.toBufferEncoding(charset));
        } catch {
            return buffer.toString('utf8');
        }
    }

    public static getExtension(contentTypeString: string | undefined): string {
        if (!contentTypeString) {
            return '';
        }

        const { essence } = this.parse(contentTypeString);
        return extensionMap[essence] || '';
    }

    public static isBrowserSupportedImageFormat(contentTypeString: string | undefined): boolean {
        // https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
        // For chrome supports JPEG, GIF, WebP, PNG and BMP
        if (!contentTypeString) {
            return false;
        }

        const { essence } = this.parse(contentTypeString);
        return this.supportedImagesFormats.includes(essence);
    }

    public static isJSON(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        const { subtype, essence } = this.parse(contentTypeString);
        return essence === 'application/json' || subtype.endsWith('+json') || subtype.startsWith('x-amz-json');
    }

    public static isXml(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        const { subtype, essence } = this.parse(contentTypeString);
        return essence === 'application/xml' || essence === 'text/xml' || subtype.endsWith('+xml');
    }

    public static isHtml(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        return this.parse(contentTypeString).essence === 'text/html';
    }

    public static isJavaScript(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        const essence = this.parse(contentTypeString).essence;
        return essence === 'application/javascript' || essence === 'text/javascript';
    }

    public static isCSS(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        return this.parse(contentTypeString).essence === 'text/css';
    }

    public static isMultiPartMixed(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        return this.parse(contentTypeString).essence === 'multipart/mixed';
    }

    public static isMultiPartFormData(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        return this.parse(contentTypeString).essence === 'multipart/form-data';
    }

    public static isFormUrlEncoded(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        return this.parse(contentTypeString).essence === 'application/x-www-form-urlencoded';
    }

    public static isNewlineDelimitedJSON(contentTypeString: string | undefined): boolean {
        if (!contentTypeString) {
            return false;
        }

        return this.parse(contentTypeString).essence === 'application/x-ndjson';
    }
}
