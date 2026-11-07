import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

type ButtonVariant = "primary" | "secondary" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  loadingText,
  className,
  disabled,
  type = "button",
  ...buttonProps
}: ButtonProps) {
  const classNames = [
    "button",
    `button--${variant}`,
    fullWidth ? "button--full-width" : "",
    isLoading ? "button--loading" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      type={type}
      className={classNames}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      {isLoading && <span className="button__spinner" aria-hidden="true" />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
}