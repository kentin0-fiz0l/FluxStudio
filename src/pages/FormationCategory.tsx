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
  'color-guard': {
    slug: 'color-guard',
    title: 'Color Guard Formations',
    h1: 'Color Guard Formation Designer',
    description: 'Design color guard formations with equipment paths for flags, rifles, and sabres. Visualize tosses, spins, and choreography alongside your drill.',
    metaDescription: 'Free color guard formation designer with equipment paths. Plan flag, rifle, and sabre choreography alongside drill formations.',
    templates: [
      { name: 'Flag Line', performers: 8, description: 'Horizontal line with even spacing for flag work' },
      { name: 'Rifle Diamond', performers: 6, description: 'Diamond shape optimized for rifle toss visibility' },
      { name: 'Sabre Triangle', performers: 6, description: 'Triangular formation for sabre feature moments' },
      { name: 'Equipment Cascade', performers: 10, description: 'Staggered diagonal for sequential toss effects' },
      { name: 'Split Silks', performers: 8, description: 'Two mirrored lines for silk feature work' },
    ],
    faqs: [
      { q: 'Can I plan equipment tosses in the editor?', a: 'Yes. Use keyframes to mark toss and catch positions, then animate the transitions to visualize timing.' },
      { q: 'Does it support separate flag, rifle, and sabre groups?', a: 'Yes. Assign performers to equipment groups with color coding so you can plan formations for each section independently.' },
      { q: 'Can I sync guard choreography with the music?', a: 'Yes. Upload your audio track and place beat markers to sync guard movements with musical cues.' },
    ],
  },
  'winter-guard': {
    slug: 'winter-guard',
    title: 'Winter Guard Formations',
    h1: 'Winter Guard Formation Planner',
    description: 'Plan indoor color guard formations with floor work, equipment tosses, and stage-sized layouts. Designed for the gym floor performance space.',
    metaDescription: 'Free winter guard formation planner for indoor color guard. Design floor work, equipment choreography, and stage formations.',
    templates: [
      { name: 'Floor Spread', performers: 12, description: 'Full floor coverage for opening impact moments' },
      { name: 'Center Cluster', performers: 8, description: 'Tight center grouping for intimate choreography' },
      { name: 'Corner Fan', performers: 6, description: 'Fan shape expanding from a floor corner' },
      { name: 'Toss Line', performers: 8, description: 'Straight line with spacing for simultaneous tosses' },
      { name: 'Dance Block', performers: 10, description: 'Grid formation for synchronized dance sections' },
    ],
    faqs: [
      { q: 'Does it support indoor gym floor dimensions?', a: 'Yes. Switch to the indoor floor overlay which shows a regulation WGI performance area (60x90 feet).' },
      { q: 'Can I plan floor work and standing choreography together?', a: 'Yes. Use layers to separate floor work from standing formations and toggle between them.' },
      { q: 'Is it useful for WGI competition prep?', a: 'Yes. Many winter guard instructors use FluxStudio to plan formations, share with judges, and export printed floor charts.' },
    ],
  },
  'indoor-drumline': {
    slug: 'indoor-drumline',
    title: 'Indoor Drumline Formations',
    h1: 'Indoor Drumline Formation Tool',
    description: 'Design indoor percussion formations with front ensemble staging, battery placement, and movement choreography for WGI and BOA competition.',
    metaDescription: 'Free indoor drumline formation tool. Plan battery and front ensemble staging for WGI and indoor percussion competitions.',
    templates: [
      { name: 'Battery Arc', performers: 12, description: 'Curved arc formation for battery section impact' },
      { name: 'Pit Layout', performers: 8, description: 'Front ensemble keyboard and auxiliary placement' },
      { name: 'Split Battery', performers: 10, description: 'Two battery groups flanking center stage' },
      { name: 'Feature Circle', performers: 8, description: 'Circle formation for featured soloist moments' },
      { name: 'March-In Line', performers: 14, description: 'Entrance formation with battery leading front ensemble' },
    ],
    faqs: [
      { q: 'Can I position front ensemble instruments separately?', a: 'Yes. Place keyboards, auxiliary percussion, and electronics on the floor layout independently from the battery.' },
      { q: 'Does it support WGI floor dimensions?', a: 'Yes. Select the indoor percussion floor overlay for a regulation WGI staging area.' },
      { q: 'Can I animate battery movement during the show?', a: 'Yes. Set keyframes for battery positions and FluxStudio will animate movement paths between formations.' },
    ],
  },
  'cheerleading': {
    slug: 'cheerleading',
    title: 'Cheerleading Formations',
    h1: 'Cheerleading Formation Builder',
    description: 'Build cheerleading formations with stunt group placement, pyramid layouts, and transition choreography. Plan routines for sideline and competition.',
    metaDescription: 'Free cheerleading formation builder. Design stunt groups, pyramids, and dance sections for sideline and competitive cheerleading routines.',
    templates: [
      { name: 'Pyramid Base', performers: 12, description: 'Three stunt groups in pyramid configuration' },
      { name: 'Sideline Spread', performers: 16, description: 'Full sideline coverage for game-day routines' },
      { name: 'Stunt Pods', performers: 8, description: 'Two-group stunt layout with spacing for tosses' },
      { name: 'Dance Block', performers: 12, description: 'Grid formation for synchronized dance sections' },
      { name: 'Tunnel Formation', performers: 14, description: 'Two-line tunnel for team entrances' },
    ],
    faqs: [
      { q: 'Can I plan stunt group positions?', a: 'Yes. Assign performers to stunt groups with color coding and position each group independently on the floor.' },
      { q: 'Does it work for competition routines?', a: 'Yes. Use the timer and audio sync to plan formations that match your competition music and time limits.' },
      { q: 'Can I share formations with my coaching staff?', a: 'Yes. Share a link or export to PDF so coaches and athletes can review formations on any device.' },
    ],
  },
  'pep-band': {
    slug: 'pep-band',
    title: 'Pep Band Formations',
    h1: 'Pep Band Formation Planner',
    description: 'Plan pep band formations for stands, floor shows, and halftime performances. Arrange brass, woodwind, and percussion sections with flexible layouts.',
    metaDescription: 'Free pep band formation planner. Arrange stands formations, floor shows, and halftime layouts for your pep band.',
    templates: [
      { name: 'Bleacher Layout', performers: 20, description: 'Tiered rows arranged for bleacher seating sections' },
      { name: 'Floor Block', performers: 16, description: 'Rectangular block for gymnasium floor performances' },
      { name: 'Section Split', performers: 12, description: 'Instrument sections separated for antiphonal effects' },
      { name: 'Halftime Line', performers: 16, description: 'Single-file entrance line for halftime shows' },
      { name: 'Fan Shape', performers: 14, description: 'Semi-circular fan formation facing the audience' },
    ],
    faqs: [
      { q: 'Can I plan formations for the stands?', a: 'Yes. Use the bleacher overlay to arrange rows and sections within the stands seating area.' },
      { q: 'Can I separate instrument sections?', a: 'Yes. Assign performers to instrument groups (brass, woodwinds, percussion) with color coding for clear visual separation.' },
      { q: 'Does it support both indoor and outdoor layouts?', a: 'Yes. Switch between gymnasium, football field, and custom stage overlays depending on your performance venue.' },
    ],
  },
  'drill-team': {
    slug: 'drill-team',
    title: 'Drill Team Formations',
    h1: 'Drill Team Formation Designer',
    description: 'Design precision drill team formations with kick lines, columns, and geometric patterns. Plan halftime routines with count-based timing.',
    metaDescription: 'Free drill team formation designer. Create kick lines, precision columns, and geometric patterns for halftime and competition performances.',
    templates: [
      { name: 'Kick Line', performers: 12, description: 'Straight line with precise spacing for kick routines' },
      { name: 'Double Column', performers: 16, description: 'Two parallel columns for marching and precision work' },
      { name: 'Star Pattern', performers: 10, description: 'Five-point star shape for visual impact formations' },
      { name: 'Chevron', performers: 12, description: 'Angled V-shape with leader at the point' },
      { name: 'Rotating Square', performers: 8, description: 'Square formation designed for 90-degree rotation drills' },
    ],
    faqs: [
      { q: 'Can I set exact spacing between performers?', a: 'Yes. Use the grid snap tool to set precise intervals measured in steps, feet, or yards between each performer.' },
      { q: 'Does it support count-based timing for drill?', a: 'Yes. Switch to count mode to plan transitions at specific counts, matching your music score and routine timing.' },
      { q: 'Can I export formation charts for practice?', a: 'Yes. Export to PDF with performer labels, spacing measurements, and count annotations for printed practice charts.' },
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Category not found</h1>
          <Link to="/" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">Back to home</Link>
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

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fluxstudio.art' },
      { '@type': 'ListItem', position: 2, name: 'Formations', item: 'https://fluxstudio.art/formations' },
      { '@type': 'ListItem', position: 3, name: config.title, item: `https://fluxstudio.art/formations/${config.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <SEOHead
        title={config.title}
        description={config.metaDescription}
        canonicalUrl={`https://fluxstudio.art/formations/${config.slug}`}
        structuredData={[SOFTWARE_SCHEMA, faqSchema, breadcrumbSchema]}
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
        {/* Visible breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <ol className="flex items-center gap-1.5 text-xs text-indigo-200" aria-label="Breadcrumb">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/templates" className="hover:text-white transition-colors">Formations</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-white font-medium" aria-current="page">{config.title}</li>
          </ol>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{config.h1}</h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-8">{config.description}</p>
          <Link
            to="/try"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Try it free — no signup required
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* Template Gallery */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Popular {config.title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.templates.map((template) => (
            <div key={template.name} className="bg-gray-50 dark:bg-neutral-900 rounded-xl p-6 border border-gray-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{template.performers}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 dark:text-neutral-400 mb-3">{template.description}</p>
              <span className="text-xs text-gray-400 dark:text-neutral-500">{template.performers} performers</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            to="/try"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Start designing now
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* FAQ Section (SEO + structured data) */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {config.faqs.map((faq, i) => (
            <details key={i} className="group bg-gray-50 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-gray-900 dark:text-white font-medium">
                {faq.q}
                <span className="text-gray-400 dark:text-neutral-500 group-open:rotate-180 transition-transform">&#9660;</span>
              </summary>
              <p className="px-5 pb-4 text-gray-600 dark:text-neutral-400 text-sm">{faq.a}</p>
            </details>
          ))}
        </div>
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
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
