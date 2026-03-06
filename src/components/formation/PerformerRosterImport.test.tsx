import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { PerformerRosterImport } from './PerformerRosterImport';
import type { Performer } from '../../services/formationTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCsvFile(content: string, name = 'roster.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}

const mockExistingPerformers: Performer[] = [
  { id: 'p1', name: 'Alice', label: 'A1', color: '#ff0000' },
  { id: 'p2', name: 'Bob', label: 'B1', color: '#0000ff' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PerformerRosterImport', () => {
  const onImport = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the dialog with header and step indicator', () => {
    render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: /import performer roster/i })).toBeInTheDocument();
    expect(screen.getByText('Import Roster')).toBeInTheDocument();
  });

  test('shows upload step initially with drop zone and format tips', () => {
    render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Drop your roster file here')).toBeInTheDocument();
    expect(screen.getByText(/supports csv and tsv/i)).toBeInTheDocument();
    expect(screen.getByText('Expected Format')).toBeInTheDocument();
  });

  test('file input accepts .csv, .tsv, .txt files', () => {
    render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByLabelText('Choose roster file') as HTMLInputElement;
    expect(fileInput.accept).toBe('.csv,.tsv,.txt');
  });

  test('Next button is disabled on upload step before a file is loaded', () => {
    render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  test('Cancel button calls onClose', async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('close button in header calls onClose', async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /close import dialog/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('step indicator shows correct steps', () => {
    render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Upload File')).toBeInTheDocument();
    expect(screen.getByText('Map Columns')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  test('uploading a file shows the filename and enables Next', { timeout: 15000 }, async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByLabelText('Choose roster file') as HTMLInputElement;
    const csvContent = 'Name,Label,Instrument\nAlice,A1,Trumpet\nBob,B1,Snare';
    const file = createCsvFile(csvContent, 'myband.csv');

    await user.upload(fileInput, file);

    expect(screen.getByText('myband.csv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  test('after file upload, clicking Next shows column mapping step', { timeout: 15000 }, async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByLabelText('Choose roster file') as HTMLInputElement;
    const csvContent = 'Name,Section,Instrument\nAlice,Brass,Trumpet\nBob,Percussion,Snare';
    const file = createCsvFile(csvContent);

    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Column mapping step - check table headers
    expect(screen.getByText('File Column')).toBeInTheDocument();
    expect(screen.getByText('Map To')).toBeInTheDocument();
    expect(screen.getByText('Sample Values')).toBeInTheDocument();

    // The CSV column headers should be listed as table cell text.
    // "Name" may match the dropdown option too, so check that the mapping
    // table structure is present with at least 3 mapping rows.
    const selectElements = screen.getAllByRole('combobox');
    expect(selectElements.length).toBe(3); // One per CSV column
  });

  test('column mapping step auto-detects name column and allows proceeding', { timeout: 15000 }, async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByLabelText('Choose roster file') as HTMLInputElement;
    const csvContent = 'Name,Section,Instrument\nAlice,Brass,Trumpet\nBob,Percussion,Snare';
    const file = createCsvFile(csvContent);

    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Name should be auto-detected, so Next should be enabled
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  test('preview step shows performer count and preview table', { timeout: 15000 }, async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByLabelText('Choose roster file') as HTMLInputElement;
    const csvContent = 'Name,Instrument,Section\nAlice,Trumpet,Brass\nBob,Snare,Percussion';
    const file = createCsvFile(csvContent);

    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /next/i })); // Map
    await user.click(screen.getByRole('button', { name: /next/i })); // Preview

    expect(screen.getByText('2 performers found')).toBeInTheDocument();
  });

  test('shows merge strategy options when existing performers exist', { timeout: 15000 }, async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={mockExistingPerformers}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByLabelText('Choose roster file') as HTMLInputElement;
    const csvContent = 'Name,Instrument\nCharlie,Trumpet';
    const file = createCsvFile(csvContent);

    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /next/i })); // Map
    await user.click(screen.getByRole('button', { name: /next/i })); // Preview

    expect(screen.getByText('Merge Strategy')).toBeInTheDocument();
    expect(screen.getByText('Add new only')).toBeInTheDocument();
    expect(screen.getByText('Replace all')).toBeInTheDocument();
    expect(screen.getByText('Merge by name')).toBeInTheDocument();
  });

  test('Back button navigates to previous step', { timeout: 15000 }, async () => {
    const { user } = render(
      <PerformerRosterImport
        existingPerformers={[]}
        onImport={onImport}
        onClose={onClose}
      />,
    );

    const fileInput = screen.getByLabelText('Choose roster file') as HTMLInputElement;
    const csvContent = 'Name,Instrument\nAlice,Trumpet';
    const file = createCsvFile(csvContent);

    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /next/i })); // Map

    // Now on map step, click Back
    await user.click(screen.getByText('Back'));

    // Should be back on upload step showing the uploaded filename
    expect(screen.getByText('roster.csv')).toBeInTheDocument();
  });
});
