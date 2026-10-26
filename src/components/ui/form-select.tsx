"use client";

import { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";

export interface SelectOption {
  value: string;
  label: string;
}

/** Radix interdit la valeur "" sur un élément : on la remplace par ce jeton en interne. */
const EMPTY = "__empty__";
const toRadix = (v: string | undefined) => (v === "" ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? "" : v);

/**
 * Sélecteur stylé (Radix) au menu cohérent avec l'application — remplace le
 * `<select>` natif dont la liste déroulante est imposée par le système.
 *
 * Deux usages :
 * - formulaire (GET ou server action) : passer `name` + `defaultValue` ; un
 *   champ masqué porte la valeur réelle (y compris une option vide « Tous ») ;
 * - composant contrôlé : passer `value` + `onValueChange`.
 *
 * Une option de valeur "" (ex. « Toutes les opérations ») est prise en charge.
 * Compatible avec `Field` (id / aria-describedby / aria-invalid injectés).
 */
export function FormSelect({
  options,
  placeholder = "Sélectionner…",
  name,
  id,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  className,
  ...aria
}: {
  options: SelectOption[];
  placeholder?: string;
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  return (
    <>
      <Select
        value={toRadix(current)}
        onValueChange={(v) => {
          const real = fromRadix(v);
          if (!controlled) setInner(real);
          onValueChange?.(real);
        }}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger id={id} className={className} {...aria}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || EMPTY} value={toRadix(o.value)!}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
    </>
  );
}
