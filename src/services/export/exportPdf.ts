/**
 * PDF export functions: formation PDF, coordinate sheet PDF, drill book PDF,
 * batch drill books, and production sheet PDF.
 */

import type { Formation, FormationExportOptions, DrillSet, FieldConfig, CoordinateEntry, Performer, Position } from '../formationTypes';
import type { TempoMap } from '../tempoMap';
import type { ProductionSheet } from '../productionSheet';
import { getSegmentAtCount } from '../tempoMap';
import { generateCoordinateSheet, generateDrillBookPages } from '../coordinateSheetGenerator';
import { NCAA_FOOTBALL_FIELD } from '../fieldConfigService';
import { formatTime, hexToRgb } from './exportUtils';

export async function exportToPdf(
  formation: Formation,
  options: FormationExportOptions,
  tempoMap?: TempoMap,
): Promise<Blob> {
  const { stageWidth, stageHeight, gridSize, performers, keyframes, name, description } = formation;
  const paperSize = options.paperSize ?? 'letter';
  const orientation = options.orientation ?? 'landscape';

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation, unit: 'mm', format: paperSize });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2 - 30;

  const scaleX = contentWidth / stageWidth;
  const scaleY = contentHeight / stageHeight;
  const scale = Math.min(scaleX, scaleY);

  const stageDrawWidth = stageWidth * scale;
  const stageDrawHeight = stageHeight * scale;
  const offsetX = margin + (contentWidth - stageDrawWidth) / 2;
  const offsetY = margin + 25 + (contentHeight - stageDrawHeight) / 2;

  for (let i = 0; i < keyframes.length; i++) {
    if (i > 0) doc.addPage();
    const keyframe = keyframes[i];

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(name, margin, margin + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (description) doc.text(description, margin, margin + 12);

    const timeStr = formatTime(keyframe.timestamp);
    doc.text(`Keyframe ${i + 1} of ${keyframes.length} - ${timeStr}`, margin, margin + 19);

    if (options.includeTimestamps) {
      doc.setFontSize(8);
      doc.text(timeStr, pageWidth - margin - 15, margin + 5);
    }

    // Page number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i + 1} of ${keyframes.length}`, pageWidth - margin, pageHeight - margin + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Count annotation (for drill charts)
    if (i > 0) {
      const prevTimestamp = keyframes[i - 1].timestamp;
      const countDuration = keyframe.timestamp - prevTimestamp;
      const counts = Math.round(countDuration / 500); // ~120 BPM -> 1 count per 500ms
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(`${counts} counts from prev`, pageWidth - margin - 15, margin + 12);
      doc.setTextColor(0, 0, 0);
    }

    // Tempo map annotations (measure, section, tempo)
    if (tempoMap && tempoMap.segments.length > 0) {
      // Estimate count for this keyframe based on index
      const estimatedCount = i > 0 ? i * 8 : 1; // rough heuristic; each set ~8 counts
      const segment = getSegmentAtCount(estimatedCount, tempoMap);
      if (segment) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 160);

        const measureLabel = `M. ${segment.startBar}`;
        const sectionLabel = segment.sectionName ? `\u00A7 ${segment.sectionName}` : '';
        const tempoLabel = `\u2669 = ${Math.round(segment.tempoStart)} BPM`;

        let annotX = margin;
        doc.text(measureLabel, annotX, margin - 1);
        annotX += doc.getTextWidth(measureLabel) + 6;

        if (sectionLabel) {
          doc.text(sectionLabel, annotX, margin - 1);
          annotX += doc.getTextWidth(sectionLabel) + 6;
        }

        doc.text(tempoLabel, annotX, margin - 1);
        doc.setTextColor(0, 0, 0);
      }
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(200, 200, 200);
    doc.rect(offsetX, offsetY, stageDrawWidth, stageDrawHeight, 'FD');

    // Field overlay (yard lines)
    if (options.includeFieldOverlay) {
      doc.setDrawColor(180, 200, 180);
      doc.setLineWidth(0.3);
      // Draw 11 yard lines (0 to 100 yards, every 10)
      for (let yard = 0; yard <= 10; yard++) {
        const yardX = offsetX + (yard / 10) * stageDrawWidth;
        doc.line(yardX, offsetY, yardX, offsetY + stageDrawHeight);
        // Yard number labels
        const yardNum = yard <= 5 ? yard * 10 : (10 - yard) * 10;
        if (yardNum > 0) {
          doc.setFontSize(6);
          doc.setTextColor(150, 180, 150);
          doc.text(String(yardNum), yardX + 1, offsetY + stageDrawHeight - 1);
          doc.setTextColor(0, 0, 0);
        }
      }
      // Hash marks (two horizontal lines at ~1/3 and 2/3 height)
      doc.setLineWidth(0.15);
      const hashY1 = offsetY + stageDrawHeight * 0.35;
      const hashY2 = offsetY + stageDrawHeight * 0.65;
      for (let yard = 0; yard <= 100; yard += 5) {
        const hx = offsetX + (yard / 100) * stageDrawWidth;
        doc.line(hx - 1, hashY1, hx + 1, hashY1);
        doc.line(hx - 1, hashY2, hx + 1, hashY2);
      }
    }

    if (options.includeGrid) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      for (let x = 0; x <= stageWidth; x += gridSize) {
        const lineX = offsetX + x * scale;
        doc.line(lineX, offsetY, lineX, offsetY + stageDrawHeight);
      }
      for (let y = 0; y <= stageHeight; y += gridSize) {
        const lineY = offsetY + y * scale;
        doc.line(offsetX, lineY, offsetX + stageDrawWidth, lineY);
      }
    }

    const positions = keyframe.positions;
    for (const performer of performers) {
      const pos = positions.get(performer.id);
      if (!pos) continue;

      const cx = offsetX + (pos.x / 100) * stageDrawWidth;
      const cy = offsetY + (pos.y / 100) * stageDrawHeight;
      const radius = 3;

      const color = hexToRgb(performer.color);
      doc.setFillColor(color.r, color.g, color.b);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.circle(cx, cy, radius, 'FD');

      if (pos.rotation !== undefined && pos.rotation !== 0) {
        const angle = (pos.rotation * Math.PI) / 180;
        const arrowLength = radius + 2;
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.8);
        doc.line(cx, cy, cx + Math.cos(angle) * arrowLength, cy + Math.sin(angle) * arrowLength);
      }

      if (options.includeLabels) {
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(performer.label, cx, cy + 1.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
    }

    doc.setFontSize(8);
    let legendX = margin;
    const legendY = pageHeight - margin;
    for (const performer of performers.slice(0, 10)) {
      const color = hexToRgb(performer.color);
      doc.setFillColor(color.r, color.g, color.b);
      doc.circle(legendX + 2, legendY - 2, 2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(`${performer.label}: ${performer.name}`, legendX + 6, legendY - 0.5);
      legendX += 40;
      if (legendX > pageWidth - margin - 40) break;
    }
    if (performers.length > 10) {
      doc.text(`... and ${performers.length - 10} more`, legendX + 6, legendY - 0.5);
    }
  }

  return doc.output('blob');
}

