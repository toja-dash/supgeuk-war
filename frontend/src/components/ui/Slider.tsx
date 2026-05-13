interface SliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  accentColor?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  accentColor = '#6366F1',
}: SliderProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="flex items-center justify-between text-xs">
          <span className="text-ink-secondary">{label}</span>
          <span className="font-numeric text-ink-primary">
            {value > 0 ? '+' : ''}
            {value.toFixed(1)}
          </span>
        </span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 outline-none accent-brand-primary"
        style={
          {
            background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${
              ((value - min) / (max - min)) * 100
            }%, #1F2937 ${((value - min) / (max - min)) * 100}%, #1F2937 100%)`,
          } as React.CSSProperties
        }
      />
    </label>
  );
}
