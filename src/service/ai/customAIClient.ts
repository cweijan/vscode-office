/** 主流 AI HTTP API 格式 */
export type CustomAIApiFormat = "auto" | "openai" | "anthropic" | "gemini" | "ollama";

export interface CustomAIRequestOptions {
    url: string;
    apiKey?: string;
    model?: string;
    format?: CustomAIApiFormat;
    prompt: string;
    signal?: AbortSignal;
}

const DEFAULT_MODELS: Record<Exclude<CustomAIApiFormat, "auto">, string> = {
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet-20241022",
    gemini: "gemini-1.5-flash",
    ollama: "llama3.2",
};

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/** 根据 URL 猜测 API 格式 */
export const detectCustomAIFormat = (url: string): Exclude<CustomAIApiFormat, "auto"> => {
    const lower = url.toLowerCase();
    if (lower.includes("anthropic.com") || lower.includes("/v1/messages")) {
        return "anthropic";
    }
    if (
        lower.includes("generativelanguage.googleapis.com")
        || lower.includes("googleapis.com")
        || lower.includes(":generatecontent")
        || lower.includes("/gemini")
    ) {
        return "gemini";
    }
    if (
        lower.includes("ollama")
        || lower.includes(":11434")
        || lower.endsWith("/api/chat")
        || /\/api\/chat(?:\?|$)/.test(lower)
    ) {
        return "ollama";
    }
    return "openai";
};

const resolveFormat = (url: string, format?: CustomAIApiFormat): Exclude<CustomAIApiFormat, "auto"> => {
    if (format && format !== "auto") {
        return format;
    }
    return detectCustomAIFormat(url);
};

const resolveModel = (format: Exclude<CustomAIApiFormat, "auto">, model?: string) => {
    return model?.trim() || DEFAULT_MODELS[format];
};

const resolveOpenAIUrl = (rawUrl: string) => {
    const url = trimTrailingSlash(rawUrl);
    if (url.endsWith("/chat/completions")) {
        return url;
    }
    if (url.endsWith("/v1")) {
        return `${url}/chat/completions`;
    }
    if (/\/v\d+$/.test(url)) {
        return `${url}/chat/completions`;
    }
    return `${url}/v1/chat/completions`;
};

const resolveAnthropicUrl = (rawUrl: string) => {
    const url = trimTrailingSlash(rawUrl);
    if (url.endsWith("/messages")) {
        return url;
    }
    if (url.endsWith("/v1")) {
        return `${url}/messages`;
    }
    return `${url}/v1/messages`;
};

const resolveOllamaUrl = (rawUrl: string) => {
    const url = trimTrailingSlash(rawUrl);
    if (url.endsWith("/api/chat")) {
        return url;
    }
    if (url.endsWith("/api")) {
        return `${url}/chat`;
    }
    return `${url}/api/chat`;
};

const resolveGeminiUrl = (rawUrl: string, model: string) => {
    const url = trimTrailingSlash(rawUrl);
    if (url.includes(":generateContent")) {
        return url;
    }
    if (url.includes("/models/")) {
        return `${url}:generateContent`;
    }
    const base = url.includes("googleapis.com") ? url : `${url}/v1beta`;
    return `${base}/models/${model}:generateContent`;
};

