/**
 * SnapResolutionSelector - Inline toolbar for choosing snap resolution
 */

interface SnapResolutionSelectorProps {
  value: 'beat' | 'half-beat' | 'measure';
  onChange: (resolution: 'beat' | 'half-beat' | 'measure') => void;
}

const SNAP_RESOLUTION_OPTIONS: {
  value: 'beat' | 'half-beat' | 'measure';
  label: string;
  symbol: string;
}[] = [
  { value: 'beat', label: 'Beat', symbol: '\u2669' },
  { value: 'half-beat', label: 'Half-Beat', symbol: '\u266A' },
  { value: 'measure', label: 'Measure', symbol: '\uD834\uDD00' },
];

export function SnapResolutionSelector({ value, onChange }: SnapResolutionSelectorProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1"
      role="radiogroup"
      aria-label="Snap resolution"
    >
      <span className="text-xs text-neutral-400 mr-1 select-none">Snap:</span>
      {SNAP_RESOLUTION_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          aria-label={opt.label}
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors select-none ${
            value === opt.value
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
          }`}
        >
          <span className="mr-1">{opt.symbol}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
