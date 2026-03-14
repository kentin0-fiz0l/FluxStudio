/**
 * BlogPost — Renders an individual blog article with SEO metadata
 *
 * Phase 7: SEO blog engine
 * Includes a minimal Markdown renderer (no external dependencies).
 */

import { useParams, Link } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';
import { getArticleBySlug } from '../content/articles';

// ---------------------------------------------------------------------------
// Minimal Markdown renderer
// Supports: # headings, **bold**, [links](url), - lists, ```code blocks```, paragraphs
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(
        <pre key={key++} className="bg-neutral-800 rounded-lg p-4 overflow-x-auto my-4 text-sm text-neutral-200">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2]);
      if (level === 1) {
        nodes.push(<h1 key={key++} className="text-3xl sm:text-4xl font-bold mt-8 mb-4">{text}</h1>);
      } else if (level === 2) {
        nodes.push(<h2 key={key++} className="text-2xl font-semibold mt-8 mb-3">{text}</h2>);
      } else {
        nodes.push(<h3 key={key++} className="text-xl font-semibold mt-6 mb-2">{text}</h3>);
      }
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(
          <li key={items.length} className="ml-4 pl-1">
            {renderInline(lines[i].replace(/^[-*]\s+/, ''))}
          </li>,
        );
        i++;
      }
      nodes.push(<ul key={key++} className="list-disc pl-4 my-4 space-y-1 text-neutral-300">{items}</ul>);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(
          <li key={items.length} className="ml-4 pl-1">
            {renderInline(lines[i].replace(/^\d+\.\s+/, ''))}
          </li>,
        );
        i++;
      }
      nodes.push(<ol key={key++} className="list-decimal pl-4 my-4 space-y-1 text-neutral-300">{items}</ol>);
      continue;
    }

    // Paragraph (default)
    nodes.push(<p key={key++} className="my-4 text-neutral-300 leading-relaxed">{renderInline(line)}</p>);
    i++;
  }

  return nodes;
}

/** Render inline markdown: **bold** and [links](url) */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match **bold** and [text](url)
  const regex = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partKey = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      parts.push(<strong key={partKey++} className="font-semibold text-white">{match[2]}</strong>);
    } else if (match[3] && match[4]) {
      // Link
      const href = match[4];
      const isExternal = href.startsWith('http');
      if (isExternal) {
        parts.push(
          <a key={partKey++} href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
            {match[3]}
          </a>,
        );
      } else {
        parts.push(
          <Link key={partKey++} to={href} className="text-blue-400 hover:underline">
            {match[3]}
          </Link>,
        );
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

// ---------------------------------------------------------------------------
// BlogPost component
// ---------------------------------------------------------------------------

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;

  if (!article) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <SEOHead title="Article Not Found" noindex />
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Article not found</h1>
          <p className="text-neutral-400 mb-8">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/blog"
            className="text-blue-400 hover:underline"
          >
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: {
      '@type': 'Organization',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Flux Studio',
      url: 'https://fluxstudio.art',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://fluxstudio.art/blog/${article.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SEOHead
        title={article.title}
        description={article.description}
        canonicalUrl={`https://fluxstudio.art/blog/${article.slug}`}
        ogType="article"
        structuredData={structuredData}
      />

      <header className="border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text"
          >
            FluxStudio
          </Link>
          <Link to="/blog" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Blog
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400"
              >
                {tag}
              </span>
            ))}
          </div>
          <time className="text-sm text-neutral-500" dateTime={article.date}>
            {new Date(article.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        <article className="prose-invert">
          {renderMarkdown(article.content)}
        </article>

        {/* CTAs */}
        <div className="mt-16 border-t border-neutral-800 pt-10 flex flex-col sm:flex-row gap-4">
          <Link
            to="/try"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            Try FluxStudio free
          </Link>
          <Link
            to="/templates"
            className="inline-flex items-center justify-center px-6 py-3 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 rounded-xl transition-all"
          >
            Browse templates
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-10">
          <Link to="/blog" className="text-sm text-neutral-400 hover:text-white transition-colors">
            &larr; All articles
          </Link>
        </div>
      </main>
    </div>
  );
}
