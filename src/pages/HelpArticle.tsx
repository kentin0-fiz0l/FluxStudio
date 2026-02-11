/**
 * HelpArticle - Individual Help Article Page
 *
 * Displays a single help article with:
 * - Markdown-rendered content
 * - Navigation breadcrumbs
 * - Related articles sidebar
 * - Search functionality
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  Clock,
  Calendar,
  Book,
  ArrowLeft,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getArticleById, getRelatedArticles, searchArticles } from '@/content/help-articles';

// Simple markdown-like renderer
function renderContent(content: string): JSX.Element[] {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag key={elements.length} className={listType === 'ul' ? 'list-disc pl-6 space-y-1 my-4' : 'list-decimal pl-6 space-y-1 my-4'}>
          {listItems.map((item, i) => (
            <li key={i} className="text-neutral-700 dark:text-neutral-300">{renderInline(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={elements.length} className="overflow-x-auto my-4">
          <table className="min-w-full border border-neutral-200 dark:border-neutral-700">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800">
                {tableRows[0]?.map((cell, i) => (
                  <th key={i} className="px-4 py-2 text-left text-sm font-semibold border-b border-neutral-200 dark:border-neutral-700">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(2).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-neutral-200 dark:border-neutral-700">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-2 text-sm">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={elements.length} className="bg-neutral-900 text-neutral-100 rounded-lg p-4 overflow-x-auto my-4 text-sm">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      flushList();
      if (!inTable) {
        inTable = true;
      }
      const cells = line.split('|').filter(c => c.trim() !== '');
      if (!line.includes('---')) {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headers
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={elements.length} className="text-3xl font-bold text-neutral-900 dark:text-white mt-8 mb-4 first:mt-0">
          {line.slice(2)}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={elements.length} className="text-2xl font-semibold text-neutral-900 dark:text-white mt-8 mb-3">
          {line.slice(3)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="text-lg font-semibold text-neutral-900 dark:text-white mt-6 mb-2">
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Lists
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const numberMatch = line.match(/^\d+\.\s+(.+)$/);

    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(bulletMatch[1]);
      continue;
    }

    if (numberMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(numberMatch[1]);
      continue;
    }

    // Flush list if we encounter a non-list line
    if (listItems.length > 0 && line.trim() !== '') {
      flushList();
    }

    // Empty line
    if (line.trim() === '') {
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={elements.length} className="text-neutral-700 dark:text-neutral-300 my-3 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  flushTable();

  return elements;
}

// Render inline elements (bold, italic, code, links)
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Links
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
      codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
      linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;

    // Add text before match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === 'bold') {
      parts.push(
        <strong key={keyIndex++} className="font-semibold">
          {first.match[1]}
        </strong>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === 'code') {
      parts.push(
        <code key={keyIndex++} className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-sm font-mono">
          {first.match[1]}
        </code>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === 'link') {
      parts.push(
        <a
          key={keyIndex++}
          href={first.match[2]}
          className="text-primary-600 hover:text-primary-700 underline"
          target={first.match[2].startsWith('http') ? '_blank' : undefined}
          rel={first.match[2].startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {first.match[1]}
        </a>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function HelpArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);

  const article = useMemo(() => {
    if (!articleId) return null;
    return getArticleById(articleId);
  }, [articleId]);

  const relatedArticles = useMemo(() => {
    if (!articleId) return [];
    return getRelatedArticles(articleId, 3);
  }, [articleId]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchArticles(searchQuery).slice(0, 5);
  }, [searchQuery]);

  // Scroll to top when article changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setFeedback(null);
  }, [articleId]);

  if (!article) {
    return (
      <DashboardLayout
        user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
        breadcrumbs={[
          { label: 'Help Center', path: '/help' },
          { label: 'Article Not Found' },
        ]}
        onLogout={logout}
        showSearch={false}
      >
        <div className="p-6 max-w-4xl mx-auto text-center py-20">
          <Book className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Article Not Found
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Button onClick={() => navigate('/help')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Help Center
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[
        { label: 'Help Center', path: '/help' },
        { label: article.category, path: `/help?category=${article.categoryId}` },
        { label: article.title },
      ]}
      onLogout={logout}
      showSearch={false}
    >
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3"
          >
            {/* Back Link & Search */}
            <div className="flex items-center justify-between mb-6">
              <Link
                to="/help"
                className="inline-flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Help Center
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>

            {/* Search Bar (conditionally shown) */}
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search help articles..."
                    className="pl-10"
                    autoFocus
                  />
                </div>

                {searchResults.length > 0 && (
                  <Card className="mt-2 absolute z-10 w-full max-w-2xl">
                    <CardContent className="p-2">
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          to={`/help/article/${result.slug}`}
                          onClick={() => {
                            setSearchQuery('');
                            setShowSearch(false);
                          }}
                          className="block p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <p className="font-medium text-sm">{result.title}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{result.summary}</p>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Article Content */}
            <article className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {article.readingTime} min read
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Updated {new Date(article.lastUpdated).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Content */}
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                {renderContent(article.content)}
              </div>

              {/* Feedback */}
              <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Was this article helpful?
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant={feedback === 'helpful' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFeedback('helpful')}
                    className="gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Yes
                  </Button>
                  <Button
                    variant={feedback === 'not-helpful' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFeedback('not-helpful')}
                    className="gap-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    No
                  </Button>
                </div>
                {feedback && (
                  <p className="text-sm text-neutral-500 mt-3">
                    Thanks for your feedback!
                  </p>
                )}
              </div>
            </article>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button variant="outline" onClick={() => navigate('/help')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                All Articles
              </Button>
              <Link to="/support">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Contact Support
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Related Articles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedArticles.map((related) => (
                    <Link
                      key={related.id}
                      to={`/help/article/${related.slug}`}
                      className="block p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <p className="font-medium text-sm text-neutral-900 dark:text-white">
                        {related.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                        {related.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                        <Clock className="w-3 h-3" />
                        {related.readingTime} min
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Still Need Help */}
            <Card className="mt-4 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-primary-200 dark:border-primary-800">
              <CardContent className="py-6 text-center">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
                  Still need help?
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Our support team is ready to assist you.
                </p>
                <Link to="/support">
                  <Button size="sm" className="w-full">
                    Contact Support
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default HelpArticlePage;
