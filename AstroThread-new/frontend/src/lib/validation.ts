const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();

  if (!email) {
    return "Enter your email address.";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address, like name@example.com.";
  }

  return undefined;
}

export function validateFullName(value: string): string | undefined {
  if (!value.trim()) {
    return "Enter your name.";
  }

  return undefined;
}

export function validateTerms(accepted: boolean): string | undefined {
  if (!accepted) {
    return "Agree to the terms to create an account.";
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