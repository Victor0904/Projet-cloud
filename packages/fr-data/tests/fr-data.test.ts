import { describe, expect, it } from "vitest";
import {
  ajouterJoursOuvres,
  decoderEtat,
  encoderEtat,
  estOuvre,
  euros,
  joursFeries,
  lireDate,
  paques,
  qrCodeDataUrl,
} from "../src";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("jours fériés", () => {
  it("calcule Pâques", () => {
    expect(iso(paques(2024))).toBe("2024-03-31");
    expect(iso(paques(2025))).toBe("2025-04-20");
    expect(iso(paques(2026))).toBe("2026-04-05");
  });

  it("liste 11 jours, 13 en Alsace-Moselle", () => {
    expect(joursFeries(2026)).toHaveLength(11);
    expect(joursFeries(2026, true)).toHaveLength(13);
    const dates = Object.fromEntries(joursFeries(2026).map((f) => [f.nom, iso(f.date)]));
    expect(dates["Ascension"]).toBe("2026-05-14");
    expect(dates["Lundi de Pentecôte"]).toBe("2026-05-25");
  });

  it("saute week-ends et fériés", () => {
    expect(estOuvre(new Date(Date.UTC(2026, 6, 14)))).toBe(false);
    // jeudi 24/12/2026 + 1 jour ouvré : 25 férié, puis week-end → lundi 28
    expect(iso(ajouterJoursOuvres(new Date(Date.UTC(2026, 11, 24)), 1))).toBe("2026-12-28");
    // en Alsace-Moselle le 26 est aussi férié, même résultat ; le vendredi saint 2026 (3 avril) ne l'est qu'en AM
    expect(estOuvre(new Date(Date.UTC(2026, 3, 3)))).toBe(true);
    expect(estOuvre(new Date(Date.UTC(2026, 3, 3)), true)).toBe(false);
  });
});

describe("formats", () => {
  it("euros", () => {
    expect(euros(1234.5)).toBe("1 234,50 €");
    expect(euros(1234.5, true)).toBe("1 235 €");
  });

  it("lireDate", () => {
    expect(iso(lireDate("25/10/2026")!)).toBe("2026-10-25");
    expect(iso(lireDate("2026-10-25")!)).toBe("2026-10-25");
    expect(lireDate("31/02/2026")).toBeNull();
    expect(lireDate("n'importe quoi")).toBeNull();
  });
});

describe("état dans l'URL", () => {
  it("aller-retour avec accents", () => {
    const etat = { nom: "Élodie", montant: 1234.5, liste: [1, 2] };
    expect(encoderEtat(etat)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decoderEtat(encoderEtat(etat))).toEqual(etat);
  });

  it("chaîne corrompue → null", () => {
    expect(decoderEtat("%%%")).toBeNull();
  });
});

it("QR code", async () => {
  expect(await qrCodeDataUrl("https://exemple.fr")).toMatch(/^data:image\/png;base64,/);
});
