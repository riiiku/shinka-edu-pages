import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'SITE_CONTENT_EXPORT.md');

const PAGES = [
  'index.html',
  'services.html',
  'cases.html',
  'team.html',
  'blog.html',
  'faq.html',
  'contact.html',
  'en/index.html',
  'en/services.html',
  'en/cases.html',
  'en/team.html',
  'en/blog.html',
  'en/faq.html',
  'en/contact.html',
];

const ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '(c)',
  reg: '(R)',
  mdash: '-',
  ndash: '-',
  hellip: '...',
};

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }
    return ENTITY_MAP[normalized] ?? match;
  });
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);
  return match ? decodeEntities(match[2] ?? match[3] ?? match[4] ?? '').trim() : '';
}

function getTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanInline(match[1]) : '';
}

function getMeta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (getAttribute(tag, 'name').toLowerCase() === name.toLowerCase()) {
      return getAttribute(tag, 'content');
    }
  }
  return '';
}

function cleanInline(value) {
  return decodeEntities(
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function normalizeMarkdown(markdown) {
  return markdown
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function bodyToMarkdown(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;

  body = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  body = body.replace(/<([a-z0-9]+)\b[^>]*data-count\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const count = getAttribute(match, 'data-count');
    const suffix = getAttribute(match, 'data-suffix');
    return `\n${count}${suffix}\n`;
  });

  body = body.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt = getAttribute(tag, 'alt');
    const src = getAttribute(tag, 'src');
    if (!alt && !src) return '';
    if (!src) return alt;
    return alt ? `![${alt}](${src})` : `![](${src})`;
  });

  body = body.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, content) => {
    const text = cleanInline(content);
    const href = getAttribute(`<a ${attrs}>`, 'href');
    if (!text) return '';
    if (!href || href === '#') return text;
    return `[${text}](${href})`;
  });

  body = body
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n\n### ${cleanInline(text)}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n\n#### ${cleanInline(text)}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n\n##### ${cleanInline(text)}\n\n`)
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n\n###### ${cleanInline(text)}\n\n`)
    .replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, (_, text) => `\n\n**${cleanInline(text)}**\n\n`)
    .replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, (_, text) => `\n\n**${cleanInline(text)}**\n\n`);

  body = body
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => {
      const item = cleanInline(text);
      return item ? `\n- ${item}` : '';
    })
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => {
      const paragraph = cleanInline(text);
      return paragraph ? `\n\n${paragraph}\n\n` : '';
    })
    .replace(/<label\b[^>]*>([\s\S]*?)<\/label>/gi, (_, text) => {
      const label = cleanInline(text);
      return label ? `\n- Form field: ${label}` : '';
    })
    .replace(/<option\b[^>]*>([\s\S]*?)<\/option>/gi, (_, text) => {
      const option = cleanInline(text);
      return option ? `\n  - Option: ${option}` : '';
    })
    .replace(/<input\b[^>]*>/gi, (tag) => {
      const placeholder = getAttribute(tag, 'placeholder');
      return placeholder ? `\n  - Placeholder: ${placeholder}` : '';
    })
    .replace(/<textarea\b([^>]*)>[\s\S]*?<\/textarea>/gi, (match, attrs) => {
      const placeholder = getAttribute(`<textarea ${attrs}>`, 'placeholder');
      return placeholder ? `\n  - Placeholder: ${placeholder}` : '';
    })
    .replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, (_, text) => {
      const button = cleanInline(text);
      return button ? `\n\nButton: ${button}\n\n` : '';
    });

  body = body
    .replace(/<\/(div|section|article|header|footer|nav|main|form|ul|ol|table|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return normalizeMarkdown(decodeEntities(body).replace(/\s+\n/g, '\n'));
}

function renderPage(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const title = getTitle(html);
  const description = getMeta(html, 'description');
  const keywords = getMeta(html, 'keywords');
  const visibleContent = bodyToMarkdown(html);

  const lines = [`## ${file}`, ''];
  if (title) lines.push(`**Title:** ${title}`, '');
  if (description) lines.push(`**Description:** ${description}`, '');
  if (keywords) lines.push(`**Keywords:** ${keywords}`, '');
  lines.push('**Visible Page Content**', '', visibleContent, '');
  return lines.join('\n');
}

const markdown = [
  '# Xinjiaedu Website Content Export',
  '',
  `Generated from current HTML files in \`${path.basename(ROOT)}\`.`,
  `Export time: ${new Date().toISOString()}`,
  '',
  'This file is a readable content inventory. It includes SEO titles/descriptions/keywords and visible page content from every Chinese and English HTML page.',
  '',
  ...PAGES.map(renderPage),
].join('\n').trimEnd() + '\n';

fs.writeFileSync(OUTPUT, markdown, 'utf8');
console.log(`wrote ${path.relative(ROOT, OUTPUT)}`);
