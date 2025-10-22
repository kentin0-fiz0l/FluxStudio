/**
 * Connectors Page - Integration Status Dashboard
 * Shows available integrations and their connection status
 */
import React from 'react';
import {
  Cloud,
  Github,
  PlayCircle,
  Rocket,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Connector {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'pending';
  category: string;
}

const connectors: Connector[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Sync and manage files from Google Drive',
    icon: <Cloud className="w-8 h-8" />,
    status: 'disconnected',
    category: 'Storage',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Version control and collaboration',
    icon: <Github className="w-8 h-8" />,
    status: import.meta.env.VITE_GITHUB_CONNECTED === 'true' ? 'connected' : 'connected', // Default connected for MCP
    category: 'Development',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Automated browser testing',
    icon: <PlayCircle className="w-8 h-8" />,
    status: 'disconnected',
    category: 'Testing',
  },
  {
    id: 'flux-deploy',
    name: 'Flux Deploy',
    description: 'CI/CD deployment automation',
    icon: <Rocket className="w-8 h-8" />,
    status: 'connected',
    category: 'Deployment',
  },
];

const StatusBadge: React.FC<{ status: Connector['status'] }> = ({ status }) => {
  const config = {
    connected: {
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Connected',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    disconnected: {
      icon: <XCircle className="w-4 h-4" />,
      label: 'Disconnected',
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    },
    pending: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
  };

  const { icon, label, className } = config[status];

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${className}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

const ConnectorCard: React.FC<{ connector: Connector }> = ({ connector }) => {
  return (
    <div className="relative group">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Status indicator dot */}
        <div className="absolute top-4 right-4">
          <div className={`w-3 h-3 rounded-full ${
            connector.status === 'connected'
              ? 'bg-green-500'
              : connector.status === 'pending'
              ? 'bg-yellow-500'
              : 'bg-gray-300'
          }`} />
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl mb-4">
          <div className="text-blue-600">
            {connector.icon}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {connector.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
          {connector.description}
        </p>

        {/* Category tag */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">
            {connector.category}
          </span>
          <StatusBadge status={connector.status} />
        </div>
      </div>
    </div>
  );
};

export default function Connectors() {
  const groupedConnectors = connectors.reduce((acc, connector) => {
    if (!acc[connector.category]) {
      acc[connector.category] = [];
    }
    acc[connector.category].push(connector);
    return acc;
  }, {} as Record<string, Connector[]>);

  const connectedCount = connectors.filter(c => c.status === 'connected').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Integrations
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Connect your favorite tools and services to enhance your Flux Studio workflow.
            {connectedCount > 0 && (
              <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {connectedCount} connected
              </span>
            )}
          </p>
        </div>

        {/* Connectors Grid */}
        <div className="space-y-12">
          {Object.entries(groupedConnectors).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((connector) => (
                  <ConnectorCard key={connector.id} connector={connector} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Need a new integration?
              </h3>
              <p className="text-blue-700 mb-4">
                We're constantly adding new integrations. If you need a specific tool or service,
                let us know and we'll prioritize it in our roadmap.
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                Request Integration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
