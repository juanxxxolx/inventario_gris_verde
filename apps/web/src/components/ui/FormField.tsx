import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  fullWidth?: boolean | undefined;
}

export function FormField({
  label,
  htmlFor,
  children,
  hint,
  error,
  required = false,
  fullWidth = false,
}: FormFieldProps) {
  return (
    <div className={`field${fullWidth ? ' form-grid__full' : ''}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <span className="field__error" id={`${htmlFor}-error`} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
