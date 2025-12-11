/**
 * Tools Page - External Tools & Applications
 * Follows the standard DashboardLayout pattern like other pages
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/templates';
import { useAuth } from '../contexts/AuthContext';
import { ExternalLink, Sparkles, Zap } from 'lucide-react';

// Inline map icon to avoid any potential issues
const MapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

interface Tool {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  url: string;
  category: string;
  features: string[];
  isNew?: boolean;
  isPrimary?: boolean;
}

const tools: Tool[] = [
  {
    id: 'metmap',
    name: 'MetMap',
    description: 'AI-powered meeting intelligence platform',
    longDescription: 'Transform your meetings with AI-driven transcription, smart summaries, and actionable insights. MetMap helps teams capture every important detail and turn conversations into organized, searchable knowledge.',
    url: 'https://metmap.art',
    category: 'Productivity',
    features: [
      'AI Meeting Transcription',
      'Smart Summaries',
      'Action Item Extraction',
      'Searchable Archives'
    ],
    isNew: true,
    isPrimary: true,
  },
];

const ToolCard: React.FC<{ tool: Tool }> = ({ tool }) => {
  const handleLaunch = () => {
    window.open(tool.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`relative group ${tool.isPrimary ? 'md:col-span-2' : ''}`}>
      <div className={`
        bg-white dark:bg-neutral-800 rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300
        ${tool.isPrimary
          ? 'border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
        }
      `}>
        {/* New badge */}
        {tool.isNew && (
          <div className="absolute -top-3 -right-3 z-10">
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-full shadow-lg">
              <Sparkles className="w-3 h-3" />
              NEW
            </div>
          </div>
        )}

        <div className={`p-6 ${tool.isPrimary ? 'md:p-8' : ''}`}>
          <div className={`flex ${tool.isPrimary ? 'flex-col md:flex-row md:items-start gap-6' : 'flex-col'}`}>
            {/* Icon */}
            <div className={tool.isPrimary ? 'md:flex-shrink-0' : ''}>
              <div className={`
                flex items-center justify-center rounded-xl mb-4 md:mb-0
                ${tool.isPrimary
                  ? 'w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600'
                  : 'w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30'
                }
              `}>
                <div className={tool.isPrimary ? 'text-white' : 'text-blue-600 dark:text-blue-400'}>
                  <MapIcon />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`font-bold text-neutral-900 dark:text-neutral-100 ${tool.isPrimary ? 'text-2xl' : 'text-lg'}`}>
                  {tool.name}
                </h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-full">
                  {tool.category}
                </span>
              </div>

              <p className={`text-neutral-600 dark:text-neutral-300 mb-4 ${tool.isPrimary ? 'text-base' : 'text-sm'}`}>
                {tool.isPrimary ? tool.longDescription : tool.description}
              </p>

              {/* Features list for primary tools */}
              {tool.isPrimary && tool.features.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-2">
                    {tool.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <Zap className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleLaunch}
                  className={`
                    flex items-center gap-2 font-medium rounded-lg transition-all duration-200
                    ${tool.isPrimary
                      ? 'px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
                      : 'px-4 py-2 bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  <ExternalLink className="w-4 h-4" />
                  Launch {tool.name}
                </button>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                >
                  {tool.url.replace('https://', '')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Tools() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Auth check with redirect
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    document.title = 'Tools - FluxStudio';
  }, [user, navigate]);

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <DashboardLayout
      user={user}
      breadcrumbs={[{ label: 'Tools' }]}
      onLogout={logout}
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Tools
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            Extend your FluxStudio workflow with powerful external tools and applications.
          </p>
        </div>

        {/* Featured Tools */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Featured Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tools.filter(t => t.isPrimary).map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                More tools coming soon
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-4 text-sm">
                We're working on integrating more powerful tools to enhance your creative workflow.
                Stay tuned for AI design assistants, project management tools, and more.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/60 dark:bg-neutral-800/60 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  AI Design Assistant
                </span>
                <span className="px-3 py-1 bg-white/60 dark:bg-neutral-800/60 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  Asset Library
                </span>
                <span className="px-3 py-1 bg-white/60 dark:bg-neutral-800/60 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  Analytics Dashboard
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
