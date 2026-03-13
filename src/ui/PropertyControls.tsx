import * as React from 'react';

export type SegmentOption = {
  value: string;
  label?: string;
  icon?: React.ReactNode;
};

export const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="field-row">
    <label>{label}</label>
    {children}
  </div>
);

export const TextInputControl = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [innerValue, setInnerValue] = React.useState(value);
  const composingRef = React.useRef(false);

  React.useEffect(() => {
    if (!composingRef.current) {
      setInnerValue(value);
    }
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInnerValue(nextValue);
    if (!composingRef.current) {
      onChange(nextValue);
    }
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = (event: React.CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    const nextValue = event.currentTarget.value;
    setInnerValue(nextValue);
    onChange(nextValue);
  };

  return (
    <input
      type="text"
      value={innerValue}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
};

export const NumberInputControl = ({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) => (
  <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
);

export const CheckboxControl = ({
  value,
  onChange
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 'auto' }}
    />
  </div>
);

export const SwitchControl = ({
  value,
  onChange
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className="switch">
    <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    <span className="slider"></span>
  </label>
);

export const SelectControl = ({
  value,
  onChange,
  children
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {children}
  </select>
);

export const ColorControl = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '30px', padding: 0, flex: 'none' }}
    />
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export const SegmentedControl = ({
  value,
  options,
  onChange,
  groupClassName,
  buttonClassName
}: {
  value: string;
  options: SegmentOption[];
  onChange: (value: string) => void;
  groupClassName?: string;
  buttonClassName?: string;
}) => (
  <div className={groupClassName || 'segment-group'}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className={`${buttonClassName || 'segment-button'} ${value === option.value ? 'active' : ''}`}
        onClick={() => onChange(option.value)}
      >
        {option.icon ?? option.label}
      </button>
    ))}
  </div>
);
