"use client";

import { useEffect, useRef } from "react";
import type { Map as CarteLeaflet, LayerGroup } from "leaflet";
import type { EtablissementProche } from "@/lib/geo";

export const COULEUR_NIVEAU = { ecole: "#18753c", college: "#000091", lycee: "#6e445a" } as const;

/**
 * Carte Leaflet + tuiles OpenStreetMap. Complément visuel : la liste à côté reste la référence
 * (accessible au clavier et aux lecteurs d'écran).
 */
export function CarteEtablissements({
  centre,
  rayonKm,
  etablissements,
  secteur,
  onChoix,
}: {
  centre: { lat: number; lon: number; label: string };
  rayonKm: number;
  etablissements: EtablissementProche[];
  secteur: string[];
  onChoix: (uai: string) => void;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteLeaflet | null>(null);
  const couche = useRef<LayerGroup | null>(null);
  const rappel = useRef(onChoix);
  useEffect(() => {
    rappel.current = onChoix;
  });

  useEffect(() => {
    let annule = false;
    void import("leaflet").then((L) => {
      if (annule || !conteneur.current) return;
      if (!carte.current) {
        carte.current = L.map(conteneur.current, { scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>',
        }).addTo(carte.current);
        couche.current = L.layerGroup().addTo(carte.current);
      }
      const c = carte.current;
      const g = couche.current!;
      g.clearLayers();
      const emprise = L.latLng(centre.lat, centre.lon).toBounds(rayonKm * 2000);
      c.fitBounds(emprise, { padding: [10, 10] });
      L.circle([centre.lat, centre.lon], {
        radius: rayonKm * 1000,
        color: "#3a3a3a",
        weight: 1,
        fillOpacity: 0.03,
        dashArray: "4 4",
      }).addTo(g);
      L.circleMarker([centre.lat, centre.lon], { radius: 8, color: "#ce0500", fillColor: "#ce0500", fillOpacity: 1 })
        .bindTooltip(`Votre adresse : ${centre.label}`)
        .addTo(g);
      for (const e of etablissements) {
        const deSecteur = secteur.includes(e.uai);
        L.circleMarker([e.lat, e.lon], {
          radius: deSecteur ? 10 : 6,
          color: COULEUR_NIVEAU[e.niveau],
          weight: deSecteur ? 4 : 2,
          fillColor: COULEUR_NIVEAU[e.niveau],
          fillOpacity: e.statut === "public" ? 0.8 : 0.15,
        })
          .bindTooltip(`${e.nom}${deSecteur ? " (collège de secteur)" : ""}`)
          .on("click", () => rappel.current(e.uai))
          .addTo(g);
      }
    });
    return () => {
      annule = true;
    };
  }, [centre.lat, centre.lon, centre.label, rayonKm, etablissements, secteur]);

  useEffect(
    () => () => {
      carte.current?.remove();
      carte.current = null;
    },
    [],
  );

  return (
    <div>
      <div
        ref={conteneur}
        className="h-80 w-full rounded border sm:h-[28rem]"
        role="region"
        aria-label="Carte des établissements (la liste ci-contre contient les mêmes informations)"
      />
      <p className="mt-1 text-xs text-gray-600">
        Point rouge : votre adresse. Pastille pleine : public ; pastille claire : privé. Vert : école, bleu : collège,
        violet : lycée. Gros cercle épais : collège de secteur. Cercle pointillé : rayon de recherche (à vol
        d&apos;oiseau).
      </p>
    </div>
  );
}
