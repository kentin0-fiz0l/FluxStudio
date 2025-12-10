/**
 * Tools Page - External Tools & Applications
 * Shows available external tools that integrate with FluxStudio
 */
import React from 'react';
import {
  Map,
  ExternalLink,
  Wrench,
  ArrowRight,
  Sparkles,
  Globe,
  Zap
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
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
    icon: <Map className="w-8 h-8" />,
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
    <div className={`relative group ${tool.isPrimary ? 'md:col-span-2 lg:col-span-2' : ''}`}>
      <div className={`
        bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300
        ${tool.isPrimary
          ? 'border-blue-200 hover:border-blue-300'
          : 'border-gray-200 hover:border-gray-300'
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
            {/* Icon and basic info */}
            <div className={tool.isPrimary ? 'md:flex-shrink-0' : ''}>
              <div className={`
                flex items-center justify-center rounded-xl mb-4 md:mb-0
                ${tool.isPrimary
                  ? 'w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600'
                  : 'w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50'
                }
              `}>
                <div className={tool.isPrimary ? 'text-white' : 'text-blue-600'}>
                  {tool.icon}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`font-bold text-gray-900 ${tool.isPrimary ? 'text-2xl' : 'text-lg'}`}>
                  {tool.name}
                </h3>
                <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-full">
                  {tool.category}
                </span>
              </div>

              <p className={`text-gray-600 mb-4 ${tool.isPrimary ? 'text-base' : 'text-sm'}`}>
                {tool.isPrimary ? tool.longDescription : tool.description}
              </p>

              {/* Features list for primary tools */}
              {tool.isPrimary && tool.features.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-2">
                    {tool.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                        <Zap className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3">
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
                  <Globe className="w-4 h-4" />
                  Launch {tool.name}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
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
  const categories = [...new Set(tools.map(t => t.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Tools
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl">
            Extend your FluxStudio workflow with powerful external tools and applications.
            These tools work seamlessly with your FluxStudio account.
          </p>
        </div>

        {/* Featured/Primary Tools */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Featured Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.filter(t => t.isPrimary).map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>

        {/* All Tools by Category */}
        {tools.filter(t => !t.isPrimary).length > 0 && (
          <div className="space-y-12">
            {categories.map((category) => {
              const categoryTools = tools.filter(t => t.category === category && !t.isPrimary);
              if (categoryTools.length === 0) return null;

              return (
                <div key={category}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categoryTools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Coming Soon / Info Card */}
        <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                More tools coming soon
              </h3>
              <p className="text-blue-700 mb-4">
                We're working on integrating more powerful tools to enhance your creative workflow.
                Stay tuned for AI design assistants, project management tools, and more.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/60 text-blue-700 rounded-full text-sm font-medium">
                  AI Design Assistant
                </span>
                <span className="px-3 py-1 bg-white/60 text-blue-700 rounded-full text-sm font-medium">
                  Asset Library
                </span>
                <span className="px-3 py-1 bg-white/60 text-blue-700 rounded-full text-sm font-medium">
                  Analytics Dashboard
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
