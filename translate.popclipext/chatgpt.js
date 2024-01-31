"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actions = exports.getErrorInfo = void 0;
const axios_1 = require("axios");
// the extension keeps the message history in memory
const messages = [];
// reset the history
function reset() {
    messages.length = 0;
}
// get the content of the last `n` messages from the chat, trimmed and separated by double newlines
function getTranscript(n) {
    return messages.slice(-n).map((m) => m.content.trim()).join("\n\n");
}
// the main chat action
const chat = async (input, options) => {
    const openai = axios_1.default.create({
        baseURL: "https://api.openai.com/v1",
        headers: { Authorization: `Bearer ${options.apikey}` },
    });
    // always reset the history
    reset();
    // system
    messages.push({ role: "system", content: "You are a professional translation engine. Please translate the text into English without explanation." });
    // user
    messages.push({ role: "user", content: input.text });
    // send the whole message history to OpenAI
    try {
        const { data } = await openai.post("chat/completions", {
            model: options.model || "gpt-3.5-turbo",
            messages,
        });
        // add the response to the history
        messages.push(data.choices[0].message);
        // pasye just the responsw.
        popclip.pasteText(getTranscript(1));
    }
    catch (e) {
        popclip.showText(getErrorInfo(e));
    }
};
function getErrorInfo(error) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = error.response;
        //return JSON.stringify(response);
        return `Message from OpenAI (code ${response.status}): ${response.data.error.message}`;
    }
    else {
        return String(error);
    }
}
exports.getErrorInfo = getErrorInfo;
// export the actions
exports.actions = [{
    title: "Translate",
    code: chat
}];