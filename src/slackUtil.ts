/** Slack section block `text` fields are limited to 3000 characters. */
export const SLACK_SECTION_TEXT_MAX_CHARS = 3_000;

/** Escape characters that break Slack markdown or create unintended links. */
export function escapeSlackMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([*_`~])/g, '$1\u200b');
}

export function fitSlackSectionText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}
