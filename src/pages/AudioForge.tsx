/**
 * AudioForge Plugin Marketplace
 * Browse and download free DAW plugins (VST3/AU)
 */

import { useState, useEffect } from 'react';
import { Download, Star, Music, Sliders, Volume2 } from 'lucide-react';

interface Plugin {
  id: number;
  slug: string;
  name: string;
  description: string;
  version: string;
  category: 'effect' | 'instrument' | 'utility';
  features: string[];
  tags: string[];
  download_count: number;
  rating_average: number;
  rating_count: number;
  versions?: Array<{
    version: string;
    downloadUrlMac?: string;
    downloadUrlWindows?: string;
    downloadUrlLinux?: string;
    releasedAt: string;
  }>;
}

const categoryIcons = {
  effect: Sliders,
  instrument: Music,
  utility: Volume2,
};

export default function AudioForge() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchPlugins();
  }, [selectedCategory]);

  const fetchPlugins = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);

      const response = await fetch(`/api/audioforge/plugins?${params}`);
      const data = await response.json();

      if (data.success) {
        setPlugins(data.data);
      }
    } catch (error) {
      console.error('Error fetching plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (slug: string, platform: string) => {
    try {
      await fetch(`/api/audioforge/plugins/${slug}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
    } catch (error) {
      console.error('Error tracking download:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              AudioForge
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              Professional DAW plugins, free and open source
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span>Free Download</span>
              </div>
              <div>•</div>
              <div>VST3 Format</div>
              <div>•</div>
              <div>macOS, Windows, Linux</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2 rounded-full transition ${
              !selectedCategory
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedCategory('utility')}
            className={`px-6 py-2 rounded-full transition ${
              selectedCategory === 'utility'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Utilities
          </button>
          <button
            onClick={() => setSelectedCategory('effect')}
            className={`px-6 py-2 rounded-full transition ${
              selectedCategory === 'effect'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Effects
          </button>
          <button
            onClick={() => setSelectedCategory('instrument')}
            className={`px-6 py-2 rounded-full transition ${
              selectedCategory === 'instrument'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Instruments
          </button>
        </div>

        {/* Plugin Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading plugins...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plugins.map((plugin) => {
              const Icon = categoryIcons[plugin.category];
              const latestVersion = plugin.versions?.[0];

              return (
                <div
                  key={plugin.id}
                  className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 hover:border-purple-500 transition p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{plugin.name}</h3>
                        <p className="text-sm text-gray-400">v{plugin.version}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {plugin.description}
                  </p>

                  {/* Features */}
                  <div className="mb-4">
                    {plugin.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="text-xs text-gray-400 mb-1">
                        • {feature}
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{plugin.rating_average.toFixed(1)}</span>
                      <span className="text-gray-500">({plugin.rating_count})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      <span>{plugin.download_count.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Download Buttons */}
                  <div className="flex gap-2">
                    {latestVersion?.downloadUrlMac && (
                      <a
                        href={latestVersion.downloadUrlMac}
                        onClick={() => handleDownload(plugin.slug, 'mac')}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-center text-sm font-medium transition"
                      >
                        macOS
                      </a>
                    )}
                    {latestVersion?.downloadUrlWindows && (
                      <a
                        href={latestVersion.downloadUrlWindows}
                        onClick={() => handleDownload(plugin.slug, 'windows')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center text-sm font-medium transition"
                      >
                        Windows
                      </a>
                    )}
                    {latestVersion?.downloadUrlLinux && (
                      <a
                        href={latestVersion.downloadUrlLinux}
                        onClick={() => handleDownload(plugin.slug, 'linux')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-center text-sm font-medium transition"
                      >
                        Linux
                      </a>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plugin.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && plugins.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p>No plugins found in this category.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 border-t border-gray-800 mt-12">
        <div className="text-center text-gray-400 text-sm">
          <p>
            AudioForge is an open-source project.{' '}
            <a
              href="https://github.com/yourusername/AudioForge"
              className="text-purple-400 hover:text-purple-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </p>
          <p className="mt-2">Built with JUCE • VST3 • Free Forever</p>
        </div>
      </div>
    </div>
  );
}
