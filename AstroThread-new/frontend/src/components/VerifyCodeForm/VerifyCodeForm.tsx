import { useEffect, useId, useRef, useState } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from "react";
import { Button } from "../Button/Button";
import { FormAlert } from "../FormAlert/FormAlert";
import "./VerifyCodeForm.css";

const RESEND_WAIT_SECONDS = 30;

type VerifyStatus = "idle" | "submitting" | "success";

interface VerifyCodeFormProps {
  length?: number;
  status: VerifyStatus;
  submitLabel: string;
  loadingText: string;
  hint?: ReactNode;
  error?: string;
  successMessage?: ReactNode;
  onVerify: (code: string) => void;
  onResend: () => Promise<boolean>;
  onChangeEmail: () => void;
}

interface CodeInputProps {
  length: number;
  value: string;
  invalid: boolean;
  disabled: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
}

function CodeInput({
  length,
  value,
  invalid,
  disabled,
  describedBy,
  onChange,
  onComplete,
}: CodeInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function focusAt(index: number) {
    inputs.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  }

  function commit(nextDigits: string[]) {
    const next = nextDigits.join("");
    onChange(next);

    if (nextDigits.every(Boolean)) {
      onComplete(next);
    }
  }

  function fillFrom(index: number, text: string) {
    const nextDigits = [...digits];

    text.split("").forEach((digit, offset) => {
      if (index + offset < length) {
        nextDigits[index + offset] = digit;
      }
    });

    commit(nextDigits);
    focusAt(index + text.length);
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value.replace(/\D/g, "");

    if (typed.length > 1) {
      fillFrom(index, typed.slice(0, length));
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = typed;
    commit(nextDigits);

    if (typed && index < length - 1) {
      focusAt(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      onChange(nextDigits.join(""));
      focusAt(index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);

    if (!pasted) {
      return;
    }

    event.preventDefault();
    fillFrom(index, pasted);
  }

  return (
    <div className="code-input" role="group" aria-label={`${length}-digit code`}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element: HTMLInputElement | null) => {
            inputs.current[index] = element;
          }}
          className="code-input__digit"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          value={digit}
          onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange(index, event)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, event)}
          onPaste={(event: ClipboardEvent<HTMLInputElement>) => handlePaste(index, event)}
          onFocus={(event: FocusEvent<HTMLInputElement>) => event.target.select()}
        />
      ))}
    </div>
  );
}

export function VerifyCodeForm({
  length = 6,
  status,
  submitLabel,
  loadingText,
  hint,
  error,
  successMessage,
  onVerify,
  onResend,
  onChangeEmail,
}: VerifyCodeFormProps) {
  const errorId = useId();
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");
  const [resendNotice, setResendNotice] = useState("");
  const [resendLeft, setResendLeft] = useState(RESEND_WAIT_SECONDS);
  const [isResending, setIsResending] = useState(false);

  const isBusy = status !== "idle" || isResending;
  const shownError = localError || error;

  useEffect(() => {
    if (resendLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setResendLeft((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendLeft]);

  useEffect(() => {
    if (error) {
      setCode("");
    }
  }, [error]);

  function verify(value: string) {
    if (isBusy) {
      return;
    }

    if (!new RegExp(`^\\d{${length}}$`).test(value)) {
      setLocalError(`Enter all ${length} digits of the code.`);
      return;
    }

    setLocalError("");
    setResendNotice("");
    onVerify(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verify(code);
  }

  async function handleResend() {
    setIsResending(true);
    setLocalError("");
    const sent = await onResend();
    setIsResending(false);

    if (sent) {
      setCode("");
      setResendNotice("We sent you a new code.");
      setResendLeft(RESEND_WAIT_SECONDS);
    }
  }

  return (
    <div className="verify-code">
      {hint && <p className="verify-code__hint">{hint}</p>}

      <form className="verify-code__form" noValidate onSubmit={handleSubmit}>
        {resendNotice && status === "idle" && (
          <FormAlert tone="success">{resendNotice}</FormAlert>
        )}

        {status === "success" && successMessage && (
          <FormAlert tone="success">{successMessage}</FormAlert>
        )}

        <CodeInput
          length={length}
          value={code}
          invalid={Boolean(shownError)}
          disabled={isBusy}
          describedBy={shownError ? errorId : undefined}
          onChange={(value) => {
            setCode(value);
            setLocalError("");
          }}
          onComplete={verify}
        />

        {shownError && (
          <p id={errorId} className="verify-code__error" role="alert">
            {shownError}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          isLoading={status === "submitting"}
          loadingText={loadingText}
          disabled={status === "success" || isResending}
        >
          {submitLabel}
        </Button>
      </form>

      <div className="verify-code__actions">
        <Button variant="text" disabled={isBusy} onClick={onChangeEmail}>
          Use a different email
        </Button>
        <Button
          variant="text"
          disabled={isBusy || resendLeft > 0}
          onClick={() => void handleResend()}
        >
          {resendLeft > 0 ? `Resend code in ${resendLeft}s` : "Resend code"}
        </Button>
      </div>
    </div>
  );
}