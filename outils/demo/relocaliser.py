"""Rend un export Next.js statique indépendant de l'URL où il est hébergé.

Usage : python3 -I relocaliser.py <dossier out> <app> <dossier destination>

L'export doit être construit avec basePath=/<app> et sans trailingSlash : toutes les pages (<route>.html) et
tous les flux RSC (<route>.txt) sont alors à la racine de l'app.
- Attributs HTML : /<app>/... devient relatif (./...).
- JS et scripts inline : le basePath devient window.__VIEFR_BASE__, calculé au chargement à partir de l'URL.
- Flux .txt (navigation côté client) : inchangés ; l'amorce réécrit à la volée les href/src qui commencent par /<app>/.
- Chaque <route>.html est aussi copié en <route> (sans extension), et la page d'accueil en <parent>/<app>.racine.html,
  avec <parent>/<app>.txt, car Next cherche la route racine à « <parent>/<app> ».
- Chaque page charge ../demo-hors-ligne.js (simulation du géocodage hors ligne et bouton de retour).
"""
import os
import re
import shutil
import sys

src, app, dst = sys.argv[1], sys.argv[2], sys.argv[3]
P = "/" + app
B = "window.__VIEFR_BASE__"
AMORCE = (
    '<script>(function(){var A="%s",p=location.pathname,i=p.indexOf(A+"/"),'
    'B=i>=0?p.slice(0,i+A.length):(p.slice(-A.length)===A?p:A);window.__VIEFR_BASE__=B;if(B===A)return;'
    'function f(v){return typeof v==="string"&&v.indexOf(A+"/")===0?B+v.slice(A.length):v}'
    "var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){"
    'return sa.call(this,n,(n==="href"||n==="src")?f(v):v)};'
    '[[HTMLLinkElement,"href"],[HTMLScriptElement,"src"]].forEach(function(c){'
    "var d=Object.getOwnPropertyDescriptor(c[0].prototype,c[1]);Object.defineProperty(c[0].prototype,c[1],"
    "{get:d.get,set:function(v){d.set.call(this,f(v))},configurable:true})})})()</script>"
) % P


def js(s):
    # U+FFFD littéral (polyfills Next) : refusé par certains hébergeurs, remplacé par son échappement JS équivalent.
    s = s.replace("\ufffd", "\\ufffd")
    # "/app/_next/" -> B+"/_next/" ; "/app" -> B+"" (guillemets doubles, simples ou accents graves)
    return re.sub(r'(["\'`])' + re.escape(P) + r'(?=[/"\'`])', lambda m: B + "+" + m.group(1), s)


def script_inline(m):
    # Flux RSC des scripts inline : chaînes "..." ; on coupe la chaîne et on concatène la base calculée.
    corps = re.sub(re.escape(P) + r'(?=[/\\"])', '"+' + B + '+"', m.group(2))
    return m.group(1) + corps + m.group(3)


def html(s, rel_app, rel_racine):
    s = re.sub(r"(<script(?![^>]*\bsrc=)[^>]*>)(.*?)(</script>)", script_inline, s, flags=re.S)
    s = s.replace('="%s/' % P, '="%s' % rel_app).replace('="%s"' % P, '="%sindex.html"' % rel_app)
    tete = AMORCE + '<script src="%sdemo-hors-ligne.js"></script>' % rel_racine
    return s.replace("<head>", "<head>" + tete, 1)


def css(s):
    return s.replace(P + "/_next/static/", "../")


def lire(chemin):
    with open(chemin, encoding="utf-8") as f:
        return f.read()


def ecrire(chemin, contenu):
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(contenu)


if os.path.exists(dst):
    shutil.rmtree(dst)
shutil.copytree(src, dst)
for racine, _, fichiers in os.walk(dst):
    for nom in fichiers:
        chemin = os.path.join(racine, nom)
        ext = os.path.splitext(nom)[1]
        if ext == ".html":
            ecrire(chemin, html(lire(chemin), "./", "../"))
            if racine == dst and nom not in ("index.html", "404.html"):
                shutil.copyfile(chemin, chemin[:-5])
        elif ext == ".js":
            ecrire(chemin, js(lire(chemin)))
        elif ext == ".css":
            ecrire(chemin, css(lire(chemin)))

parent = os.path.dirname(os.path.abspath(dst))
shutil.copyfile(os.path.join(src, "index.txt"), os.path.join(parent, app + ".txt"))
ecrire(os.path.join(parent, app + ".racine.html"), html(lire(os.path.join(src, "index.html")), "./%s/" % app, "./"))
