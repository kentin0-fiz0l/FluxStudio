'use client';

import React, { useState, useCallback } from 'react';
import { ChordTimeline } from '@/components/ChordTimeline';
import {
  ChordSection,
  TimeSignature,
  createChordSection,
  defaultTimeSignature,
  formatChordSymbol,
} from '@/types/song';

/**
 * Demo page for the ChordTimeline component
 *
 * This page demonstrates the chord progression editor with:
 * - A sample 8-bar section
 * - Adjustable time signature
 * - Real-time state logging
 */
export default function ChordTimelineDemoPage() {
  // Demo state: a section with some pre-populated chords
  const [section, setSection] = useState<ChordSection>(() => {
    const s = createChordSection('Verse', 8, 0);
    // Add some sample chords
    s.chords = [
      {
        id: crypto.randomUUID(),
        bar: 1,
        beat: 1,
        durationBeats: 4,
        root: 'C',
        quality: 'maj',
      },
      {
        id: crypto.randomUUID(),
        bar: 2,
        beat: 1,
        durationBeats: 4,
        root: 'Am',
        quality: 'min',
      },
      {
        id: crypto.randomUUID(),
        bar: 3,
        beat: 1,
        durationBeats: 2,
        root: 'F',
        quality: 'maj',
      },
      {
        id: crypto.randomUUID(),
        bar: 3,
        beat: 3,
        durationBeats: 2,
        root: 'G',
        quality: '7',
      },
      {
        id: crypto.randomUUID(),
        bar: 4,
        beat: 1,
        durationBeats: 4,
        root: 'C',
        quality: 'maj',
      },
    ];
    return s;
  });

  // Time signature state (can be toggled between 4/4 and 3/4)
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(
    defaultTimeSignature()
  );

  // Handle section changes
  const handleChange = useCallback((updatedSection: ChordSection) => {
    console.log('Section updated:', updatedSection);
    console.log(
      'Chords:',
      updatedSection.chords.map((c) => ({
        symbol: formatChordSymbol(c),
        bar: c.bar,
        beat: c.beat,
        duration: c.durationBeats,
      }))
    );
    setSection(updatedSection);
  }, []);

  // Toggle time signature for demo purposes
  const toggleTimeSignature = () => {
    setTimeSignature((prev) =>
      prev.numerator === 4
        ? { numerator: 3, denominator: 4 }
        : { numerator: 4, denominator: 4 }
    );
  };

  // Adjust number of bars
  const setBars = (bars: number) => {
    setSection((prev) => ({
      ...prev,
      bars: Math.max(1, Math.min(32, bars)),
      // Filter out chords that would be outside the new bar count
      chords: prev.chords.filter((c) => c.bar <= bars),
    }));
  };

  // Clear all chords
  const clearChords = () => {
    setSection((prev) => ({ ...prev, chords: [] }));
  };

  return (
    <div className="min-h-screen bg-hw-charcoal text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-hw-brass mb-2">
            ChordTimeline Demo
          </h1>
          <p className="text-gray-400">
            Click on empty cells to add chords. Click on existing chords to edit
            or delete them.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Time Signature:</label>
            <button
              onClick={toggleTimeSignature}
              className="px-3 py-1 bg-hw-surface rounded text-hw-brass font-mono text-sm hover:bg-hw-surface/80 transition-colors"
            >
              {timeSignature.numerator}/{timeSignature.denominator}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Bars:</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBars(section.bars - 1)}
                className="w-8 h-8 bg-hw-surface rounded text-white hover:bg-hw-surface/80 transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center font-mono">{section.bars}</span>
              <button
                onClick={() => setBars(section.bars + 1)}
                className="w-8 h-8 bg-hw-surface rounded text-white hover:bg-hw-surface/80 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={clearChords}
            className="px-3 py-1 bg-hw-red/20 text-hw-red rounded text-sm hover:bg-hw-red/30 transition-colors"
          >
            Clear All Chords
          </button>
        </div>

        {/* Section name */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-section-front" />
            {section.name}
          </h2>
        </div>

        {/* ChordTimeline component */}
        <div className="overflow-x-auto pb-4">
          <ChordTimeline
            section={section}
            timeSignature={timeSignature}
            onChange={handleChange}
          />
        </div>

        {/* Current state display */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">
            Current Chords ({section.chords.length})
          </h3>
          <div className="bg-hw-surface rounded-lg p-4 overflow-x-auto">
            {section.chords.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                No chords yet. Click on a cell to add one.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-hw-charcoal">
                    <th className="text-left py-2 px-2">Chord</th>
                    <th className="text-left py-2 px-2">Bar</th>
                    <th className="text-left py-2 px-2">Beat</th>
                    <th className="text-left py-2 px-2">Duration</th>
                    <th className="text-left py-2 px-2">Root</th>
                    <th className="text-left py-2 px-2">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {section.chords
                    .sort((a, b) => {
                      if (a.bar !== b.bar) return a.bar - b.bar;
                      return a.beat - b.beat;
                    })
                    .map((chord) => (
                      <tr
                        key={chord.id}
                        className="border-b border-hw-charcoal/50 last:border-b-0"
                      >
                        <td className="py-2 px-2 font-semibold text-hw-brass">
                          {formatChordSymbol(chord)}
                        </td>
                        <td className="py-2 px-2 font-mono">{chord.bar}</td>
                        <td className="py-2 px-2 font-mono">{chord.beat}</td>
                        <td className="py-2 px-2 font-mono">
                          {chord.durationBeats} beat
                          {chord.durationBeats !== 1 ? 's' : ''}
                        </td>
                        <td className="py-2 px-2">{chord.root}</td>
                        <td className="py-2 px-2">{chord.quality}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-500">
          <h3 className="font-semibold text-gray-400 mb-2">Instructions</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Add a chord:</strong> Click on any empty beat cell in the
              grid
            </li>
            <li>
              <strong>Edit a chord:</strong> Click on an existing chord block
            </li>
            <li>
              <strong>Delete a chord:</strong> Hover over a chord and click the
              × icon, or use the delete button in the editor
            </li>
            <li>
              <strong>Change duration:</strong> Edit the Duration field in the
              chord editor
            </li>
            <li>
              <strong>Move a chord:</strong> Edit the Bar and Beat fields in the
              chord editor
            </li>
          </ul>
        </div>

        {/* JSON output for debugging */}
        <details className="mt-8">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
            Show raw section data (JSON)
          </summary>
          <pre className="mt-2 p-4 bg-hw-surface rounded-lg text-xs text-gray-400 overflow-x-auto">
            {JSON.stringify(section, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
