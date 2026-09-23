import { describe, it, expect } from "vitest";
import { mapSubmissionToContact, type MappableField } from "./mapping";

const fields: MappableField[] = [
  { id: "f1", label: "Nom complet", type: "TEXT" },
  { id: "f2", label: "E-mail", type: "EMAIL" },
  { id: "f3", label: "Téléphone", type: "PHONE" },
  { id: "f4", label: "Entreprise", type: "TEXT" },
  { id: "f5", label: "Message", type: "TEXTAREA" },
];

describe("mapSubmissionToContact", () => {
  it("mappe nom, e-mail, téléphone et entreprise", () => {
    const c = mapSubmissionToContact(fields, {
      f1: "Awa Konaté",
      f2: "awa@example.com",
      f3: "+225 07 00",
      f4: "Baobab SARL",
      f5: "Bonjour",
    });
    expect(c.firstName).toBe("Awa Konaté");
    expect(c.email).toBe("awa@example.com");
    expect(c.phone).toBe("+225 07 00");
    expect(c.companyName).toBe("Baobab SARL");
    expect(c.data["Message"]).toBe("Bonjour");
  });

  it("utilise la partie locale de l'e-mail si aucun nom", () => {
    const c = mapSubmissionToContact(
      [{ id: "e", label: "Votre e-mail", type: "EMAIL" }],
      { e: "kofi@mail.com" },
    );
    expect(c.firstName).toBe("kofi");
  });

  it("retombe sur « Prospect » si rien d'exploitable", () => {
    const c = mapSubmissionToContact([{ id: "m", label: "Message", type: "TEXTAREA" }], { m: "Salut" });
    expect(c.firstName).toBe("Prospect");
  });
});
