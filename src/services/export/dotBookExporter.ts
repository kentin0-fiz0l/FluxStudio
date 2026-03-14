/**
 * Dot Book Exporter - FluxStudio
 *
 * Generates individual performer "dot books" as per-performer PDFs.
 * Each dot book contains:
 *   - Cover page with show/performer info
 *   - Per-set pages with mini field diagram, field notation, and step info
 */

import type {
  Formation,
  Performer,
  DrillSet,
  Position,
  FieldConfig,
  CoordinateEntry,
} from '../formationTypes';
import { NCAA_FOOTBALL_FIELD } from '../fieldConfigService';
import { generateCoordinateSheet } from '../coordinateSheetGenerator';
import { hexToRgb } from './exportUtils';

// ============================================================================
// Types
// ============================================================================

export interface DotBookOptions {
  showTitle: string;
  paperSize: 'letter' | 'a4';
  includeFieldDiagram: boolean;
  includeStepInfo: boolean;
}

// ============================================================================
// Single performer dot book
// ============================================================================

export async function generateDotBook(
  performer: Performer,
  formation: Formation,
  sets: DrillSet[],
  options: DotBookOptions,
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
): Promise<Blob> {
  const entries = generateCoordinateSheet(formation, performer.id, sets, fieldConfig);
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: options.paperSize,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ---- Cover Page ----
  drawCoverPage(doc, performer, options, sortedSets.length, pageWidth, pageHeight, margin);

  // ---- Per-set pages ----
  for (let i = 0; i < entries.length; i++) {
    doc.addPage();
    const entry = entries[i];
    const set = entry.set;
    const kf = formation.keyframes.find((k) => k.id === set.keyframeId);

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${set.name}`, margin, margin + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const headerParts: string[] = [`${set.counts} counts`];
    if (set.rehearsalMark) headerParts.push(`[${set.rehearsalMark}]`);
    doc.text(headerParts.join('  '), margin, margin + 12);

    // Performer name and drill number in top-right
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${performer.name} (${performer.drillNumber ?? performer.label})`,
      pageWidth - margin,
      margin + 5,
      { align: 'right' },
    );
    doc.text(
      `Set ${i + 1} of ${entries.length}`,
      pageWidth - margin,
      margin + 11,
      { align: 'right' },
    );
    doc.setTextColor(0, 0, 0);

    let yPos = margin + 20;

    // ---- Mini Field Diagram ----
    if (options.includeFieldDiagram && kf) {
      const diagramWidth = pageWidth - margin * 2;
      const diagramHeight = diagramWidth * 0.45; // approximate field aspect ratio
      yPos = drawMiniFieldDiagram(
        doc,
        formation,
        kf.positions,
        performer.id,
        fieldConfig,
        margin,
        yPos,
        diagramWidth,
        diagramHeight,
      );
      yPos += 8;
    }

    // ---- Position in field notation ----
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Position:', margin, yPos);
    yPos += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(entry.coordinateDetails.sideToSide, margin + 4, yPos);
    yPos += 6;
    doc.text(entry.coordinateDetails.frontToBack, margin + 4, yPos);
    yPos += 10;

    // ---- Step info ----
    if (options.includeStepInfo) {
      // From previous set
      if (entry.stepFromPrev) {
        const prev = entries[i - 1];
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 160);
        doc.text(`From ${prev.set.name}:`, margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        drawStepInfoBlock(doc, entry.stepFromPrev, margin + 4, yPos);
        yPos += 20;
      }

      // To next set
      if (entry.stepToNext) {
        const next = entries[i + 1];
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 160);
        doc.text(`To ${next.set.name}:`, margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        drawStepInfoBlock(doc, entry.stepToNext, margin + 4, yPos);
        yPos += 20;
      }
    }

    // Notes
    if (set.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Notes: ${set.notes}`, margin, yPos, {
        maxWidth: pageWidth - margin * 2,
      });
      doc.setTextColor(0, 0, 0);
    }

    // Page footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by FluxStudio', margin, pageHeight - 5);
    doc.text(
      `Page ${i + 2} of ${entries.length + 1}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' },
    );
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}

// ============================================================================
// Batch: generate all dot books
// ============================================================================

/**
 * Generate dot books for multiple performers.
 * Returns a single PDF if one performer, or a ZIP of PDFs if multiple.
 */
