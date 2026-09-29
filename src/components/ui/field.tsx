"use client";

import * as React from "react";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/**
 * Enveloppe de champ de formulaire : label + contrôle + aide + erreur, avec le
 * câblage d'accessibilité (aria-describedby, aria-invalid) appliqué au contrôle.
 *
 * Le contrôle est passé en `children` (Input, PasswordInput, Textarea…) ;
 * l'`id`, `aria-describedby` et `aria-invalid` lui sont injectés.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </Label>
      {React.cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
