/**
 * HelpCenter - Documentation and Support Hub
 *
 * Provides:
 * - Searchable help articles with real content
 * - Getting started guides
 * - FAQ section
 * - Contact support link
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Book,
  MessageSquare,
  Settings,
  Users,
  Folder,
  CreditCard,
  Shield,
  Zap,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { searchArticles, helpArticles, type HelpArticle } from '@/content/help-articles';

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  articleSlugs: string[];
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of FluxStudio',
    icon: <Zap className="w-5 h-5" aria-hidden="true" />,
    articleSlugs: ['getting-started', 'creating-first-project', 'keyboard-shortcuts', 'troubleshooting'],
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Managing and organizing projects',
    icon: <Folder className="w-5 h-5" aria-hidden="true" />,
    articleSlugs: ['creating-first-project', 'file-management'],
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    description: 'Working together with your team',
    icon: <Users className="w-5 h-5" aria-hidden="true" />,
    articleSlugs: ['collaboration-features', 'messaging-guide'],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect with your favorite tools',
    icon: <Settings className="w-5 h-5" aria-hidden="true" />,
    articleSlugs: ['integrations-figma', 'integrations-slack'],
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Manage your subscription',
    icon: <CreditCard className="w-5 h-5" aria-hidden="true" />,
    articleSlugs: ['billing-payments'],
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    description: 'Keep your data safe',
    icon: <Shield className="w-5 h-5" aria-hidden="true" />,
    articleSlugs: ['security-privacy', 'account-management', 'settings-preferences'],
  },
];

// Popular/FAQ articles shown at top - map to actual articles
const popularArticleSlugs = [
  { slug: 'account-management', title: 'How do I reset my password?', category: 'Account' },
  { slug: 'collaboration-features', title: 'How do I invite team members?', category: 'Collaboration' },
  { slug: 'file-management', title: 'How do I upload files to a project?', category: 'Projects' },
  { slug: 'billing-payments', title: 'How do I upgrade or downgrade my plan?', category: 'Billing' },
  { slug: 'troubleshooting', title: 'Having issues? Troubleshooting guide', category: 'Support' },
];

export function HelpCenter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Get articles for each category
  const getCategoryArticles = (slugs: string[]): HelpArticle[] => {
    return slugs
      .map((slug) => helpArticles.find((a) => a.slug === slug))
      .filter((a): a is HelpArticle => a !== undefined);
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchArticles(searchQuery);
  }, [searchQuery]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;

    const matchingArticles = new Set(searchResults.map((a) => a.slug));

    return helpCategories
      .map((category) => ({
        ...category,
        articleSlugs: category.articleSlugs.filter((slug) => matchingArticles.has(slug)),
      }))
      .filter((category) => category.articleSlugs.length > 0);
  }, [searchQuery, searchResults]);

  const handleArticleClick = (slug: string) => {
    navigate(`/help/article/${slug}`);
  };

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Help Center' }]}
      onLogout={logout}
      showSearch={false}
    >
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Book className="w-8 h-8 text-primary-600" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            How can we help you?
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
            Search our knowledge base or browse categories below
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="pl-12 h-12 text-lg"
            />

            {/* Search Results Dropdown */}
            {searchQuery.trim() && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-lg z-10 max-h-96 overflow-y-auto"
              >
                {searchResults.slice(0, 8).map((article) => (
                  <button
                    key={article.id}
                    onClick={() => handleArticleClick(article.slug)}
                    className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 transition-colors"
                  >
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      {article.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                      <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                        {article.category}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {article.readingTime} min
                      </span>
                    </div>
                  </button>
                ))}
                {searchResults.length > 8 && (
                  <p className="p-3 text-xs text-center text-neutral-500">
                    Showing 8 of {searchResults.length} results
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Popular Articles */}
        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary-600" aria-hidden="true" />
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {popularArticleSlugs.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => handleArticleClick(item.slug)}
                  className="text-left p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">
                    {item.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{item.category}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Categories Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            {searchQuery ? 'Search Results' : 'Browse by Category'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category, index) => {
              const articles = getCategoryArticles(category.articleSlugs);

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-3 text-base">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                          {category.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{category.title}</h3>
                          <p className="text-xs text-neutral-500 font-normal">
                            {category.description}
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {articles.slice(0, 4).map((article) => (
                          <li key={article.id}>
                            <button
                              onClick={() => handleArticleClick(article.slug)}
                              className="flex items-center justify-between w-full text-left text-sm text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-1"
                            >
                              <span>{article.title}</span>
                              <ChevronRight className="w-4 h-4 opacity-50" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      {articles.length > 4 && (
                        <p className="text-xs text-primary-600 mt-2">
                          +{articles.length - 4} more articles
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filteredCategories.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-neutral-500 mb-4">
                We couldn't find any articles matching "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </div>
          )}
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-primary-200 dark:border-primary-800">
            <CardContent className="py-8">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-primary-600 mb-4" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  Still need help?
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/support">
                    <Button className="gap-2">
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      Contact Support
                    </Button>
                  </Link>
                  <a
                    href="mailto:support@fluxstudio.art"
                    className="inline-flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    support@fluxstudio.art
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

export default HelpCenter;
