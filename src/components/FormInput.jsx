import React from 'react';

export default function FormInput({
  label, name, type = 'text', placeholder,
  value, onChange, error, required,
  min, max, step, readOnly, disabled,
  prefix, suffix, className = '',
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
      <div className="flex">
        {prefix && (
          <span className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-lg
                           bg-gray-50 text-gray-400 text-sm font-medium select-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
          readOnly={readOnly}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`
            w-full px-3 py-2 text-sm border transition-colors
            focus:outline-none focus:ring-2
            ${prefix ? 'rounded-l-none rounded-r-lg' : suffix ? 'rounded-l-lg rounded-r-none' : 'rounded-lg'}
            ${readOnly || disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'}
            ${error
              ? 'border-red-400 focus:ring-red-100 focus:border-red-400'
              : 'border-gray-200 focus:ring-gray-100 focus:border-gray-400'}
          `}
        />
        {suffix && (
          <span className="flex items-center px-3 border border-l-0 border-gray-200 rounded-r-lg
                           bg-gray-50 text-gray-400 text-sm select-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 leading-tight">{error}</p>}
      {hint  && !error && <p className="text-[11px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  );
}
