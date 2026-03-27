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
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!composingRef.current) {
      setInnerValue(value);
    }
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    // IME 组合期间只更新 DOM 不触发 React 重渲染，避免抖动
    if (composingRef.current) {
      return;
    }
    setInnerValue(nextValue);
    onChange(nextValue);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = (event: React.CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    // compositionEnd 后从 DOM 读取最终值
    const nextValue = event.currentTarget.value;
    setInnerValue(nextValue);
    onChange(nextValue);
  };

  return (
    <input
      ref={inputRef}
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
  <div className="select-control">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
    <span className="select-icon-wrapper" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.46129 3.67509C3.22783 3.44164 2.84933 3.44164 2.61587 3.67509L2.19316 4.0978C1.9597 4.33126 1.9597 4.70977 2.19316 4.94322L5.57484 8.32491C5.6922 8.44226 5.8462 8.50062 6.00001 8.49999C6.15382 8.50062 6.30782 8.44226 6.42518 8.32491L9.80686 4.94322C10.0403 4.70977 10.0403 4.33126 9.80686 4.0978L9.38415 3.67509C9.15069 3.44164 8.77219 3.44164 8.53873 3.67509L6.00001 6.21381L3.46129 3.67509Z"
          fill="currentColor"
        />
      </svg>
    </span>
  </div>
);

export const ColorControl = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="color-control">
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
