"use client";

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

/**
 * Sélecteur stylé (Radix) au menu cohérent avec l'application — remplace le
 * `<select>` natif dont la liste déroulante est imposée par le système.
 *
 * Deux usages :
 * - formulaire server action : passer `name` + `defaultValue` (Radix génère un
 *   champ masqué pour la soumission) ;
 * - composant contrôlé : passer `value` + `onValueChange`.
 *
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
}) {
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger id={id} className={className} {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