/**
 * Export a coordinate sheet PDF for a single performer.
 */
export async function exportToCoordinateSheetPdf(
  formation: Formation,
  performerId: string,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
  tempoMap?: TempoMap,
): Promise<Blob> {
  const performer = formation.performers.find((p) => p.id === performerId);
  if (!performer) throw new Error(`Performer ${performerId} not found`);

  const entries = generateCoordinateSheet(formation, performerId, sets, fieldConfig);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formation.name, margin, margin + 5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${performer.name}${performer.drillNumber ? ` (${performer.drillNumber})` : ''}`, margin, margin + 12);
  if (performer.instrument || performer.section) {
    doc.setFontSize(9);
    doc.text(
      [performer.section, performer.instrument].filter(Boolean).join(' - '),
      margin,
      margin + 18,
    );
  }

  // Table header -- add Section & Tempo columns when tempoMap is provided
  let y = margin + 26;
  const colWidths = tempoMap
    ? [18, 14, 30, 30, 24, 24, 24, 18]
    : [22, 16, 42, 42, 28, 28];
  const headers = tempoMap
    ? ['Set', 'Cts', 'Side-to-Side', 'Front-to-Back', 'Step Size', 'Direction', 'Section', 'Tempo']
    : ['Set', 'Cts', 'Side-to-Side', 'Front-to-Back', 'Step Size', 'Direction'];

  doc.setFillColor(240, 240, 245);
  doc.rect(margin, y - 4, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let xOff = margin;
  for (let c = 0; c < headers.length; c++) {
    doc.text(headers[c], xOff + 1, y);
    xOff += colWidths[c];
  }
  y += 6;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  // Track cumulative counts for tempo map lookups
  let cumulativeCount = 1;

  for (const entry of entries) {
    if (y > 260) {
      doc.addPage();
      y = margin + 10;
    }

    // Alternating row background
    if (entries.indexOf(entry) % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 3.5, contentWidth, 5.5, 'F');
    }

    // Build row data
    const baseRow = [
      entry.set.name,
      String(entry.set.counts),
      entry.coordinateDetails.sideToSide,
      entry.coordinateDetails.frontToBack,
      entry.stepToNext?.stepSizeLabel ?? '-',
      entry.stepToNext?.directionLabel ?? '-',
    ];

    if (tempoMap) {
      const segment = getSegmentAtCount(cumulativeCount, tempoMap);
      baseRow.push(segment?.sectionName ?? '-');
      baseRow.push(segment ? `${Math.round(segment.tempoStart)}` : '-');
    }

    xOff = margin;
    for (let c = 0; c < baseRow.length; c++) {
      doc.text(baseRow[c], xOff + 1, y, { maxWidth: colWidths[c] - 2 });
      xOff += colWidths[c];
    }
    y += 5.5;
    cumulativeCount += entry.set.counts;
  }

  return doc.output('blob');
}

/**
 * Export a full drill book PDF for a single performer.
 * Includes: cover page, field chart per set, coordinate sheet, step size summary.
 */
export async function exportToDrillBookPdf(
  formation: Formation,
  performerId: string,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
): Promise<Blob> {
  const pages = generateDrillBookPages(formation, performerId, sets, fieldConfig);
  if (pages.length === 0) throw new Error('No pages generated for drill book');

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage();
    const page = pages[i];

    switch (page.type) {
      case 'cover': {
        const d = page.data as { showName: string; performerName: string; drillNumber: string; instrument?: string; section?: string; totalSets: number };
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text(d.showName, pageWidth / 2, pageHeight / 3, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'normal');
        doc.text(d.performerName, pageWidth / 2, pageHeight / 3 + 16, { align: 'center' });

        doc.setFontSize(14);
        doc.text(`Drill #${d.drillNumber}`, pageWidth / 2, pageHeight / 3 + 28, { align: 'center' });

        if (d.section || d.instrument) {
          doc.setFontSize(12);
          doc.text(
            [d.section, d.instrument].filter(Boolean).join(' - '),
            pageWidth / 2,
            pageHeight / 3 + 38,
            { align: 'center' },
          );
        }

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`${d.totalSets} Sets`, pageWidth / 2, pageHeight / 3 + 50, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        break;
      }

      case 'chart': {
        const d = page.data as { positions: Record<string, Position>; highlightPerformerId: string; set: DrillSet; fieldConfig: FieldConfig };
        // Header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.set.name} — ${d.set.counts} counts`, margin, margin + 5);
        if (d.set.rehearsalMark) {
          doc.setFont('helvetica', 'normal');
          doc.text(`[${d.set.rehearsalMark}]`, margin + 80, margin + 5);
        }

        // Draw field
        const chartW = pageWidth - margin * 2;
        const chartH = pageHeight - margin * 2 - 20;
        const chartY = margin + 12;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, chartY, chartW, chartH, 'FD');

        // Draw performers
        const positions = d.positions;
        for (const performer of formation.performers) {
          const pos = positions[performer.id];
          if (!pos) continue;

          const cx = margin + (pos.x / 100) * chartW;
          const cy = chartY + (pos.y / 100) * chartH;
          const isHighlighted = performer.id === d.highlightPerformerId;
          const radius = isHighlighted ? 4 : 2.5;

          if (isHighlighted) {
            // Draw highlight ring
            doc.setDrawColor(255, 0, 0);
            doc.setLineWidth(1);
            doc.circle(cx, cy, radius + 2, 'S');
          }

          const color = hexToRgb(performer.color);
          doc.setFillColor(color.r, color.g, color.b);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          doc.circle(cx, cy, radius, 'FD');

          if (isHighlighted) {
            doc.setFontSize(6);
            doc.setTextColor(255, 0, 0);
            doc.text('YOU', cx, cy + radius + 5, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        }
        break;
      }

      case 'coordinates': {
        const d = page.data as { entries: CoordinateEntry[] };
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Coordinate Sheet — ${page.performerName}`, margin, margin + 5);

        let y = margin + 14;
        const cw = [22, 14, 40, 40, 26, 26, 20];
        const ch = ['Set', 'Cts', 'S/S', 'F/B', 'Step Size', 'Direction', 'Diff'];

        doc.setFillColor(230, 230, 240);
        doc.rect(margin, y - 3, pageWidth - margin * 2, 6, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        let xx = margin;
        for (let c = 0; c < ch.length; c++) {
          doc.text(ch[c], xx + 1, y);
          xx += cw[c];
        }
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        for (const entry of d.entries) {
          if (y > pageHeight - margin - 5) {
            doc.addPage();
            y = margin + 10;
          }

          xx = margin;
          const row = [
            entry.set.name,
            String(entry.set.counts),
            entry.coordinateDetails.sideToSide,
            entry.coordinateDetails.frontToBack,
            entry.stepToNext?.stepSizeLabel ?? '-',
            entry.stepToNext?.directionLabel ?? '-',
            entry.stepToNext?.difficulty ?? '-',
          ];
          for (let c = 0; c < row.length; c++) {
            doc.text(row[c], xx + 1, y, { maxWidth: cw[c] - 2 });
            xx += cw[c];
          }
          y += 4.5;
        }
        break;
      }

      case 'summary': {
        const d = page.data as { totalSets: number; totalDistance: string; hardSteps: number; moderateSteps: number; easySteps: number; worstStep: { setName: string; stepSize: string } | null };
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Step Size Summary — ${page.performerName}`, margin, margin + 8);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        let y = margin + 22;

        const summaryRows = [
          ['Total Sets:', String(d.totalSets)],
          ['Total Distance:', `${d.totalDistance} yards`],
          ['Easy Steps (8+ to 5):', String(d.easySteps)],
          ['Moderate Steps (6-7 to 5):', String(d.moderateSteps)],
          ['Hard Steps (<6 to 5):', String(d.hardSteps)],
        ];

        if (d.worstStep) {
          summaryRows.push(['Hardest Transition:', `${d.worstStep.setName} (${d.worstStep.stepSize})`]);
        }

        for (const [label, value] of summaryRows) {
          doc.setFont('helvetica', 'bold');
          doc.text(label, margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(value, margin + 70, y);
          y += 8;
        }
        break;
      }
    }

    // Page number footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i + 1} of ${pages.length}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}

