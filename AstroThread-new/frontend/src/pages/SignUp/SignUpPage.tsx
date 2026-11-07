import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "../../components/AuthLayout/AuthLayout";
import { Button } from "../../components/Button/Button";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import { PasswordField, TextField } from "../../components/FormField/FormField";
import {
  DEMO_ADMIN_INVITATION_CODE,
  demoSignUp,
  getAccountTypeLabel,
  parseAccountType,
} from "../../data/demoAuth";
import type { AccountType } from "../../data/demoAuth";
import { navigate, routes, useLocation } from "../../lib/router";
import {
  PASSWORD_MIN_LENGTH,
  getFirstErrorField,
  hasFieldErrors,
  validateEmail,
  validateFullName,
  validateInvitationCode,
  validateNewPassword,
  validatePasswordConfirmation,
} from "../../lib/validation";
import type { FieldErrors } from "../../lib/validation";
import "./SignUpPage.css";

type SignUpField =
  | "fullName"
  | "email"
  | "password"
  | "confirmPassword"
  | "invitationCode";

type FormStatus = "idle" | "submitting" | "success";

interface SignUpValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  invitationCode: string;
}

const SIGN_UP_FIELDS: readonly SignUpField[] = [
  "fullName",
  "email",
  "password",
  "confirmPassword",
  "invitationCode",
];

const FIELD_IDS: Record<SignUpField, string> = {
  fullName: "sign-up-full-name",
  email: "sign-up-email",
  password: "sign-up-password",
  confirmPassword: "sign-up-confirm-password",
  invitationCode: "sign-up-invitation-code",
};

const INITIAL_VALUES: SignUpValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  invitationCode: "",
};

const ACCOUNT_TYPES: readonly {
  value: AccountType;
  title: string;
  description: string;
}[] = [
  {
    value: "user",
    title: "User",
    description: "Explore research, save threads and papers.",
  },
  {
    value: "admin",
    title: "Admin",
    description: "Manage research content. Requires an invitation code.",
  },
];

const REDIRECT_DELAY_MS = 1500;

function validateSignUp(
  values: SignUpValues,
  accountType: AccountType,
): FieldErrors<SignUpField> {
  return {
    fullName: validateFullName(values.fullName),
    email: validateEmail(values.email),
    password: validateNewPassword(values.password),
    confirmPassword: validatePasswordConfirmation(
      values.password,
      values.confirmPassword,
    ),
    invitationCode:
      accountType === "admin"
        ? validateInvitationCode(values.invitationCode)
        : undefined,
  };
}

export function SignUpPage() {
  const { searchParams } = useLocation();
  const accountType = parseAccountType(searchParams.get("type"));

  const [values, setValues] = useState<SignUpValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [createdName, setCreatedName] = useState("");
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
  const accountLabel = getAccountTypeLabel(accountType);

  function handleAccountTypeChange(nextType: AccountType) {
    if (nextType === accountType) {
      return;
    }

    navigate(`${routes.signUp}?type=${nextType}`, { replace: true });

    if (hasSubmitted) {
      setErrors(validateSignUp(values, nextType));
    }
  }

  function updateValue(field: SignUpField, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    if (hasSubmitted) {
      setErrors(validateSignUp(nextValues, accountType));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setHasSubmitted(true);

    const nextErrors = validateSignUp(values, accountType);
    setErrors(nextErrors);

    if (hasFieldErrors(nextErrors)) {
      pendingFocus.current =
        getFirstErrorField(SIGN_UP_FIELDS, nextErrors) ?? null;
      return;
    }

    setStatus("submitting");
    const result = await demoSignUp({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      accountType,
      invitationCode: values.invitationCode,
    });

    if (!result.ok) {
      setStatus("idle");
      setErrors({ [result.field]: result.message });
      pendingFocus.current = result.field;
      return;
    }

    setCreatedName(result.session.fullName);
    setStatus("success");

    const params = new URLSearchParams({
      email: result.session.email,
      registered: result.session.accountType,
    });

    redirectTimer.current = window.setTimeout(() => {
      navigate(`${routes.signIn}?${params.toString()}`);
    }, REDIRECT_DELAY_MS);
  }

  return (
    <AuthLayout
      pageTitle="Sign Up"
      title="Create your account"
      description="Save research and use the AI Assistant with your own account."
      footer={
        <p>
          Already have an account?{" "}
          <a className="auth-link" href={routes.signIn}>
            Sign In
          </a>
        </p>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        {status === "success" && (
          <FormAlert tone="success" title={`Welcome, ${createdName}`}>
            Your {accountLabel.toLowerCase()} account is ready. Taking you to
            Sign In…
          </FormAlert>
        )}

        <fieldset className="auth-form__fieldset" disabled={isBusy}>
          <legend className="visually-hidden">Account details</legend>

          <fieldset className="account-type">
            <legend className="account-type__legend">Account type</legend>

            <div className="account-type__options">
              {ACCOUNT_TYPES.map((option) => (
                <label
                  key={option.value}
                  className="account-type__option"
                  htmlFor={`account-type-${option.value}`}
                >
                  <input
                    id={`account-type-${option.value}`}
                    className="account-type__input"
                    type="radio"
                    name="accountType"
                    value={option.value}
                    checked={accountType === option.value}
                    onChange={() => handleAccountTypeChange(option.value)}
                  />
                  <span className="account-type__card">
                    <span className="account-type__title">{option.title}</span>
                    <span className="account-type__description">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <TextField
            id={FIELD_IDS.fullName}
            label="Full name"
            autoComplete="name"
            placeholder="Your full name"
            value={values.fullName}
            error={errors.fullName}
            onChange={(event) => updateValue("fullName", event.target.value)}
          />

          <TextField
            id={FIELD_IDS.email}
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={values.email}
            error={errors.email}
            onChange={(event) => updateValue("email", event.target.value)}
          />

          <PasswordField
            id={FIELD_IDS.password}
            label="Password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={values.password}
            error={errors.password}
            hint={`Use at least ${PASSWORD_MIN_LENGTH} characters, including a letter and a number.`}
            onChange={(event) => updateValue("password", event.target.value)}
          />

          <PasswordField
            id={FIELD_IDS.confirmPassword}
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Enter your password again"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={(event) =>
              updateValue("confirmPassword", event.target.value)
            }
          />

          {accountType === "admin" && (
            <TextField
              id={FIELD_IDS.invitationCode}
              label="Admin invitation code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Enter your invitation code"
              value={values.invitationCode}
              error={errors.invitationCode}
              hint={`Demo code: ${DEMO_ADMIN_INVITATION_CODE}`}
              onChange={(event) =>
                updateValue("invitationCode", event.target.value)
              }
            />
          )}
        </fieldset>

        <Button
          type="submit"
          fullWidth
          isLoading={status === "submitting"}
          loadingText="Creating account…"
          disabled={status === "success"}
        >
          {`Create ${accountLabel.toLowerCase()} account`}
        </Button>
      </form>
    </AuthLayout>
  );
}