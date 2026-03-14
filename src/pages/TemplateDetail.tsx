/**
 * TemplateDetail — Individual template detail page for SEO indexing
 *
 * Public page at /templates/:templateId showing full template details,
 * canvas preview, and CTAs to use or sign up.
 */

import { useParams, Link } from 'react-router-dom';
import { useMemo, useEffect, useRef } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { templateRegistry } from '@/services/formationTemplates/registry';
import { ArrowRight, ChevronLeft, Users } from 'lucide-react';
import { eventTracker } from '@/services/analytics/eventTracking';
import {
  DrillTemplate,
  TemplateCategory,
  TemplatePosition,
} from '@/services/formationTemplates/types';
import { cn } from '@/lib/utils';

const categoryMeta: Record<TemplateCategory, { label: string; color: string }> = {
  basic: { label: 'Basic', color: 'bg-green-100 text-green-700' },
  intermediate: { label: 'Intermediate', color: 'bg-blue-100 text-blue-700' },
  advanced: { label: 'Advanced', color: 'bg-purple-100 text-purple-700' },
  custom: { label: 'Custom', color: 'bg-orange-100 text-orange-700' },
  drill: { label: 'Drill', color: 'bg-pink-100 text-pink-700' },
};

function DetailPreview({ template }: { template: DrillTemplate }) {
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
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
    });
  }, [template]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="w-full h-full"
    />
  );
}

export default function TemplateDetail() {
  const { templateId } = useParams<{ templateId: string }>();
  const template = useMemo(
    () => (templateId ? templateRegistry.getTemplate(templateId) : undefined),
    [templateId]
  );

  const relatedTemplates = useMemo(() => {
    if (!template) return [];
    return templateRegistry
      .getAllTemplates()
      .filter((t) => t.category === template.category && t.id !== template.id)
      .slice(0, 4);
  }, [template]);

  useEffect(() => {
    if (template) {
      eventTracker.trackEvent('template_detail_view', {
        templateId: template.id,
        templateName: template.name,
      });
    }
  }, [template]);

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Template not found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The template you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back to templates
          </Link>
        </div>
      </div>
    );
  }

  const meta = categoryMeta[template.category];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: template.name,
    description: template.description,
    url: `https://fluxstudio.art/templates/${template.id}`,
    creator: {
      '@type': 'Organization',
      name: 'FluxStudio',
    },
    keywords: template.tags.join(', '),
    ...(template.createdAt && { dateCreated: template.createdAt }),
    ...(template.updatedAt && { dateModified: template.updatedAt }),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEOHead
        title={`${template.name} - Formation Template`}
        description={template.description}
        canonicalUrl={`https://fluxstudio.art/templates/${template.id}`}
        ogImage={`https://fluxstudio.art/api/og/template/${template.id}.png`}
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/templates"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          All templates
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Preview */}
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <DetailPreview template={template} />
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {template.name}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {template.description}
            </p>

            {/* Details */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={cn('text-sm px-3 py-1 rounded-full font-medium', meta.color)}>
                {meta.label}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" aria-hidden="true" />
                {template.parameters.minPerformers}
                {template.parameters.maxPerformers
                  ? `\u2013${template.parameters.maxPerformers}`
                  : '+'}{' '}
                performers
              </span>
            </div>

            {/* Tags */}
            {template.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <Link
                to={`/try?template=${template.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Use this template
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Sign up free to save
              </Link>
            </div>
          </div>
        </div>

        {/* Related templates */}
        {relatedTemplates.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Related templates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedTemplates.map((related) => {
                const relMeta = categoryMeta[related.category];
                return (
                  <Link
                    key={related.id}
                    to={`/templates/${related.id}`}
                    className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all overflow-hidden"
                  >
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {related.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                        {related.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', relMeta.color)}>
                          {relMeta.label}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" aria-hidden="true" />
                          {related.parameters.minPerformers}
                          {related.parameters.maxPerformers ? `-${related.parameters.maxPerformers}` : '+'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
