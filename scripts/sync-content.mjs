import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CONTENT_FILE = path.join(ROOT, 'content', 'site-content.md');

function pageConfig(file, options = {}) {
  const isEn = file.startsWith('en/');
  const mainJs = isEn ? '  <script src="../js/main.js"></script>' : '  <script src="js/main.js"></script>';
  const footerStart = '  <footer class="footer">';

  return {
    file,
    sections: [
      { key: 'head.copy', start: '  <title>', end: '  <link rel="preconnect" href="https://fonts.googleapis.com">' },
      { key: 'nav', start: options.navStart ?? '  <nav class="navbar"', end: options.navEnd ?? options.headerStart ?? options.mainStart },
      { key: 'header', start: options.headerStart, end: options.mainStart },
      { key: 'main', start: options.mainStart, end: options.ctaStart ?? footerStart },
      ...(options.ctaStart ? [{ key: 'cta', start: options.ctaStart, end: footerStart }] : []),
      { key: 'footer', start: footerStart, end: mainJs },
      ...(options.inlineScriptStart ? [{ key: 'inline-script', start: options.inlineScriptStart, end: '</body>' }] : []),
    ].filter((section) => section.start && section.end),
  };
}

const PAGES = [
  {
    file: 'index.html',
    sections: [
      { key: 'head.copy', start: '  <title>', end: '  <!-- Fonts -->' },
      { key: 'nav', start: '  <!-- Navigation -->', end: '  <!-- Hero -->' },
      { key: 'hero', start: '  <!-- Hero -->', end: '  <!-- Stats -->' },
      { key: 'stats', start: '  <!-- Stats -->', end: '  <!-- Services Overview -->' },
      { key: 'services-overview', start: '  <!-- Services Overview -->', end: '  <!-- Featured Cases -->' },
      { key: 'featured-cases', start: '  <!-- Featured Cases -->', end: '  <!-- Testimonials -->' },
      { key: 'testimonials', start: '  <!-- Testimonials -->', end: '  <!-- CTA -->' },
      { key: 'cta', start: '  <!-- CTA -->', end: '  <!-- Footer -->' },
      { key: 'footer', start: '  <!-- Footer -->', end: '  <script src="js/main.js"></script>' },
    ],
  },
  pageConfig('services.html', {
    headerStart: '  <!-- Page Header -->',
    mainStart: '  <!-- 1. Undergraduate English Programs -->',
    ctaStart: '  <!-- CTA -->',
  }),
  pageConfig('cases.html', {
    navStart: '  <!-- Navigation -->',
    navEnd: '  <!-- Page Header -->',
    headerStart: '  <!-- Page Header -->',
    mainStart: '  <!-- Cases -->',
    ctaStart: '  <!-- CTA -->',
  }),
  pageConfig('team.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    ctaStart: '  <!-- CTA -->',
  }),
  pageConfig('blog.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    ctaStart: '  <section class="cta-section">',
  }),
  pageConfig('faq.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    ctaStart: '  <section class="cta-section">',
  }),
  pageConfig('contact.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    inlineScriptStart: '  <script>',
  }),
  {
    file: 'en/index.html',
    sections: [
      { key: 'head.copy', start: '  <title>', end: '  <link rel="preconnect" href="https://fonts.googleapis.com">' },
      { key: 'nav', start: '  <nav class="navbar"', end: '  <!-- Hero -->' },
      { key: 'hero', start: '  <!-- Hero -->', end: '  <!-- Stats -->' },
      { key: 'stats', start: '  <!-- Stats -->', end: '  <!-- Services -->' },
      { key: 'services-overview', start: '  <!-- Services -->', end: '  <!-- Featured Cases -->' },
      { key: 'featured-cases', start: '  <!-- Featured Cases -->', end: '  <!-- Testimonials -->' },
      { key: 'testimonials', start: '  <!-- Testimonials -->', end: '  <!-- CTA -->' },
      { key: 'cta', start: '  <!-- CTA -->', end: '  <!-- Footer -->' },
      { key: 'footer', start: '  <!-- Footer -->', end: '  <script src="../js/main.js"></script>' },
    ],
  },
  pageConfig('en/services.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <!-- 1. Undergraduate English Programs -->',
    ctaStart: '  <section class="cta-section">',
  }),
  pageConfig('en/cases.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    ctaStart: '  <section class="cta-section">',
  }),
  pageConfig('en/team.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    ctaStart: '  <section class="cta-section">',
  }),
  pageConfig('en/blog.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    ctaStart: '  <section class="cta-section">',
  }),
  pageConfig('en/faq.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    ctaStart: '  <section class="cta-section">',
  }),
  pageConfig('en/contact.html', {
    headerStart: '  <header class="page-header">',
    mainStart: '  <section class="section">',
    inlineScriptStart: '  <script>',
  }),
];

