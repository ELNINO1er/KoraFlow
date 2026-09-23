import { describe, it, expect } from "vitest";
import { computeSlots, minutesToLabel, labelToMinutes } from "./slots";

describe("computeSlots", () => {
  it("génère des créneaux contigus dans une fenêtre", () => {
    const slots = computeSlots({
      windows: [{ startMinutes: 540, endMinutes: 660 }], // 09:00–11:00
      durationMinutes: 30,
    });
    expect(slots).toEqual([540, 570, 600, 630]); // 9:00, 9:30, 10:00, 10:30
  });

  it("exclut les créneaux déjà réservés (buffer inclus)", () => {
    const slots = computeSlots({
      windows: [{ startMinutes: 540, endMinutes: 660 }],
      durationMinutes: 30,
      bufferAfterMinutes: 15,
      booked: [{ startMinutes: 570, endMinutes: 600 }], // 9:30–10:00 pris (+15 buffer -> bloque jusqu'à 10:15)
    });
    // 9:00 ok ; 9:30 pris ; 10:00 chevauche le buffer ; 10:30 ok
    expect(slots).toEqual([540, 630]);
  });

  it("respecte l'heure minimale de début", () => {
    const slots = computeSlots({
      windows: [{ startMinutes: 540, endMinutes: 660 }],
      durationMinutes: 30,
      minStartMinutes: 600, // pas avant 10:00
    });
    expect(slots).toEqual([600, 630]);
  });

  it("ne dépasse jamais la fin de la fenêtre", () => {
    const slots = computeSlots({
      windows: [{ startMinutes: 540, endMinutes: 610 }], // 70 min
      durationMinutes: 30,
    });
    expect(slots).toEqual([540, 570]); // pas de 3e créneau (600+30=630 > 610)
  });

  it("conversions minutes <-> label", () => {
    expect(minutesToLabel(570)).toBe("09:30");
    expect(labelToMinutes("09:30")).toBe(570);
    expect(labelToMinutes("24:00")).toBeNull();
  });
});
