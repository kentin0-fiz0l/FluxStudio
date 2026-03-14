/**
 * BlogList — Lists all blog articles with SEO metadata
 *
 * Phase 7: SEO blog engine
 */

import { Link } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';
import { articles } from '../content/articles';

const BLOG_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'FluxStudio Blog',
  description:
    'Guides, tips, and insights on marching band drill design, formation spacing, AI-powered design tools, and more.',
  url: 'https://fluxstudio.art/blog',
  publisher: {
    '@type': 'Organization',
    name: 'Flux Studio',
    url: 'https://fluxstudio.art',
  },
};

export default function BlogList() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SEOHead
        title="Blog"
        description="Guides, tips, and insights on marching band drill design, formation spacing, AI-powered design tools, and more."
        canonicalUrl="https://fluxstudio.art/blog"
        structuredData={BLOG_STRUCTURED_DATA}
      />

      <header className="border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text"
          >
            FluxStudio
          </Link>
          <nav className="flex items-center gap-6 text-sm text-neutral-400">
            <Link to="/templates" className="hover:text-white transition-colors">
              Templates
            </Link>
            <Link to="/try" className="hover:text-white transition-colors">
              Try Free
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-lg text-neutral-400 mb-12">
          Guides and insights on drill design, formation techniques, and marching arts technology.
        </p>

        <div className="space-y-10">
          {articles.map((article) => (
            <article key={article.slug} className="group">
              <Link to={`/blog/${article.slug}`} className="block">
                <div className="flex flex-wrap gap-2 mb-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl font-semibold group-hover:text-blue-400 transition-colors mb-2">
                  {article.title}
                </h2>
                <p className="text-neutral-400 mb-2">{article.description}</p>
                <time className="text-sm text-neutral-500" dateTime={article.date}>
                  {new Date(article.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
