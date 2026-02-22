/**
 * FormationCategory — Programmatic SEO page for formation categories
 *
 * Generates pages like /formations/marching-band, /formations/dance-team, etc.
 * Each page has SEO-optimized content, template gallery, and conversion CTA.
 */

import { useParams, Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { ArrowRight } from 'lucide-react';

interface CategoryConfig {
  slug: string;
  title: string;
  h1: string;
  description: string;
  metaDescription: string;
  templates: { name: string; performers: number; description: string }[];
  faqs: { q: string; a: string }[];
}

const CATEGORIES: Record<string, CategoryConfig> = {
  'marching-band': {
    slug: 'marching-band',
    title: 'Marching Band Formations',
    h1: 'Marching Band Formation Designer',
    description: 'Create and animate marching band drill formations with our free online editor. Design wedges, blocks, lines, arcs, and custom shapes for your marching band.',
    metaDescription: 'Free marching band formation designer. Create drill charts, animate transitions, and share with your band. Used by 50+ band directors.',
    templates: [
      { name: 'Company Front', performers: 16, description: 'Classic block formation with even spacing across the field' },
      { name: 'Wedge', performers: 8, description: 'V-shaped formation pointing toward the audience' },
      { name: 'Diamond', performers: 12, description: 'Four-point diamond shape for dynamic visual impact' },
      { name: 'Pinwheel', performers: 8, description: 'Rotating formation that creates a spinning visual effect' },
      { name: 'Scatter', performers: 16, description: 'Randomized positions for contemporary show designs' },
      { name: 'Circle', performers: 12, description: 'Circular formation for warm-ups and concert pieces' },
    ],
    faqs: [
      { q: 'How many performers can I add?', a: 'There is no limit. Most bands use 20-200 performers depending on the ensemble size.' },
      { q: 'Can I animate transitions between formations?', a: 'Yes. Add keyframes at different timestamps and FluxStudio interpolates smooth transitions between them.' },
      { q: 'Does it work on iPad?', a: 'Yes. The formation editor supports touch gestures including pinch-to-zoom and drag-to-move performers.' },
    ],
  },
  'dance-team': {
    slug: 'dance-team',
    title: 'Dance Team Formations',
    h1: 'Dance Team Formation Planner',
    description: 'Plan dance team formations with audio sync, BPM detection, and animated transitions. Perfect for competition routines.',
    metaDescription: 'Free dance team formation planner with audio sync and BPM detection. Design routines, animate transitions, and share choreography.',
    templates: [
      { name: 'V-Formation', performers: 8, description: 'Classic V-shape with lead dancer at the point' },
      { name: 'Staggered Lines', performers: 10, description: 'Offset rows for visual depth on stage' },
      { name: 'X-Formation', performers: 8, description: 'Crossed lines creating an X-shape center stage' },
      { name: 'Diagonal', performers: 6, description: 'Angled line from downstage to upstage' },
      { name: 'Cluster', performers: 8, description: 'Tight grouping for dramatic moments' },
      { name: 'Mirror', performers: 10, description: 'Symmetrical formation mirrored across center' },
    ],
    faqs: [
      { q: 'Can I sync formations to music?', a: 'Yes. Upload your audio track and FluxStudio will detect the BPM, place beat markers, and let you sync keyframes to specific beats.' },
      { q: 'Can multiple choreographers collaborate?', a: 'Yes. FluxStudio supports real-time collaboration so your whole team can edit formations simultaneously.' },
      { q: 'Can I export formations for print?', a: 'Yes. Export to PDF, PNG, or SVG for printing formation charts.' },
    ],
  },
  'drum-corps': {
    slug: 'drum-corps',
    title: 'Drum Corps Formations',
    h1: 'Drum Corps Drill Design Tool',
    description: 'Design drum corps drill formations with field overlay, count-based timing, and precise grid snapping. Built for the demands of competitive drill.',
    metaDescription: 'Free drum corps drill design tool with field overlay and count-based timing. Create precise formations for competitive marching.',
    templates: [
      { name: 'Company Front', performers: 24, description: 'Full-width block across the 50-yard line' },
      { name: 'Follow the Leader', performers: 12, description: 'Single-file curved path formation' },
      { name: 'Gate Turn', performers: 16, description: 'Pivoting arc formation for transitions' },
      { name: 'Box Drill', performers: 16, description: 'Square formation with internal movement' },
      { name: 'Oblique', performers: 12, description: 'Angled lines at 45 degrees to the sideline' },
      { name: 'Spiral', performers: 16, description: 'Inward-spiraling formation for visual impact' },
    ],
    faqs: [
      { q: 'Does it show the football field?', a: 'Yes. Toggle the field overlay to see yard lines, hash marks, and sidelines while designing your drill.' },
      { q: 'Can I use count-based timing?', a: 'Yes. Switch to count mode to set keyframes at specific counts instead of seconds, matching your music score.' },
      { q: 'How do I share drill charts with my corps?', a: 'Use the share link or embed code to share interactive formations. You can also export to PDF for printed drill books.' },
    ],
  },
};

// JSON-LD structured data for SoftwareApplication
const SOFTWARE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Flux Studio',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '52',
  },
};

export default function FormationCategory() {
  const { category } = useParams<{ category: string }>();
  const config = category ? CATEGORIES[category] : null;

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Category not found</h1>
          <Link to="/" className="text-indigo-600 hover:text-indigo-700">Back to home</Link>
        </div>
      </div>
    );
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={config.title}
        description={config.metaDescription}
        canonicalUrl={`https://fluxstudio.art/formations/${config.slug}`}
        structuredData={SOFTWARE_SCHEMA}
      />

      {/* Hero */}
      <header className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">Flux Studio</Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-indigo-200 hover:text-white text-sm">Log in</Link>
            <Link to="/signup" className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50">
              Sign up free
            </Link>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{config.h1}</h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-8">{config.description}</p>
          <Link
            to="/try"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Try it free — no signup required
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Template Gallery */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Popular {config.title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.templates.map((template) => (
            <div key={template.name} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-indigo-600">{template.performers}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              <span className="text-xs text-gray-400">{template.performers} performers</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            to="/try"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Start designing now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FAQ Section (SEO + structured data) */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {config.faqs.map((faq, i) => (
            <details key={i} className="group bg-gray-50 rounded-lg border border-gray-200">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-gray-900 font-medium">
                {faq.q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">&#9660;</span>
              </summary>
              <p className="px-5 pb-4 text-gray-600 text-sm">{faq.a}</p>
            </details>
          ))}
        </div>
        {/* Inject FAQ schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </section>

      {/* Footer CTA */}
      <section className="bg-indigo-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to design your {config.title.toLowerCase()}?</h2>
          <p className="text-indigo-200 mb-6">No signup required. Start designing in seconds.</p>
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
