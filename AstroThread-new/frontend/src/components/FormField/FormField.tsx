
import { useState } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import "./FormField.css";

interface FieldBaseProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  labelAction?: ReactNode;
}

interface TextFieldProps extends FieldBaseProps {
  type?: "text" | "email";
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  labelAction?: ReactNode;
  children: ReactNode;
}

function getDescriptionIds(id: string, hint?: ReactNode, error?: string) {
  const ids = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""];
  const describedBy = ids.filter(Boolean).join(" ");

  return describedBy || undefined;
}

function FieldShell({
  id,
  label,
  error,
  hint,
  labelAction,
  children,
}: FieldShellProps) {
  return (
    <div className={`form-field${error ? " form-field--invalid" : ""}`}>
      <div className="form-field__label-row">
        <label className="form-field__label" htmlFor={id}>
          {label}
        </label>
        {labelAction}
      </div>

      {children}

      {hint && (
        <p id={`${id}-hint`} className="form-field__hint">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="form-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  error,
  hint,
  labelAction,
  type = "text",
  ...inputProps
}: TextFieldProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      labelAction={labelAction}
    >
      <input
        {...inputProps}
        id={id}
        type={type}
        className="form-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescriptionIds(id, hint, error)}
      />
    </FieldShell>
  );
}

export function PasswordField({
  id,
  label,
  error,
  hint,
  labelAction,
  ...inputProps
}: FieldBaseProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      labelAction={labelAction}
    >
      <div className="form-field__control">
        <input
          {...inputProps}
          id={id}
          type={isVisible ? "text" : "password"}
          className="form-field__input form-field__input--with-action"
          aria-invalid={error ? true : undefined}
          aria-describedby={getDescriptionIds(id, hint, error)}
        />

        <button
          type="button"
          className="form-field__toggle"
          aria-controls={id}
          aria-pressed={isVisible}
          aria-label={isVisible ? "Hide password" : "Show password"}
          disabled={inputProps.disabled}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2" />
              <path d="M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </FieldShell>
  );
}

interface CheckboxFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  id: string;
  label: string;
}

export function CheckboxField({
  id,
  label,
  ...inputProps
}: CheckboxFieldProps) {
  return (
    <div className="checkbox-field">
      <input
        {...inputProps}
        id={id}
        type="checkbox"
        className="checkbox-field__input"
      />
      <label className="checkbox-field__label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  hint?: ReactNode;
}

export function SelectField({
  id,
  label,
  options,
  error,
  hint,
  ...selectProps
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="form-field__control">
        <select
          {...selectProps}
          id={id}
          className="form-field__input form-field__select"
          aria-invalid={error ? true : undefined}
          aria-describedby={getDescriptionIds(id, hint, error)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <svg
          className="form-field__select-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </FieldShell>
  );
}
