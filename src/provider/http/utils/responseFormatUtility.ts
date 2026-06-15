import { window } from 'vscode';
import { MimeUtility } from './mimeUtility';
import { isJSONString } from './misc';
import { PrettyData } from './pretty-data';

const pd = new PrettyData();

export class ResponseFormatUtility {

    public static formatBody(body: string, contentType: string | undefined, suppressValidation: boolean): string {
        if (contentType) {
            if (MimeUtility.isJSON(contentType)) {
                if (isJSONString(body)) {
                    body = this.jsonPrettify(body);
                } else if (body && !suppressValidation) {
                    window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                }
            } else if (MimeUtility.isXml(contentType)) {
                body = pd.xml(body);
            } else if (MimeUtility.isCSS(contentType)) {
                body = pd.css(body);
            } else {
                // Add this for the case that the content type of response body is not very accurate #239
                if (isJSONString(body)) {
                    body = this.jsonPrettify(body);
                }
            }
        }

        return body;
    }

    private static jsonPrettify(text: string, indentSize = 2) {
        return JSON.stringify(JSON.parse(text), null, indentSize);
    }
}