// #popclip
// name: TransReplace
// icon: transreplace.png
// identifier: tech.mazhen.popclip.extension.TransReplace
// description: Send the selected text to ai, translate it into English and replace the original text.
// app: { name: TransReplace, link: 'https://mazhen.tech' }
// popclipVersion: 4586
// keywords: openai chatgpt
// entitlements: [network]

import axios from "axios";

export const options = [
    {
        identifier: "apikey",
        label: "API Key",
        type: "secret",
        description:
            "Obtain an API key from: https://siliconflow.cn",
    },
    {
        identifier: "model",
        label: "Model",
        type: "multiple",
        defaultValue: "Qwen/Qwen2.5-7B-Instruct",
        values: ["Qwen/Qwen2.5-7B-Instruct", "Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-V2.5"],
    },
    {
        identifier: "textMode",
        label: "Response Handling",
        type: "multiple",
        values: ["append", "replace", "copy"],
        valueLabels: ["Append", "Replace", "Copy"],
        defaultValue: "replace",
        description:
            "Append the response, replace the selected text, or copy to clipboard.",
    }
] as const;

type Options = InferOptions<typeof options>;

// typescript interfaces for OpenAI API
interface Message {
    role: "user" | "system" | "assistant";
    content: string;
}
interface ResponseData {
    choices: [{ message: Message }];
}
interface Response {
    data: ResponseData;
}

// the extension keeps the message history in memory
const messages: Array<Message> = [];

// the last chat date
let lastChat: Date = new Date();

// reset the history
function reset() {
    print("Resetting chat history");
    messages.length = 0;
}

// get the content of the last `n` messages from the chat, trimmed and separated by double newlines
function getTranscript(n: number): string {
    return messages
        .slice(-n)
        .map((m) => m.content.trim())
        .join("\n\n");
}

// the main chat action
const chat: ActionFunction<Options> = async (input, options) => {
    const openai = axios.create({
        baseURL: `https://api.siliconflow.cn/v1`,
        headers: { Authorization: `Bearer ${options.apikey}` },
    });

    reset();

    // add the system message to the start of the conversation
    messages.push({ role: "system", content: "You are a professional translation engine. Please translate the text into English without explanation." });

    // add the new message to the history
    messages.push({ role: "user", content: input.text.trim() });

    // send the whole message history to OpenAI
    try {
        const { data }: Response = await openai.post("chat/completions", {
            model: options.model || "Qwen/Qwen2.5-7B-Instruct",
            messages,
        });

        // add the response to the history
        messages.push(data.choices[0].message);
        lastChat = new Date();

        // copy?
        let copy = options.textMode === "copy" || popclip.modifiers.shift;

        // append or replace?
        let replace = options.textMode === "replace";
        if (popclip.modifiers.option) {
            // if holding option, toggle append mode
            replace = !replace;
        }

        if (copy) {
            popclip.copyText(getTranscript(1));
        } else if (replace) {
            popclip.pasteText(getTranscript(1));
        } else {
            popclip.pasteText(getTranscript(2));
            popclip.showSuccess();
        }
    } catch (e) {
        popclip.showText(getErrorInfo(e));
    }
};

export function getErrorInfo(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as any).response;
        return `Message from OpenAI (code ${response.status}): ${response.data.error.message}`;
    } else {
        return String(error);
    }
}

// export the actions
export const actions: Action<Options>[] = [
    {
        title: "Chat",
        code: chat,
    }
];