export async function generateAllDotBooks(
  formation: Formation,
  sets: DrillSet[],
  performers: Performer[],
  options: DotBookOptions,
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  if (performers.length === 1) {
    onProgress?.(0, 1);
    const blob = await generateDotBook(performers[0], formation, sets, options, fieldConfig);
    onProgress?.(1, 1);
    return blob;
  }

  // Multiple performers: package into a ZIP
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default ?? JSZipModule;
  const zip = new JSZip();

  for (let i = 0; i < performers.length; i++) {
    onProgress?.(i, performers.length);
    const performer = performers[i];
    const blob = await generateDotBook(performer, formation, sets, options, fieldConfig);
    const filename = `${sanitizeFilename(performer.name)}_${performer.drillNumber ?? performer.label}.pdf`;
    zip.file(filename, blob);
  }

  onProgress?.(performers.length, performers.length);
  return zip.generateAsync({ type: 'blob' });
}

// ============================================================================
// Drawing helpers
// ============================================================================

function drawCoverPage(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  performer: Performer,
  options: DotBookOptions,
  totalSets: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): void {
  const centerX = pageWidth / 2;

  // Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(options.showTitle, centerX, pageHeight * 0.25, { align: 'center' });

  // Performer name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'normal');
  doc.text(performer.name, centerX, pageHeight * 0.25 + 18, { align: 'center' });

  // Drill number
  doc.setFontSize(16);
  doc.text(
    `Drill #${performer.drillNumber ?? performer.label}`,
    centerX,
    pageHeight * 0.25 + 32,
    { align: 'center' },
  );

  // Section / instrument
  if (performer.section || performer.instrument) {
    doc.setFontSize(13);
    doc.text(
      [performer.section, performer.instrument].filter(Boolean).join(' - '),
      centerX,
      pageHeight * 0.25 + 44,
      { align: 'center' },
    );
  }

  // Set count
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(`${totalSets} Sets`, centerX, pageHeight * 0.25 + 58, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString(), centerX, pageHeight * 0.25 + 68, {
    align: 'center',
  });
  doc.setTextColor(0, 0, 0);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by FluxStudio', margin, pageHeight - 5);
  doc.text(`Page 1 of ${totalSets + 1}`, pageWidth - margin, pageHeight - 5, {
    align: 'right',
  });
  doc.setTextColor(0, 0, 0);
}

function drawMiniFieldDiagram(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  formation: Formation,
  positions: Map<string, Position>,
  highlightId: string,
  _fieldConfig: FieldConfig,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  // Field background
  doc.setFillColor(245, 248, 245);
  doc.setDrawColor(180, 200, 180);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height, 'FD');

  // Yard lines
  doc.setDrawColor(200, 220, 200);
  doc.setLineWidth(0.3);
  const totalYardLines = 11; // 0,10,20...100 yard lines
  for (let i = 0; i <= totalYardLines - 1; i++) {
    const lx = x + (i / (totalYardLines - 1)) * width;
    doc.line(lx, y, lx, y + height);

    // Yard number labels
    const yardNum = i <= 5 ? i * 10 : (10 - i) * 10;
    if (yardNum > 0) {
      doc.setFontSize(5);
      doc.setTextColor(180, 200, 180);
      doc.text(String(yardNum), lx + 0.5, y + height - 1);
    }
  }
  doc.setTextColor(0, 0, 0);

  // Hash marks
  doc.setLineWidth(0.15);
  const hashY1 = y + height * 0.37;
  const hashY2 = y + height * 0.63;
  doc.setDrawColor(200, 220, 200);
  for (let i = 0; i <= 20; i++) {
    const hx = x + (i / 20) * width;
    doc.line(hx - 0.5, hashY1, hx + 0.5, hashY1);
    doc.line(hx - 0.5, hashY2, hx + 0.5, hashY2);
  }

  // Draw all performers (small dots)
  for (const performer of formation.performers) {
    const pos = positions.get(performer.id);
    if (!pos) continue;

    const cx = x + (pos.x / 100) * width;
    const cy = y + (pos.y / 100) * height;
    const isHighlighted = performer.id === highlightId;

    if (isHighlighted) {
      // Draw highlight ring
      doc.setDrawColor(255, 0, 0);
      doc.setLineWidth(0.8);
      doc.circle(cx, cy, 3, 'S');
    }

    const color = hexToRgb(performer.color);
    const radius = isHighlighted ? 2 : 1.2;
    doc.setFillColor(color.r, color.g, color.b);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, radius, 'FD');
  }

  return y + height;
}

function drawStepInfoBlock(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  stepInfo: CoordinateEntry['stepToNext'],
  x: number,
  y: number,
): void {
  if (!stepInfo) return;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const lines = [
    `Distance: ${stepInfo.distanceYards.toFixed(1)} yards`,
    `Step size: ${stepInfo.stepSizeLabel}`,
    `Direction: ${stepInfo.directionLabel}`,
    `Difficulty: ${stepInfo.difficulty}`,
  ];

  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], x, y + i * 5);
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}
