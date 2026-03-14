/**
 * Changelog - Public changelog page showing recent updates
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '0.92.0',
    date: '2026-03-09',
    title: 'Public Beta Launch',
    changes: [
      'Landing page updated for marching arts directors and drill writers',
      'New onboarding flow with progress tracking and role-based template selection',
      '5 new show templates: Halftime Show, Parade Block, Indoor Drumline, Color Guard, Full Field Show',
      'Beta waitlist system with invite codes',
      'Live chat support via Crisp integration',
      'Announcement banner and this changelog page',
    ],
  },
  {
    version: '0.91.0',
    date: '2026-03-01',
    title: 'Security Hardening',
    changes: [
      'Replaced eval() in workflow engine with safe expression parser',
      'Updated vulnerable dependencies (jws, glob, validator)',
      'Added Zod validation to all API service methods',
      'Formation import flow improvements',
      'Payment flow test coverage improvements',
    ],
  },
];

export default function Changelog() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Changelog</h1>
        <p className="text-neutral-400 mb-12">
          All notable changes to FluxStudio.
        </p>

        <div className="space-y-12">
          {CHANGELOG_ENTRIES.map((entry) => (
            <article key={entry.version} className="relative pl-6 border-l-2 border-neutral-800">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-neutral-800 border-2 border-blue-500" />
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  v{entry.version}
                </span>
                <time className="text-sm text-neutral-500">{entry.date}</time>
              </div>
              <h2 className="text-xl font-semibold mb-3">{entry.title}</h2>
              <ul className="space-y-2">
                {entry.changes.map((change, i) => (
                  <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-1.5 flex-shrink-0">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
