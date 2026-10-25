// Les modèles de lettres (data/lettres/*.md) sont importés comme texte brut.
declare module "*.md" {
  const contenu: string;
  export default contenu;
}