/**
 * Export drill books for all performers as individual PDFs.
 * Returns a Map of performerId -> Blob.
 */
export async function exportAllDrillBooks(
  formation: Formation,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
  onProgress?: (performerIndex: number, total: number) => void,
): Promise<Map<string, { performer: Performer; pdf: Blob }>> {
  const result = new Map<string, { performer: Performer; pdf: Blob }>();

  for (let i = 0; i < formation.performers.length; i++) {
    const performer = formation.performers[i];
    onProgress?.(i, formation.performers.length);

    const pdf = await exportToDrillBookPdf(formation, performer.id, sets, fieldConfig);
    result.set(performer.id, { performer, pdf });
  }

  return result;
}

/**
 * Export production sheet as a formatted PDF table.
 */
export async function exportProductionSheetPdf(sheet: ProductionSheet): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Title header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Production Sheet', margin, margin + 6);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const totalDurationSec = Math.round(sheet.totalDurationMs / 1000);
  const durationMin = Math.floor(totalDurationSec / 60);
  const durationSec = totalDurationSec % 60;
  doc.text(
    `Total Counts: ${sheet.totalCounts}  |  Duration: ${durationMin}:${durationSec.toString().padStart(2, '0')}`,
    margin,
    margin + 13,
  );
  doc.setTextColor(0, 0, 0);

  // Table setup
  const colWidths = [16, 32, 22, 22, 24, 18, 22, contentWidth - 156];
  const colHeaders = ['Set', 'Section', 'Measures', 'Counts', 'Cumulative', 'Tempo', 'Reh. Mark', 'Notes'];

  let y = margin + 22;

  // Table header row
  doc.setFillColor(55, 65, 81);
  doc.rect(margin, y - 4, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  let xOff = margin;
  for (let c = 0; c < colHeaders.length; c++) {
    doc.text(colHeaders[c], xOff + 1, y);
    xOff += colWidths[c];
  }
  doc.setTextColor(0, 0, 0);
  y += 6;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  for (let idx = 0; idx < sheet.entries.length; idx++) {
    const entry = sheet.entries[idx];

    if (y > pageHeight - margin - 10) {
      doc.addPage();
      y = margin + 10;
    }

    // Alternating row background
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 3.5, contentWidth, 5.5, 'F');
    }

    xOff = margin;
    const row = [
      entry.setId,
      entry.sectionName ?? '-',
      `${entry.startMeasure}-${entry.endMeasure}`,
      String(entry.counts),
      String(entry.cumulativeCount),
      `${Math.round(entry.tempo)}`,
      entry.rehearsalMark ?? '-',
      entry.notes ?? '',
    ];

    for (let c = 0; c < row.length; c++) {
      doc.text(row[c], xOff + 1, y, { maxWidth: colWidths[c] - 2 });
      xOff += colWidths[c];
    }
    y += 5.5;
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by FluxStudio', margin, pageHeight - 5);
  doc.setTextColor(0, 0, 0);

  return doc.output('blob');
}
