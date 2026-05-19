import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders as a span by default with the label variant', () => {
    const html = renderToStaticMarkup(<Chip>hello</Chip>);
    expect(html).toContain('<span');
    expect(html).toContain('data-slot="chip"');
    expect(html).toContain('data-variant="label"');
    expect(html).toContain('rounded-full');
    expect(html).toContain('hello');
  });

  it('renders the count variant with compact styling', () => {
    const html = renderToStaticMarkup(<Chip variant="count">3</Chip>);
    expect(html).toContain('data-variant="count"');
    expect(html).toContain('text-xs');
    expect(html).toContain('px-1.5');
  });

  it('renders the icon-button variant via asChild (button element)', () => {
    const html = renderToStaticMarkup(
      <Chip variant="icon-button" asChild>
        <button type="button" aria-label="filter">i</button>
      </Chip>,
    );
    expect(html).toMatch(/<button\b[^>]*>/);
    expect(html).toContain('data-variant="icon-button"');
    expect(html).toContain('size-7');
    expect(html).toContain('aria-label="filter"');
  });

  it('renders the icon-link variant via asChild (anchor element)', () => {
    const html = renderToStaticMarkup(
      <Chip variant="icon-link" asChild>
        <a href="https://example.com" aria-label="open">o</a>
      </Chip>,
    );
    expect(html).toMatch(/<a\b[^>]*>/);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('data-variant="icon-link"');
    expect(html).toContain('size-9');
  });

  it('merges caller className with the variant classes', () => {
    const html = renderToStaticMarkup(<Chip className="custom-extra">x</Chip>);
    expect(html).toContain('custom-extra');
    expect(html).toContain('rounded-full');
  });
});
