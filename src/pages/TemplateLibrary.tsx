/**
 * TemplateLibrary — Browsable formation template gallery
 *
 * Sprint 49 T4: Public page at /templates showcasing all formation templates
 * with category filtering, search, and canvas previews.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import {
  Search,
  LayoutGrid,
  Grid3X3,
  Users,
  Music,
  ArrowRight,
  Filter,
  X,
} from 'lucide-react';
import { UniversalEmptyState } from '@/components/ui/UniversalEmptyState';
import { templateRegistry } from '@/services/formationTemplates/registry';
import {
  DrillTemplate,
  TemplateCategory,
  TemplatePosition,
} from '@/services/formationTemplates/types';
import { cn } from '@/lib/utils';

const categoryMeta: Record<TemplateCategory, { label: string; icon: typeof Grid3X3; color: string }> = {
  basic: { label: 'Basic', icon: Grid3X3, color: 'bg-green-100 text-green-700' },
  intermediate: { label: 'Intermediate', icon: LayoutGrid, color: 'bg-blue-100 text-blue-700' },
  advanced: { label: 'Advanced', icon: Users, color: 'bg-purple-100 text-purple-700' },
  custom: { label: 'Custom', icon: Users, color: 'bg-orange-100 text-orange-700' },
  drill: { label: 'Drill', icon: Music, color: 'bg-pink-100 text-pink-700' },
};

function MiniPreview({ template }: { template: DrillTemplate }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const positions: TemplatePosition[] = templateRegistry.scaleTemplateForPerformers(
      template,
      Math.min(template.parameters.minPerformers + 4, template.parameters.maxPerformers || 20)
    );

    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

    positions.forEach((pos, i) => {
      const x = (pos.x / 100) * (w * 0.8) + w * 0.1;
      const y = (pos.y / 100) * (h * 0.8) + h * 0.1;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
    });
  }, [template]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className="w-full h-full"
    />
  );
}

export default function TemplateLibrary() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'performers'>('name');

  const allTemplates = useMemo(() => templateRegistry.getAllTemplates(), []);
  const categories = useMemo(() => templateRegistry.getCategories(), []);

  const filtered = useMemo(() => {
    let result = allTemplates;

    if (activeCategory) {
      result = result.filter(t => t.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'performers') return a.parameters.minPerformers - b.parameters.minPerformers;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [allTemplates, activeCategory, search, sortBy]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Formation Template Library',
    description: 'Browse free formation templates for marching bands, dance teams, and drum corps.',
    url: 'https://fluxstudio.art/templates',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allTemplates.length,
      itemListElement: allTemplates.slice(0, 10).map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: t.name,
        description: t.description,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEOHead
        title="Formation Templates — Free Drill & Dance Formation Library"
        description="Browse 20+ free formation templates for marching bands, dance teams, and drum corps. Wedges, diamonds, pinwheels, and more."
        canonicalUrl="https://fluxstudio.art/templates"
        structuredData={structuredData}
      />

      {/* Nav */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">Flux Studio</Link>
          <div className="flex items-center gap-3">
            <Link to="/try" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Try Editor
            </Link>
            <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Formation Template Library
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
            Start with a pre-built formation and customize it to fit your ensemble.
            All templates are free and work with any performer count.
          </p>

          {/* Search bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-12 pr-10 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Filter className="w-4 h-4" />
            <span>Category:</span>
          </div>
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeCategory === null
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            )}
          >
            All ({allTemplates.length})
          </button>
          {categories.map(({ category: cat, count }) => {
            const meta = categoryMeta[cat];
            const Icon = meta.icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  activeCategory === cat
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label} ({count})
              </button>
            );
          })}

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'performers')}
              className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300"
            >
              <option value="name">Sort by name</option>
              <option value="performers">Sort by performers</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
          {activeCategory && ` in ${categoryMeta[activeCategory].label}`}
        </p>

        {/* Template Grid */}
        {filtered.length === 0 ? (
          <UniversalEmptyState
            icon={LayoutGrid}
            title="No templates found"
            description={search || activeCategory ? 'Try adjusting your search or category filters.' : 'No formation templates are available yet.'}
            illustration="search"
            primaryAction={
              (search || activeCategory)
                ? { label: 'Clear filters', onClick: () => { setSearch(''); setActiveCategory(null); } }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((template) => (
              <TemplateLibraryCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="bg-indigo-600 text-white py-14 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to build your formation?</h2>
          <p className="text-indigo-200 mb-6">
            Pick any template above, or start from a blank canvas. No signup required.
          </p>
          <Link
            to="/try"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
          >
            Open the editor
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function TemplateLibraryCard({ template }: { template: DrillTemplate }) {
  const meta = categoryMeta[template.category];

  return (
    <Link
      to={`/try?template=${template.id}`}
      className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Preview */}
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 relative">
        <MiniPreview template={template} />
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
            Use template
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {template.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {template.description}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', meta.color)}>
            {meta.label}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {template.parameters.minPerformers}
            {template.parameters.maxPerformers ? `-${template.parameters.maxPerformers}` : '+'}
          </span>
          {template.tags.filter(t => t !== template.category).slice(0, 2).map(tag => (
            <span key={tag} className="text-xs text-gray-400 dark:text-gray-500">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
