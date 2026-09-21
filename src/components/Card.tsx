import type { ReactNode } from 'react';

export function Card({ title, sub, controls, children, wide }: {
  title: string;
  sub?: string;
  controls?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`card${wide ? ' wide' : ''}`}>
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {sub && <p className="card-sub">{sub}</p>}
        </div>
        {controls && <div className="card-controls">{controls}</div>}
      </header>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
