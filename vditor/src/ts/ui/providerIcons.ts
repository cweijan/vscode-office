// @ts-nocheck
import anthropicUrl from "../../assets/provider-icons/anthropic.ico";
import azureUrl from "../../assets/provider-icons/azure.ico";
import baiduUrl from "../../assets/provider-icons/baidu.ico";
import cohereUrl from "../../assets/provider-icons/cohere.ico";
import deepseekUrl from "../../assets/provider-icons/deepseek.ico";
import googleUrl from "../../assets/provider-icons/google.ico";
import groqUrl from "../../assets/provider-icons/groq.ico";
import huggingfaceUrl from "../../assets/provider-icons/huggingface.ico";
import lingyiUrl from "../../assets/provider-icons/lingyi.png";
import minimaxUrl from "../../assets/provider-icons/minimax.ico";
import mistralUrl from "../../assets/provider-icons/mistral.ico";
import moonshotUrl from "../../assets/provider-icons/moonshot.ico";
import nvidiaUrl from "../../assets/provider-icons/nvidia.ico";
import ollamaUrl from "../../assets/provider-icons/ollama.png";
import openaiUrl from "../../assets/provider-icons/openai.svg";
import perplexityUrl from "../../assets/provider-icons/perplexity.ico";
import siliconflowUrl from "../../assets/provider-icons/siliconflow.png";
import xaiUrl from "../../assets/provider-icons/xai.ico";
import zhipuaiUrl from "../../assets/provider-icons/zhipuai.png";

export const PROVIDER_ICONS: Record<string, string> = {
    openai:      openaiUrl,
    anthropic:   anthropicUrl,
    google:      googleUrl,
    gemini:      googleUrl,
    groq:        groqUrl,
    ollama:      ollamaUrl,
    mistral:     mistralUrl,
    deepseek:    deepseekUrl,
    cohere:      cohereUrl,
    azure:       azureUrl,
    perplexity:  perplexityUrl,
    moonshot:    moonshotUrl,
    nvidia:      nvidiaUrl,
    huggingface: huggingfaceUrl,
    xai:         xaiUrl,
    siliconflow: siliconflowUrl,
    silicon:     siliconflowUrl,
    zhipuai:     zhipuaiUrl,
    baidu:       baiduUrl,
    ernie:       baiduUrl,
    lingyi:      lingyiUrl,
    minimax:     minimaxUrl,
    minimaxi:    minimaxUrl,
};
