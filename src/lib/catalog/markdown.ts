import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

export function renderMarkdown(input: string): string {
  return md.render(input);
}
