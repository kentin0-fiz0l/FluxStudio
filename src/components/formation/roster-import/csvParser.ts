/**
 * CSV/TSV parsing utilities for performer roster import
 */

import type { ColumnMapping, PerformerField } from './types';
import { PERFORMER_FIELDS } from './types';

/**
 * Parse a single CSV/TSV line, handling quoted fields.
 * Supports double-quote escaping (e.g., "field with ""quotes""").
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === delimiter) {
        fields.push(current.trim());
        current = '';
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Detect delimiter (comma or tab) from file content.
 */
export function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? '\t' : ',';
}

/**
 * Parse full CSV/TSV content into a 2D string array.
 */
export function parseCsvContent(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(content);
  const headers = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));

  return { headers, rows };
}

/**
 * Auto-detect column mappings by matching header names to performer fields.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const patterns: Record<PerformerField, RegExp> = {
    name: /^(name|performer|first\s*name|full\s*name|member)$/i,
    label: /^(label|tag|abbreviation|abbr|short\s*name)$/i,
    color: /^(color|colour|hex|marker)$/i,
    instrument: /^(instrument|inst|horn)$/i,
    section: /^(section|sec|part|voice|family)$/i,
    drillNumber: /^(drill\s*number|drill\s*#|drill\s*no|number|#|num|spot)$/i,
    group: /^(group|grp|squad|rank|file)$/i,
  };

  const assigned = new Set<PerformerField>();

  headers.forEach((header, index) => {
    const trimmed = header.trim();
    for (const field of PERFORMER_FIELDS) {
      if (assigned.has(field.value)) continue;
      if (patterns[field.value].test(trimmed)) {
        mapping[index] = field.value;
        assigned.add(field.value);
        break;
      }
    }
  });

  return mapping;
}