function getLineEnding(source) {
  return source.includes('\r\n') ? '\r\n' : '\n';
}

function normalizeForMarkdown(source) {
  return source.replace(/\r\n/g, '\n').replace(/\s+$/u, '');
}

function restoreLineEnding(source, lineEnding) {
  return source.replace(/\n/g, lineEnding);
}

function sliceBetween(source, start, end, file, key) {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) {
    throw new Error(`Could not find start marker for ${file} -> ${key}`);
  }

  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex === -1) {
    throw new Error(`Could not find end marker for ${file} -> ${key}`);
  }

  return {
    startIndex,
    endIndex,
    value: source.slice(startIndex, endIndex),
  };
}

function extractSections() {
  return PAGES.map((page) => {
    const absPath = path.join(ROOT, page.file);
    const source = fs.readFileSync(absPath, 'utf8');

    return {
      file: page.file,
      sections: page.sections.map((section) => ({
        key: section.key,
        value: normalizeForMarkdown(sliceBetween(source, section.start, section.end, page.file, section.key).value),
      })),
    };
  });
}

function renderMarkdown(pages) {
  const lines = [
    '# Site Content',
    '',
    '> 这个文件集中维护网站文案区块。',
    '> 修改完成后运行 `npm run content:apply`，或运行 `npm run content:watch` 自动同步到 HTML。',
    '> 需要重新从当前页面抽取时，运行 `npm run content:extract`。',
    '',
  ];

  for (const page of pages) {
    lines.push(`## ${page.file}`, '');
    for (const section of page.sections) {
      lines.push(`### ${section.key}`, '```html', section.value, '```', '');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const pages = new Map();
  let currentFile = null;
  let currentKey = null;
  let inFence = false;
  let buffer = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentFile = line.slice(3).trim();
      if (!pages.has(currentFile)) {
        pages.set(currentFile, new Map());
      }
      currentKey = null;
      continue;
    }

    if (line.startsWith('### ')) {
      currentKey = line.slice(4).trim();
      continue;
    }

    if (line.startsWith('```')) {
      if (!inFence) {
        if (!currentFile || !currentKey) {
          throw new Error('Encountered fenced block before file/key heading.');
        }
        inFence = true;
        buffer = [];
      } else {
        pages.get(currentFile).set(currentKey, buffer.join('\n').replace(/\s+$/u, ''));
        inFence = false;
        buffer = [];
      }
      continue;
    }

    if (inFence) {
      buffer.push(line);
    }
  }

  if (inFence) {
    throw new Error('Unclosed code fence in content file.');
  }

  return pages;
}

function ensureAllSectionsExist(parsed) {
  for (const page of PAGES) {
    const pageSections = parsed.get(page.file);
    if (!pageSections) {
      throw new Error(`Missing page section in markdown: ${page.file}`);
    }

    for (const section of page.sections) {
      if (!pageSections.has(section.key)) {
        throw new Error(`Missing block in markdown: ${page.file} -> ${section.key}`);
      }
    }
  }
}

function applySections() {
  const parsed = parseMarkdown(fs.readFileSync(CONTENT_FILE, 'utf8'));
  ensureAllSectionsExist(parsed);

  for (const page of PAGES) {
    const absPath = path.join(ROOT, page.file);
    const original = fs.readFileSync(absPath, 'utf8');
    const lineEnding = getLineEnding(original);
    let updated = original;

    for (const section of page.sections) {
      const replacement = restoreLineEnding(parsed.get(page.file).get(section.key), lineEnding);
      const { startIndex, endIndex } = sliceBetween(updated, section.start, section.end, page.file, section.key);
      updated = `${updated.slice(0, startIndex)}${replacement}${lineEnding}${updated.slice(endIndex)}`;
    }

    if (updated !== original) {
      fs.writeFileSync(absPath, updated, 'utf8');
      console.log(`updated ${page.file}`);
    } else {
      console.log(`no change ${page.file}`);
    }
  }
}

function extractToMarkdown() {
  const markdown = renderMarkdown(extractSections());
  fs.writeFileSync(CONTENT_FILE, markdown, 'utf8');
  console.log(`wrote ${path.relative(ROOT, CONTENT_FILE)}`);
}

function watchContent() {
  console.log(`watching ${path.relative(ROOT, CONTENT_FILE)}`);
  let timer = null;

  fs.watch(CONTENT_FILE, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        applySections();
        console.log('synced from markdown');
      } catch (error) {
        console.error(error.message);
      }
    }, 150);
  });
}

const command = process.argv[2] ?? 'apply';

if (command === 'extract') {
  extractToMarkdown();
} else if (command === 'apply') {
  applySections();
} else if (command === 'watch') {
  watchContent();
} else {
  console.error('Usage: node scripts/sync-content.mjs [extract|apply|watch]');
  process.exit(1);
}