const appendQueryKey = (url: string, apiKey?: string) => {
    if (!apiKey || /[?&]key=/.test(url)) {
        return url;
    }
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}key=${encodeURIComponent(apiKey)}`;
};

const buildRequest = (
    format: Exclude<CustomAIApiFormat, "auto">,
    prompt: string,
    model: string,
    rawUrl: string,
    apiKey?: string,
) => {
    switch (format) {
        case "anthropic":
            return {
                url: resolveAnthropicUrl(rawUrl),
                headers: {
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                    ...(apiKey ? { "x-api-key": apiKey } : {}),
                },
                body: {
                    model,
                    max_tokens: 8192,
                    messages: [{ role: "user", content: prompt }],
                },
            };
        case "gemini":
            return {
                url: appendQueryKey(resolveGeminiUrl(rawUrl, model), apiKey),
                headers: {
                    "Content-Type": "application/json",
                    ...(apiKey && !rawUrl.includes("key=") ? { "x-goog-api-key": apiKey } : {}),
                },
                body: {
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                },
            };
        case "ollama":
            return {
                url: resolveOllamaUrl(rawUrl),
                headers: {
                    "Content-Type": "application/json",
                    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                },
                body: {
                    model,
                    messages: [{ role: "user", content: prompt }],
                    stream: false,
                },
            };
        default:
            return {
                url: resolveOpenAIUrl(rawUrl),
                headers: {
                    "Content-Type": "application/json",
                    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                },
                body: {
                    model,
                    messages: [{ role: "user", content: prompt }],
                },
            };
    }
};

const readTextContent = (value: unknown): string => {
    if (typeof value === "string") {
        return value;
    }
    if (!value || typeof value !== "object") {
        return "";
    }
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") {
        return record.text;
    }
    if (Array.isArray(record.content)) {
        let text = "";
        for (const item of record.content) {
            text += readTextContent(item);
        }
        return text;
    }
    if (Array.isArray(record.parts)) {
        let text = "";
        for (const part of record.parts) {
            text += readTextContent(part);
        }
        return text;
    }
    return "";
};

const parseOpenAIResponse = (data: any): string => {
    const choice = data?.choices?.[0];
    const messageContent = choice?.message?.content;
    if (typeof messageContent === "string") {
        return messageContent;
    }
    if (Array.isArray(messageContent)) {
        let text = "";
        for (const part of messageContent) {
            if (part?.type === "text" && typeof part.text === "string") {
                text += part.text;
            }
        }
        if (text) {
            return text;
        }
    }
    if (typeof choice?.text === "string") {
        return choice.text;
    }
    if (typeof choice?.message?.text === "string") {
        return choice.message.text;
    }
    return "";
};

const parseAnthropicResponse = (data: any): string => {
    if (!Array.isArray(data?.content)) {
        return "";
    }
    let text = "";
    for (const block of data.content) {
        if (block?.type === "text" && typeof block.text === "string") {
            text += block.text;
        }
    }
    return text;
};

const parseGeminiResponse = (data: any): string => {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
        return "";
    }
    let text = "";
    for (const part of parts) {
        if (typeof part?.text === "string") {
            text += part.text;
        }
    }
    return text;
};

const parseOllamaResponse = (data: any): string => {
    if (typeof data?.message?.content === "string") {
        return data.message.content;
    }
    if (typeof data?.response === "string") {
        return data.response;
    }
    return "";
};

const parseGenericResponse = (data: any): string => {
    const direct = [
        data?.output,
        data?.response,
        data?.result,
        data?.text,
        data?.content,
        data?.data?.output,
        data?.data?.text,
    ];
    for (const item of direct) {
        const text = readTextContent(item);
        if (text.trim()) {
            return text;
        }
    }
    return "";
};

const parseResponseText = (
    format: Exclude<CustomAIApiFormat, "auto">,
    data: any,
): string => {
    const parsers: Array<() => string> = [];
    switch (format) {
        case "anthropic":
            parsers.push(() => parseAnthropicResponse(data));
            break;
        case "gemini":
            parsers.push(() => parseGeminiResponse(data));
            break;
        case "ollama":
            parsers.push(() => parseOllamaResponse(data));
            break;
        default:
            parsers.push(() => parseOpenAIResponse(data));
            break;
    }
    parsers.push(
        () => parseOpenAIResponse(data),
        () => parseAnthropicResponse(data),
        () => parseGeminiResponse(data),
        () => parseOllamaResponse(data),
        () => parseGenericResponse(data),
    );

    for (const parser of parsers) {
        const text = parser().trim();
        if (text) {
            return text;
        }
    }
    return "";
};

const parseErrorMessage = (data: any, status: number, statusText: string): string => {
    const message = data?.error?.message
        ?? data?.error?.msg
        ?? data?.message
        ?? data?.detail
        ?? (typeof data?.error === "string" ? data.error : undefined);
    if (typeof message === "string" && message.trim()) {
        return message;
    }
    return `HTTP ${status} ${statusText}`;
};

export interface StreamCustomAIOptions extends CustomAIRequestOptions {
    onChunk: (chunk: string) => void;
}

/** 从 SSE 行中提取 delta 文本，兼容 OpenAI / Anthropic / Ollama / Gemini 流格式 */
const parseStreamChunk = (format: Exclude<CustomAIApiFormat, "auto">, line: string): string => {
    const dataPrefix = "data: ";
    if (line.startsWith(dataPrefix)) {
        const raw = line.slice(dataPrefix.length).trim();
        if (raw === "[DONE]") return "";
        try {
            const obj = JSON.parse(raw);
            switch (format) {
                case "anthropic":
                    return obj?.delta?.text ?? "";
                case "gemini":
                    return obj?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                default:
                    return obj?.choices?.[0]?.delta?.content ?? "";
            }
        } catch { return ""; }
    }
    // Ollama: newline-delimited JSON (no "data:" prefix)
    if (format === "ollama" && line.trim()) {
        try {
            const obj = JSON.parse(line);
            return obj?.message?.content ?? obj?.response ?? "";
        } catch { return ""; }
    }
    return "";
};

/** 流式请求 body（在 non-stream body 上加 stream: true） */
const buildStreamBody = (
    format: Exclude<CustomAIApiFormat, "auto">,
    body: Record<string, unknown>,
): Record<string, unknown> => {
    switch (format) {
        case "anthropic":
            return { ...body, stream: true };
        case "gemini":
            // Gemini 流式需要换用 streamGenerateContent 端点，URL 已在 resolveGeminiUrl 中处理
            return body;
        case "ollama":
            return { ...body, stream: true };
        default:
            return { ...body, stream: true };
    }
};

/** 将 Gemini URL 从 generateContent 换为 streamGenerateContent */
const toGeminiStreamUrl = (url: string): string =>
    url.replace(/:generateContent(\?|$)/, ":streamGenerateContent$1");

/** 流式调用自定义 AI，每个 token 通过 onChunk 回调，全部结束后 resolve */
export const streamCustomAI = async (options: StreamCustomAIOptions): Promise<void> => {
    const rawUrl = options.url?.trim();
    if (!rawUrl) throw new Error("API URL is required.");

    const format = resolveFormat(rawUrl, options.format);
    const model = resolveModel(format, options.model);
    const request = buildRequest(format, options.prompt, model, rawUrl, options.apiKey?.trim());

    const streamUrl = format === "gemini" ? toGeminiStreamUrl(request.url) : request.url;
    const streamBody = buildStreamBody(format, request.body as Record<string, unknown>);

    const resp = await fetch(streamUrl, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(streamBody),
        signal: options.signal,
    });

    if (!resp.ok) {
        const rawText = await resp.text().catch(() => "");
        let data: any;
        try { data = rawText ? JSON.parse(rawText) : {}; } catch { data = {}; }
        throw new Error(parseErrorMessage(data, resp.status, resp.statusText));
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No response body.");

    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
            const chunk = parseStreamChunk(format, line);
            if (chunk) options.onChunk(chunk);
        }
    }
    // flush remaining buffer
    if (buf.trim()) {
        const chunk = parseStreamChunk(format, buf);
        if (chunk) options.onChunk(chunk);
    }
};

/** 调用自定义 AI HTTP 接口，自动适配 OpenAI / Anthropic / Gemini / Ollama 等格式 */
export const callCustomAI = async (options: CustomAIRequestOptions): Promise<string> => {
    const rawUrl = options.url?.trim();
    if (!rawUrl) {
        throw new Error("API URL is required.");
    }

    const format = resolveFormat(rawUrl, options.format);
    const model = resolveModel(format, options.model);
    const request = buildRequest(format, options.prompt, model, rawUrl, options.apiKey?.trim());

    const resp = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: options.signal,
    });

    const rawText = await resp.text();
    let data: any;
    try {
        data = rawText ? JSON.parse(rawText) : {};
    } catch {
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }
        return rawText.trim();
    }

    if (!resp.ok) {
        throw new Error(parseErrorMessage(data, resp.status, resp.statusText));
    }

    const result = parseResponseText(format, data);
    if (!result) {
        throw new Error("Empty response from AI API.");
    }
    return result;
};
