import type { ReactNode } from "react";
import { Field } from "./field";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { NativeSelect } from "./native-select";

interface BaseFieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
}

/** Champ texte complet : Field (label + aide + erreur + aria) + Input. */
export function TextField({
  id,
  label,
  hint,
  error,
  required,
  className,
  ...inputProps
}: BaseFieldProps & React.ComponentProps<"input">) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <Input required={required} {...inputProps} />
    </Field>
  );
}

/** Champ texte multiligne complet. */
export function TextareaField({
  id,
  label,
  hint,
  error,
  required,
  className,
  ...textareaProps
}: BaseFieldProps & React.ComponentProps<"textarea">) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <Textarea required={required} {...textareaProps} />
    </Field>
  );
}

/** Champ sélecteur natif complet (les <option> sont passées en children). */
export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
  ...selectProps
}: BaseFieldProps & React.ComponentProps<"select">) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <NativeSelect required={required} {...selectProps}>
        {children}
      </NativeSelect>
    </Field>
  );
}
