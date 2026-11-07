import type { ReactNode } from "react";
import "./FormAlert.css";

type FormAlertTone = "error" | "success" | "info";

interface FormAlertProps {
  tone: FormAlertTone;
  title?: string;
  children: ReactNode;
}

const alertRoles: Record<FormAlertTone, "alert" | "status" | undefined> = {
  error: "alert",
  success: "status",
  info: undefined,
};

export function FormAlert({ tone, title, children }: FormAlertProps) {
  return (
    <div className={`form-alert form-alert--${tone}`} role={alertRoles[tone]}>
      {title && <p className="form-alert__title">{title}</p>}
      <div className="form-alert__message">{children}</div>
    </div>
  );
}