// Génération d'un fichier iCalendar (RFC 5545) sans dépendance.
// Un événement « journée entière » par échéance, avec trois alarmes : J-60, J-30, J-7 à 9 h.

export type EvenementIcs = {
  uid: string;
  titre: string;
  date: string; // AAAA-MM-JJ
  description?: string;
  url?: string;
};

/** Alarmes : décalage par rapport au début de la journée (minuit) → J-n à 9 h. */
export const ALARMES_JOURS = [60, 30, 7] as const;
const declencheur = (jours: number) => `-P${jours - 1}DT15H`;

/** Échappement des valeurs texte (RFC 5545 §3.3.11). */
export function echapper(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Repli des lignes à 75 octets UTF-8 (RFC 5545 §3.1), sans couper un caractère multi-octet. */
export function plier(ligne: string): string {
  const enc = new TextEncoder();
  if (enc.encode(ligne).length <= 75) return ligne;
  const morceaux: string[] = [];
  let courant = "";
  let taille = 0;
  let limite = 75;
  for (const c of ligne) {
    const t = enc.encode(c).length;
    if (taille + t > limite) {
      morceaux.push(courant);
      courant = "";
      taille = 0;
      limite = 74; // l'espace de continuation compte pour 1 octet
    }
    courant += c;
    taille += t;
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
}

const dateIcs = (iso: string) => iso.replace(/-/g, "");

function horodatage(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function lendemain(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function genererIcs(evenements: EvenementIcs[], maintenant = new Date()): string {
  const stamp = horodatage(maintenant);
  const lignes: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vie FR//Mes delais//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Mes délais",
  ];
  for (const ev of evenements) {
    lignes.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateIcs(ev.date)}`,
      `DTEND;VALUE=DATE:${dateIcs(lendemain(ev.date))}`,
      `SUMMARY:${echapper(ev.titre)}`,
      "TRANSP:TRANSPARENT",
    );
    if (ev.description) lignes.push(`DESCRIPTION:${echapper(ev.description)}`);
    if (ev.url) lignes.push(`URL:${ev.url}`);
    for (const j of ALARMES_JOURS) {
      lignes.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${echapper(`${ev.titre} dans ${j} jours`)}`,
        `TRIGGER:${declencheur(j)}`,
        "END:VALARM",
      );
    }
    lignes.push("END:VEVENT");
  }
  lignes.push("END:VCALENDAR");
  return lignes.map(plier).join("\r\n") + "\r\n";
}
