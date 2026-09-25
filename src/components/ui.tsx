"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { useTranslations } from "next-intl";
import { Icon } from "./Icon";

// The Cuenta Clara component set. Styles live in globals.css and only use brand tokens.

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  block?: boolean;
  small?: boolean;
};

export function Button({ variant = "primary", block, small, className = "", ...rest }: ButtonProps) {
  const cls = ["btn", `btn--${variant}`, block && "btn--block", small && "btn--small", className]
    .filter(Boolean)
    .join(" ");
  return <button type="button" className={cls} {...rest} />;
}

export function Card({
  tone,
  className = "",
  children,
}: {
  tone?: "clara" | "mango" | "alerta";
  className?: string;
  children: ReactNode;
}) {
  return <div className={["card", tone && `card--${tone}`, className].filter(Boolean).join(" ")}>{children}</div>;
}

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />;
}

export function MoneyInput({
  big,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { big?: boolean }) {
  return (
    <div className={big ? "money-input money-input--big" : "money-input"}>
      <span className="money-input__prefix" aria-hidden>
        $
      </span>
      <input className="input" inputMode="decimal" autoComplete="off" placeholder="0.00" {...props} />
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "clara",
  label,
  steps,
}: {
  value: number; // 0–1
  tone?: "clara" | "mango" | "alerta";
  label: string;
  steps?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={["progress", tone !== "clara" && `progress--${tone}`, steps && "progress--steps"]
        .filter(Boolean)
        .join(" ")}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="chip"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "¿Qué es esto?" — the tap-to-explain tooltip every money term gets. */
export function Explain({ text, align = "start" }: { text: string; align?: "start" | "end" }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={align === "end" ? "explain explain--end" : "explain"} ref={ref}>
      <button
        type="button"
        className="explain__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="info" size={16} />
        {t("whatIsThis")}
      </button>
      {open && (
        <span className="explain__panel" id={panelId} role="note">
          {text}
        </span>
      )}
    </span>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDone, 2600);
    return () => clearTimeout(id);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={onClose}>
      <div className="dialog__body">
        <h2 className="t-heading" id={titleId}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
