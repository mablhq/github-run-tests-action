"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLACK_SECTION_TEXT_MAX_CHARS = void 0;
exports.escapeSlackMarkdown = escapeSlackMarkdown;
exports.fitSlackSectionText = fitSlackSectionText;
exports.SLACK_SECTION_TEXT_MAX_CHARS = 3_000;
function escapeSlackMarkdown(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/([*_`~])/g, '$1\u200b');
}
function fitSlackSectionText(text, maxChars) {
    if (text.length <= maxChars) {
        return text;
    }
    return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}
