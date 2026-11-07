import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Button } from "../../components/Button/Button";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import {
  CheckboxField,
  PasswordField,
  TextField,
} from "../../components/FormField/FormField";
import {
  demoSignIn,
  getAccountTypeLabel,
  parseAccountType,
} from "../../data/demoAuth";
import type { DemoSession } from "../../data/demoAuth";
import { navigate, routes, useLocation } from "../../lib/router";
import {
  getFirstErrorField,
  hasFieldErrors,
  validateEmail,
  validateRequiredPassword,
} from "../../lib/validation";
import type { FieldErrors } from "../../lib/validation";
import "./LoginPage.css";

type LoginField = "email" | "password";
type FormStatus = "idle" | "submitting" | "success";

const LOGIN_FIELDS: readonly LoginField[] = ["email", "password"];
const FIELD_IDS: Record<LoginField, string> = {
  email: "login-email",
  password: "login-password",
};
const REDIRECT_DELAY_MS = 1500;

function validateLogin(email: string, password: string): FieldErrors<LoginField> {
  return {
    email: validateEmail(email),
    password: validateRequiredPassword(password),
  };
}

export function LoginPage() {
  const { searchParams } = useLocation();
  const registeredParam = searchParams.get("registered");
  const registeredType = registeredParam ? parseAccountType(registeredParam) : null;

  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [formError, setFormError] = useState("");
  const [showResetNotice, setShowResetNotice] = useState(false);
  const [session, setSession] = useState<DemoSession | null>(null);
  const redirectTimer = useRef<number | undefined>(undefined);
  const pendingFocus = useRef<LoginField | null>(null);

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

  function updateField(field: LoginField, nextEmail: string, nextPassword: string) {
    setFormError("");

    if (hasSubmitted) {
      const nextErrors = validateLogin(nextEmail, nextPassword);
      setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setHasSubmitted(true);
    setFormError("");
    setShowResetNotice(false);

    const nextErrors = validateLogin(email, password);
    setErrors(nextErrors);

    if (hasFieldErrors(nextErrors)) {
      pendingFocus.current = getFirstErrorField(LOGIN_FIELDS, nextErrors) ?? null;
      return;
    }

    setStatus("submitting");
    const result = await demoSignIn({ email, password, rememberMe });

    if (!result.ok) {
      setStatus("idle");
      setFormError(result.message);
      setPassword("");
      pendingFocus.current = "password";
      return;
    }

    setSession(result.session);
    setStatus("success");
    redirectTimer.current = window.setTimeout(() => {
      navigate(routes.home);
    }, REDIRECT_DELAY_MS);
  }

  return (
    <AuthLayout
      pageTitle="Sign In"
      title="Sign In"
      description="Welcome back. Sign in to continue your research."
      footer={
        <p>
          New to AstroThread?{" "}
          <a className="auth-link" href={routes.signUp}>
            Create an account
          </a>
        </p>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        {registeredType && status === "idle" && !formError && (
          <FormAlert tone="success" title="Account created">
            Your {getAccountTypeLabel(registeredType).toLowerCase()} account is
            ready. Sign in to continue.
          </FormAlert>
        )}

        {formError && (
          <FormAlert tone="error" title="Couldn’t sign in">
            {formError}
          </FormAlert>
        )}

        {status === "success" && session && (
          <FormAlert tone="success" title={`Welcome back, ${session.fullName}`}>
              You’re signed in with a {getAccountTypeLabel(session.accountType).toLowerCase()}{" "}
            account. Taking you to the Home Page…
          </FormAlert>
        )}

        <fieldset className="auth-form__fieldset" disabled={isBusy}>
          <legend className="visually-hidden">Account details</legend>

          <TextField
            id={FIELD_IDS.email}
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              updateField("email", event.target.value, password);
            }}
          />

          <PasswordField
            id={FIELD_IDS.password}
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            error={errors.password}
            labelAction={
              <Button
                variant="text"
                aria-expanded={showResetNotice}
                aria-controls="password-reset-notice"
                onClick={() => setShowResetNotice((visible) => !visible)}
              >
                Forgot password?
              </Button>
            }
            onChange={(event) => {
              setPassword(event.target.value);
              updateField("password", email, event.target.value);
            }}
          />

          <div id="password-reset-notice" hidden={!showResetNotice}>
            <FormAlert tone="info" title="Password reset">
             Password reset isn’t available in this demo yet.
            </FormAlert>
          </div>

          <div className="auth-form__options">
            <CheckboxField
              id="login-remember"
              label="Remember me"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
          </div>
        </fieldset>

        <Button
          type="submit"
          fullWidth
          isLoading={status === "submitting"}
          loadingText="Signing in…"
          disabled={status === "success"}
        >
          Sign In
        </Button>
      </form>     
    </AuthLayout>
  );
}