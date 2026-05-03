import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  html: string;
}

export function ServiceDocumentationCard({ html }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const blocks = Array.from(
      el.querySelectorAll<HTMLElement>('pre code.language-mermaid'),
    );
    if (blocks.length === 0) return;

    let cancelled = false;

    async function renderDiagrams() {
      const { default: mermaid } = await import('mermaid');
      if (cancelled) return;

      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
      let idCounter = 0;

      for (const block of blocks) {
        if (cancelled) break;
        const source = block.textContent ?? '';
        const pre = block.closest('pre');
        if (!pre || !source.trim()) continue;

        const diagramId = `mermaid-${idCounter++}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-block';

        try {
          const result = await mermaid.render(diagramId, source);
          const diagramEl = document.createElement('div');
          diagramEl.className = 'mermaid-diagram';
          diagramEl.innerHTML = result.svg;
          wrapper.appendChild(diagramEl);
          wrapper.appendChild(buildSourcePanel(source, false));
        } catch {
          const errorEl = document.createElement('div');
          errorEl.className = 'mermaid-error';
          errorEl.textContent = 'Diagram could not be rendered. Check the syntax below.';
          wrapper.appendChild(errorEl);
          wrapper.appendChild(buildSourcePanel(source, true));
        }

        pre.replaceWith(wrapper);
      }
    }

    renderDiagrams();
    return () => { cancelled = true; };
  }, [html]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Documentation</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={contentRef}
          className="prose-catalog max-w-none leading-7"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardContent>
    </Card>
  );
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
