/**
 * HelpCenter - Documentation and Support Hub
 *
 * Provides:
 * - Searchable help articles
 * - Getting started guides
 * - FAQ section
 * - Contact support link
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  articles: HelpArticle[];
}

interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  url?: string;
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of FluxStudio',
    icon: <Zap className="w-5 h-5" />,
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to FluxStudio',
        summary: 'An overview of the platform and its key features',
      },
      {
        id: 'create-first-project',
        title: 'Creating Your First Project',
        summary: 'Step-by-step guide to setting up your first project',
      },
      {
        id: 'invite-team',
        title: 'Inviting Team Members',
        summary: 'How to collaborate with your team',
      },
      {
        id: 'navigate-dashboard',
        title: 'Navigating the Dashboard',
        summary: 'Understanding the main interface and navigation',
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Managing and organizing projects',
    icon: <Folder className="w-5 h-5" />,
    articles: [
      {
        id: 'project-overview',
        title: 'Project Overview',
        summary: 'Understanding project structure and settings',
      },
      {
        id: 'project-files',
        title: 'Managing Files',
        summary: 'Uploading, organizing, and sharing files',
      },
      {
        id: 'project-timeline',
        title: 'Project Timeline & Milestones',
        summary: 'Tracking progress and deadlines',
      },
      {
        id: 'project-export',
        title: 'Exporting Projects',
        summary: 'How to export and archive your work',
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    description: 'Working together with your team',
    icon: <Users className="w-5 h-5" />,
    articles: [
      {
        id: 'real-time-editing',
        title: 'Real-Time Collaboration',
        summary: 'Working on documents simultaneously',
      },
      {
        id: 'comments-feedback',
        title: 'Comments & Feedback',
        summary: 'Leaving and managing comments',
      },
      {
        id: 'messaging',
        title: 'Team Messaging',
        summary: 'Using the built-in messaging system',
      },
      {
        id: 'notifications',
        title: 'Notifications & Alerts',
        summary: 'Staying informed about project updates',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect with your favorite tools',
    icon: <Settings className="w-5 h-5" />,
    articles: [
      {
        id: 'figma-integration',
        title: 'Figma Integration',
        summary: 'Import designs from Figma',
      },
      {
        id: 'slack-integration',
        title: 'Slack Integration',
        summary: 'Get notifications in Slack',
      },
      {
        id: 'github-integration',
        title: 'GitHub Integration',
        summary: 'Connect your repositories',
      },
      {
        id: 'google-integration',
        title: 'Google Workspace',
        summary: 'Sign in with Google',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Manage your subscription',
    icon: <CreditCard className="w-5 h-5" />,
    articles: [
      {
        id: 'pricing-plans',
        title: 'Pricing Plans',
        summary: 'Compare our available plans',
      },
      {
        id: 'payment-methods',
        title: 'Payment Methods',
        summary: 'Accepted payment options',
      },
      {
        id: 'invoices',
        title: 'Invoices & Receipts',
        summary: 'Accessing your billing history',
      },
      {
        id: 'cancel-subscription',
        title: 'Cancel or Change Plan',
        summary: 'Modifying your subscription',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    description: 'Keep your data safe',
    icon: <Shield className="w-5 h-5" />,
    articles: [
      {
        id: 'account-security',
        title: 'Account Security',
        summary: 'Protecting your account',
      },
      {
        id: 'data-privacy',
        title: 'Data Privacy',
        summary: 'How we handle your data',
      },
      {
        id: 'sharing-permissions',
        title: 'Sharing & Permissions',
        summary: 'Controlling access to your content',
      },
      {
        id: 'two-factor-auth',
        title: 'Two-Factor Authentication',
        summary: 'Adding extra security to your account',
      },
    ],
  },
];

// Popular/FAQ articles shown at top
const popularArticles = [
  {
    id: 'reset-password',
    title: 'How do I reset my password?',
    category: 'Account',
  },
  {
    id: 'invite-members',
    title: 'How do I invite team members?',
    category: 'Collaboration',
  },
  {
    id: 'upload-files',
    title: 'How do I upload files to a project?',
    category: 'Projects',
  },
  {
    id: 'change-plan',
    title: 'How do I upgrade or downgrade my plan?',
    category: 'Billing',
  },
  {
    id: 'export-project',
    title: 'Can I export my project data?',
    category: 'Projects',
  },
];

export function HelpCenter() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter categories and articles based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;

    const query = searchQuery.toLowerCase();
    return helpCategories
      .map((category) => ({
        ...category,
        articles: category.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(query) ||
            article.summary.toLowerCase().includes(query)
        ),
      }))
      .filter(
        (category) =>
          category.articles.length > 0 ||
          category.title.toLowerCase().includes(query)
      );
  }, [searchQuery]);

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
            <Book className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            How can we help you?
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
            Search our knowledge base or browse categories below
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="pl-12 h-12 text-lg"
            />
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
              <HelpCircle className="w-5 h-5 text-primary-600" />
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {popularArticles.map((article) => (
                <button
                  key={article.id}
                  className="text-left p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">
                    {article.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{article.category}</p>
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
            {filteredCategories.map((category, index) => (
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
                      {category.articles.slice(0, 4).map((article) => (
                        <li key={article.id}>
                          <button className="flex items-center justify-between w-full text-left text-sm text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-1">
                            <span>{article.title}</span>
                            <ChevronRight className="w-4 h-4 opacity-50" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {category.articles.length > 4 && (
                      <p className="text-xs text-primary-600 mt-2">
                        +{category.articles.length - 4} more articles
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredCategories.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
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
                <MessageSquare className="w-10 h-10 mx-auto text-primary-600 mb-4" />
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  Still need help?
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/support">
                    <Button className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Contact Support
                    </Button>
                  </Link>
                  <a
                    href="mailto:support@fluxstudio.art"
                    className="inline-flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink className="w-4 h-4" />
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
