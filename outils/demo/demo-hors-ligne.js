// Démo hors ligne, chargée en tête de chaque application exportée (voir relocaliser.py).
// 1. Si le géocodage (IGN / API Adresse / API Géo) est bloqué, répond avec des réponses réelles enregistrées
//    pour quelques adresses et communes d'exemple (geocodage-demo.json, injecté à la construction).
// 2. Ajoute un bouton « Tous les projets » qui ramène au tableau de bord.
(function () {
  var DONNEES = window.__VIEFR_GEO__ || { adresses: [], communes: [], geo: [] };

  function normaliser(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
  function correspond(q, texte) {
    var mots = normaliser(texte).split(" ");
    return normaliser(q)
      .split(" ")
      .filter(Boolean)
      .every(function (m) {
        return mots.some(function (t) {
          return t.indexOf(m) === 0;
        });
      });
  }
  function reponse(corps) {
    return new Response(JSON.stringify(corps), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  function geocodage(url) {
    var q = url.searchParams.get("q") || "";
    var type = url.searchParams.get("type");
    var limite = Number(url.searchParams.get("limit") || 5);
    var source = type === "municipality" ? DONNEES.communes : DONNEES.adresses.concat(DONNEES.communes);
    var trouves = source.filter(function (f) {
      var p = f.properties;
      return correspond(q, [p.label, p.postcode, p.city, p.context].join(" "));
    });
    return reponse({ type: "FeatureCollection", features: trouves.slice(0, limite), query: q });
  }
  function apiGeo(url) {
    var m = url.pathname.match(/\/communes\/?([0-9AB]{5})?$/);
    var code = m && m[1];
    if (code) {
      var c = DONNEES.geo.find(function (x) { return x.code === code; });
      return c ? reponse(c) : new Response("", { status: 404 });
    }
    var nom = url.searchParams.get("nom");
    var cp = url.searchParams.get("codePostal");
    var liste = DONNEES.geo.filter(function (x) {
      return nom ? correspond(nom, x.nom) : cp ? (x.codesPostaux || []).indexOf(cp) >= 0 : false;
    });
    return reponse(liste.slice(0, Number(url.searchParams.get("limit") || 10)));
  }
  function simulation(url) {
    if (/(^|\.)geopf\.fr$|^api-adresse\.data\.gouv\.fr$/.test(url.hostname)) return geocodage(url);
    if (url.hostname === "geo.api.gouv.fr") return apiGeo(url);
    return null;
  }

  var fetchReel = window.fetch.bind(window);
  window.fetch = function (entree, options) {
    var url;
    try {
      url = new URL(typeof entree === "string" ? entree : entree.url, location.href);
    } catch (e) {
      return fetchReel(entree, options);
    }
    if (!simulation(url)) return fetchReel(entree, options);
    return fetchReel(entree, options)
      .then(function (r) {
        return r.ok ? r : simulation(url);
      })
      .catch(function (e) {
        if (e && e.name === "AbortError") throw e;
        window.__VIEFR_HORS_LIGNE__ = true;
        return simulation(url);
      });
  };

  function boutonRetour() {
    if (document.getElementById("viefr-retour")) return;
    var b = document.createElement("button");
    b.id = "viefr-retour";
    b.type = "button";
    b.textContent = "← Tous les projets";
    b.setAttribute("aria-label", "Revenir au tableau de bord des projets");
    b.style.cssText =
      "position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));" +
      "z-index:2147483647;font:600 13px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:6px;" +
      "border:1px solid #000091;background:#fff;color:#000091;box-shadow:0 2px 6px rgba(0,0,0,.2);cursor:pointer";
    b.addEventListener("click", function () {
      var retour = null;
      try {
        retour = sessionStorage.getItem("viefr-retour");
      } catch (e) {}
      if (retour) location.href = retour;
      else history.back();
    });
    var style = document.createElement("style");
    style.textContent = "#viefr-retour:focus-visible{outline:3px solid #000091;outline-offset:2px}@media print{#viefr-retour{display:none}}";
    document.head.appendChild(style);
    document.body.appendChild(b);
  }
  window.addEventListener("load", function () {
    setTimeout(boutonRetour, 600);
  });
})();
