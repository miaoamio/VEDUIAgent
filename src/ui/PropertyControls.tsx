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
}) => (
  <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
);

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
    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #E6E6E6' }}
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
