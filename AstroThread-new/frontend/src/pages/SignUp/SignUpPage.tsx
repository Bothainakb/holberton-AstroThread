import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Button } from "../../components/Button/Button";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import { CheckboxField, TextField } from "../../components/FormField/FormField";
import { VerifyCodeForm } from "../../components/VerifyCodeForm/VerifyCodeForm";
import {
  IS_DEMO_AUTH,
  LOGIN_CODE_LENGTH,
  requestSignUpCode,
  verifySignUpCode,
} from "../../data/demoAuth";
import type { DemoSession } from "../../data/demoAuth";
import { buildAuthHref, getReturnPath } from "../../lib/authRedirect";
import { navigate, routes, useLocation } from "../../lib/router";
import {
  getFirstErrorField,
  hasFieldErrors,
  validateEmail,
  validateFullName,
  validateTerms,
} from "../../lib/validation";
import type { FieldErrors } from "../../lib/validation";
import "./SignUpPage.css";

type SignUpStep = "details" | "code";
type SignUpField = "fullName" | "email" | "terms";
type FormStatus = "idle" | "submitting" | "success";

const SIGN_UP_FIELDS: readonly SignUpField[] = ["fullName", "email", "terms"];

const FIELD_IDS: Record<SignUpField, string> = {
  fullName: "sign-up-full-name",
  email: "sign-up-email",
  terms: "sign-up-terms",
};

const TERMS_ERROR_ID = "sign-up-terms-error";
const REDIRECT_DELAY_MS = 1200;

export function SignUpPage() {
  const { searchParams } = useLocation();

  const [step, setStep] = useState<SignUpStep>("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({});
  const [emailExists, setEmailExists] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [verifyError, setVerifyError] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const redirectTimer = useRef<number | undefined>(undefined);
  const pendingFocus = useRef<SignUpField | null>(null);

  useEffect(() => {
    return () => window.clearTimeout(redirectTimer.current);
  }, []);

  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(FIELD_IDS[pendingFocus.current])?.focus();
      pendingFocus.current = null;
    }
  });

  const isBusy = status !== "idle";

  function clearError(field: SignUpField) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    const nextErrors: FieldErrors<SignUpField> = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      terms: validateTerms(acceptedTerms),
    };

    setErrors(nextErrors);
    setEmailExists(false);

    if (hasFieldErrors(nextErrors)) {
      pendingFocus.current = getFirstErrorField(SIGN_UP_FIELDS, nextErrors) ?? null;
      return;
    }

    setStatus("submitting");
    const result = await requestSignUpCode(email, fullName);
    setStatus("idle");

    if (!result.ok) {
      if (result.reason === "error") {
        setErrors((current) => ({ ...current, email: result.message }));
      } else {
        setEmailExists(true);
      }

      pendingFocus.current = "email";
      return;
    }

    setVerifyError("");
    setStep("code");
  }

  async function handleVerify(code: string) {
    setVerifyError("");
    setStatus("submitting");
    const result = await verifySignUpCode(fullName, email, code);

    if (!result.ok) {
      setStatus("idle");
      setVerifyError(result.message);
      return;
    }

    setSession(result.session);
    setStatus("success");
    redirectTimer.current = window.setTimeout(() => {
      navigate(getReturnPath(searchParams));
    }, REDIRECT_DELAY_MS);
  }

  async function handleResend() {
    const result = await requestSignUpCode(email, fullName);
    return result.ok;
  }

  function changeEmail() {
    setStep("details");
    setStatus("idle");
    setVerifyError("");
    pendingFocus.current = "email";
  }

  const logInHref = buildAuthHref(routes.signIn, email, searchParams);
  const firstName = session?.fullName.split(/\s+/)[0] ?? "";

  if (step === "code") {
    return (
      <AuthLayout
        pageTitle="Sign up"
        title="Check your email"
        description={
          <>
            Enter the {LOGIN_CODE_LENGTH}-digit code we sent to{" "}
            <strong>{email.trim()}</strong>. It expires in 10 minutes.
          </>
        }
      >
        <VerifyCodeForm
          length={LOGIN_CODE_LENGTH}
          status={status}
          submitLabel="Create account"
          loadingText="Creating account…"
          hint={IS_DEMO_AUTH ? `Demo: no email is sent. Enter any ${LOGIN_CODE_LENGTH} digits.` : undefined}
          error={verifyError}
          successMessage={session ? `Account created. Welcome, ${firstName}.` : undefined}
          onVerify={(code) => void handleVerify(code)}
          onResend={handleResend}
          onChangeEmail={changeEmail}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pageTitle="Sign up"
      title="Create your account"
      description="Save your research and use the assistant. We’ll email you a code to confirm it’s you."
      footer={
        <p>
          Already have an account?
          <a className="auth-link" href={logInHref}>
            Log in
          </a>
        </p>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleDetailsSubmit}>
        {emailExists && (
          <FormAlert tone="error">
            An account already uses this email.
            <a className="auth-link" href={logInHref}>
              Log in instead
            </a>
          </FormAlert>
        )}

        <fieldset className="auth-form__fieldset" disabled={isBusy}>
          <legend className="visually-hidden">Your details</legend>

          <TextField
            id={FIELD_IDS.fullName}
            label="Full name"
            autoComplete="name"
            value={fullName}
            error={errors.fullName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setFullName(event.target.value);
              clearError("fullName");
            }}
          />

          <TextField
            id={FIELD_IDS.email}
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            error={errors.email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setEmail(event.target.value);
              clearError("email");
              setEmailExists(false);
            }}
          />

          <div className="sign-up-page__terms">
            <CheckboxField
              id={FIELD_IDS.terms}
              label="I agree to the Terms of Use and Privacy Policy."
              checked={acceptedTerms}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? TERMS_ERROR_ID : undefined}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setAcceptedTerms(event.target.checked);
                clearError("terms");
              }}
            />

            {errors.terms && (
              <p id={TERMS_ERROR_ID} className="sign-up-page__terms-error">
                {errors.terms}
              </p>
            )}
          </div>
        </fieldset>

        <Button
          type="submit"
          fullWidth
          isLoading={status === "submitting"}
          loadingText="Sending code…"
        >
          Send code
        </Button>
      </form>
    </AuthLayout>
  );
}
