// Le fichier .ics est validé par un parser indépendant (ical.js, utilisé par Thunderbird).
import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { genererIcs, plier } from "../src/lib/ics";
import type { Etat } from "../src/lib/types";
import { evenementsAgenda, lignes } from "../src/lib/vue";

const AUJ = "2026-10-25";

// Scénario du critère de fin : une voiture, une CNI, une assurance habitation.
const etat: Etat = {
  version: 1,
  membres: [
    { id: "m1", nom: "Victor", genre: "personne" },
    { id: "m2", nom: "Clio", genre: "vehicule" },
    { id: "m3", nom: "Appartement", genre: "logement" },
  ],
  echeances: [
    { id: "e1", typeId: "ct-voiture", membreId: "m2", dates: { mise_en_circulation: "2019-04-10", dernier_controle: "2025-03-01" }, creeLe: AUJ },
    { id: "e2", typeId: "cni", varianteId: "ancien-majeur", membreId: "m1", dates: { date_delivrance: "2010-06-02" }, creeLe: AUJ },
    { id: "e3", typeId: "assurance-habitation", membreId: "m3", dates: { date_souscription: "2021-01-15" }, creeLe: AUJ },
    { id: "e4", typeId: "libre", libelle: "Box internet ; fin d'engagement, \"promo\"", dates: {}, libre: { date: "2027-03-01", recurrenceMois: 0 }, creeLe: AUJ },
  ],
};

function parser(ics: string) {
  const comp = new ICAL.Component(ICAL.parse(ics));
  return { comp, events: comp.getAllSubcomponents("vevent") };
}

describe("export .ics", () => {
  const ics = genererIcs(evenementsAgenda(lignes(etat, AUJ)), new Date("2026-10-25T08:00:00Z"));

  it("est un VCALENDAR valide lisible par ical.js", () => {
    const { comp } = parser(ics);
    expect(comp.name).toBe("vcalendar");
    expect(comp.getFirstPropertyValue("version")).toBe("2.0");
    expect(comp.getFirstPropertyValue("prodid")).toContain("Mes delais");
  });

  it("contient un événement par échéance (prochaine + suivantes) avec des UID uniques", () => {
    const { events } = parser(ics);
    // CT : 1 + 3 suivantes ; CNI : 1 + 3 ; assurance : 1 + 3 ; libre unique : 1.
    expect(events).toHaveLength(13);
    const uids = events.map((e) => e.getFirstPropertyValue("uid"));
    expect(new Set(uids).size).toBe(uids.length);
  });

  it("les dates sont des journées entières correctes", () => {
    const { events } = parser(ics);
    const ct = events.find((e) => String(e.getFirstPropertyValue("summary")).includes("Contrôle technique"))!;
    const ev = new ICAL.Event(ct);
    expect(ev.startDate.isDate).toBe(true);
    expect(ev.startDate.toString()).toBe("2027-03-01");
    expect(ev.endDate.toString()).toBe("2027-03-02");
    expect(ev.summary).toBe("Contrôle technique d'une voiture — Clio");
  });

  it("chaque événement a trois alarmes : J-60, J-30, J-7 à 9 h", () => {
    const { events } = parser(ics);
    for (const e of events) {
      const alarmes = e.getAllSubcomponents("valarm");
      expect(alarmes).toHaveLength(3);
      const heuresAvant = alarmes.map((a) => {
        const t = a.getFirstPropertyValue("trigger") as ICAL.Duration;
        expect(a.getFirstPropertyValue("action")).toBe("DISPLAY");
        return -t.toSeconds() / 3600;
      });
      // minuit - (n-1) jours - 15 h = J-n à 9 h
      expect(heuresAvant).toEqual([59 * 24 + 15, 29 * 24 + 15, 6 * 24 + 15]);
    }
  });

  it("une CNI expirée est signalée EN RETARD à la date du jour", () => {
    const { events } = parser(ics);
    const cni = events.map((e) => new ICAL.Event(e)).find((e) => e.summary.startsWith("EN RETARD"))!;
    expect(cni.summary).toContain("Carte d'identité");
    expect(cni.startDate.toString()).toBe(AUJ);
    expect(cni.description).toContain("Source : https://www.service-public.gouv.fr");
  });

  it("échappe les caractères spéciaux et se relit à l'identique", () => {
    const { events } = parser(ics);
    const box = events.map((e) => new ICAL.Event(e)).find((e) => e.summary.startsWith("Box"))!;
    expect(box.summary).toBe("Box internet ; fin d'engagement, \"promo\"");
    expect(box.description).toContain("\n");
  });

  it("respecte CRLF et 75 octets par ligne", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const enc = new TextEncoder();
    for (const l of ics.split("\r\n")) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
  });

  it("plie sans couper un caractère accentué", () => {
    const long = "SUMMARY:" + "é".repeat(100);
    const plie = plier(long);
    expect(plie.replace(/\r\n /g, "")).toBe(long);
  });

  it("n'exporte pas les échéances terminées ou expirées", () => {
    const e2: Etat = {
      ...etat,
      echeances: [{ id: "x", typeId: "retractation", dates: { date_depart: "2026-01-01" }, creeLe: AUJ }],
    };
    expect(evenementsAgenda(lignes(e2, AUJ))).toHaveLength(0);
  });
});
