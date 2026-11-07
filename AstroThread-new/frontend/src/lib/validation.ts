export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();

  if (!email) {
    return "Enter your email address.";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address, such as name@example.com.";
  }

  return undefined;
}

export function validateFullName(value: string): string | undefined {
  const fullName = value.trim();

  if (!fullName) {
    return "Enter your full name.";
  }

  if (fullName.length < 2) {
    return "Your name must be at least 2 characters.";
  }

  return undefined;
}

export function validateRequiredPassword(value: string): string | undefined {
  if (!value) {
    return "Enter your password.";
  }

  return undefined;
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) {
    return "Create a password.";
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Include at least one letter and one number.";
  }

  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | undefined {
  if (!confirmation) {
    return "Confirm your password.";
  }

  if (password !== confirmation) {
    return "Passwords don’t match.";
  }

  return undefined;
}

export function validateInvitationCode(value: string): string | undefined {
  if (!value.trim()) {
    return "Enter your admin invitation code.";
  }

  return undefined;
}

export function getFirstErrorField<Field extends string>(
  fieldOrder: readonly Field[],
  errors: FieldErrors<Field>,
): Field | undefined {
  return fieldOrder.find((field) => Boolean(errors[field]));
}

export function hasFieldErrors<Field extends string>(
  errors: FieldErrors<Field>,
): boolean {
  return Object.values(errors).some(Boolean);
}