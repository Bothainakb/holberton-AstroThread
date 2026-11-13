import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Button } from "../../components/Button/Button";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import { TextField } from "../../components/FormField/FormField";
import { VerifyCodeForm } from "../../components/VerifyCodeForm/VerifyCodeForm";
import {
  DEMO_ADMIN_EMAIL,
  LOGIN_CODE_LENGTH,
  requestLoginCode,
  verifyLoginCode,
} from "../../data/demoAuth";
import type { DemoSession } from "../../data/demoAuth";
import { buildAuthHref, getReturnPath } from "../../lib/authRedirect";
import { navigate, routes, useLocation } from "../../lib/router";
import { validateEmail } from "../../lib/validation";
import "./LoginPage.css";

type LoginStep = "email" | "code";
type FormStatus = "idle" | "submitting" | "success";

const EMAIL_FIELD_ID = "login-email";
const REDIRECT_DELAY_MS = 1200;

export function LoginPage() {
  const { searchParams } = useLocation();

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [emailError, setEmailError] = useState("");
  const [hasNoAccount, setHasNoAccount] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [verifyError, setVerifyError] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const redirectTimer = useRef<number | undefined>(undefined);
  const shouldFocusEmail = useRef(false);

  useEffect(() => {
    return () => window.clearTimeout(redirectTimer.current);
  }, []);

  useEffect(() => {
    if (shouldFocusEmail.current) {
      document.getElementById(EMAIL_FIELD_ID)?.focus();
      shouldFocusEmail.current = false;
    }
  });

  const isBusy = status !== "idle";

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    const error = validateEmail(email);
    setEmailError(error ?? "");
    setHasNoAccount(false);

    if (error) {
      shouldFocusEmail.current = true;
      return;
    }

    setStatus("submitting");
    const result = await requestLoginCode(email);
    setStatus("idle");

    if (!result.ok) {
      setHasNoAccount(true);
      shouldFocusEmail.current = true;
      return;
    }

    setVerifyError("");
    setStep("code");
  }

  async function handleVerify(code: string) {
    setVerifyError("");
    setStatus("submitting");
    const result = await verifyLoginCode(email, code);

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
    const result = await requestLoginCode(email);
    return result.ok;
  }

  function changeEmail() {
    setStep("email");
    setStatus("idle");
    setVerifyError("");
    shouldFocusEmail.current = true;
  }

  function fillDemoEmail() {
    setEmail(DEMO_ADMIN_EMAIL);
    setEmailError("");
    setHasNoAccount(false);
    shouldFocusEmail.current = true;
  }

  const signUpHref = buildAuthHref(routes.signUp, email, searchParams);

  if (step === "code") {
    return (
      <AuthLayout
        pageTitle="Log in"
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
          submitLabel="Log in"
          loadingText="Logging in…"
          hint={`Demo: no email is sent. Enter any ${LOGIN_CODE_LENGTH} digits.`}
          error={verifyError}
          successMessage={session ? `Logged in as ${session.fullName}.` : undefined}
          onVerify={(code) => void handleVerify(code)}
          onResend={handleResend}
          onChangeEmail={changeEmail}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pageTitle="Log in"
      title="Log in to AstroThread"
      description="We’ll email you a one-time code. No password needed."
      footer={
        <p>
          New to AstroThread?
          <a className="auth-link" href={signUpHref}>
            Create an account
          </a>
        </p>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleEmailSubmit}>
        {hasNoAccount && (
          <FormAlert tone="error">
            No account uses this email.
            <a className="auth-link" href={signUpHref}>
              Create an account
            </a>
          </FormAlert>
        )}

        <fieldset className="auth-form__fieldset" disabled={isBusy}>
          <legend className="visually-hidden">Log in with your email</legend>

          <TextField
            id={EMAIL_FIELD_ID}
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            error={emailError || undefined}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setEmail(event.target.value);
              setEmailError("");
              setHasNoAccount(false);
            }}
          />
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

      <p className="login-page__demo">
        Demo admin account:
        <button
          type="button"
          className="login-page__demo-email"
          disabled={isBusy}
          onClick={fillDemoEmail}
        >
          {DEMO_ADMIN_EMAIL}
        </button>
      </p>
    </AuthLayout>
  );
}