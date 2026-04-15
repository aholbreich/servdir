// Finds all mermaid fenced code blocks rendered by markdown-it and renders them
// as diagrams in-place. Also adds a collapsible raw source panel per diagram.

import mermaid from 'mermaid';

const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre code.language-mermaid'));

if (blocks.length > 0) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
  });

  let idCounter = 0;

  for (const block of blocks) {
    const source = block.textContent ?? '';
    const pre = block.closest('pre');
    if (!pre || !source.trim()) continue;

    const diagramId = `mermaid-${idCounter++}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-block';

    let svg: string;
    try {
      const result = await mermaid.render(diagramId, source);
      svg = result.svg;
    } catch {
      const errorEl = document.createElement('div');
      errorEl.className = 'mermaid-error';
      errorEl.textContent = 'Diagram could not be rendered. Check the syntax below.';
      wrapper.appendChild(errorEl);
      wrapper.appendChild(buildSourcePanel(source, true));
      pre.replaceWith(wrapper);
      continue;
    }

    const diagramEl = document.createElement('div');
    diagramEl.className = 'mermaid-diagram';
    diagramEl.innerHTML = svg;

    wrapper.appendChild(diagramEl);
    wrapper.appendChild(buildSourcePanel(source, false));
    pre.replaceWith(wrapper);
  }
}

function buildSourcePanel(source: string, expanded: boolean): HTMLElement {
  const details = document.createElement('details');
  details.className = 'mermaid-source';
  if (expanded) details.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Show source';
  details.appendChild(summary);

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = source;
  pre.appendChild(code);
  details.appendChild(pre);

  return details;
}
