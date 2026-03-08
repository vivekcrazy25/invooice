import React from 'react';

export default function FormSelect({
  label, name, value, onChange,
  options = [], error, required,
  placeholder, className = '', disabled,
  hint,
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-sm border rounded-lg transition-colors bg-white
          focus:outline-none focus:ring-2
          ${disabled ? 'text-gray-400 cursor-not-allowed bg-gray-50' : ''}
          ${error
            ? 'border-red-400 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-200 focus:ring-gray-100 focus:border-gray-400'}
        `}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      {error && <p className="text-[11px] text-red-500 leading-tight">{error}</p>}
      {hint  && !error && <p className="text-[11px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  );
}
