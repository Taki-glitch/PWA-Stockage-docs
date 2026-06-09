# 📁 DocVault

DocVault est une Progressive Web App offline-first servant de coffre documentaire personnel intelligent. L'application fonctionne sans serveur et conserve les métadonnées comme les fichiers dans IndexedDB.

## Fonctionnalités

- Import de PDF, images et fichiers locaux sous forme de `Blob`.
- Organisation par catégories, tags, favoris et archives.
- Vue **Dossiers** pour parcourir les catégories comme de vrais dossiers structurés.
- Vue **Timeline** regroupée par année et mois à partir de `createdAt`.
- Vue **Documents récents** basée sur `updatedAt`.
- Corbeille avec restauration possible et purge automatique après 30 jours.
- Échéances avec dashboard actionnable des urgences à 14 jours.
- Recherche globale 100% client-side sur titre, catégorie, tags, résumé, notes et blocs.
- Relations entre documents et backlinks automatiques pour savoir quels documents mentionnent la fiche ouverte.
- Éditeur léger block-based avec blocs texte, titre et todo.
- Export/import JSON des métadonnées pour sauvegarde locale.
- Service worker pour cache de l'application shell et usage hors ligne.

## Architecture

```text
docvault/
├── index.html
├── style.css
├── app.js
├── db.js
├── search.js
├── manifest.json
├── service-worker.js
└── icons/
```

## Modèle de données

```js
{
  id: "uuid",
  title: "Nom du document",
  file: Blob,
  category: "Administratif",
  tags: ["voiture", "important"],
  summary: "",
  notes: "",
  favorite: false,
  archived: false,
  deleted: false,
  deletedAt: null,
  dueDate: null,
  relations: [],
  blocks: [],
  createdAt: "2026-06-09T00:00:00.000Z",
  updatedAt: "2026-06-09T00:00:00.000Z"
}
```

## Contraintes projet

- IndexedDB reste la source unique des données utilisateur.
- Aucun backend ne doit être ajouté.
- Le service worker ne stocke que l'application shell, jamais les données utilisateur.
- La suppression passe par une corbeille locale avant purge définitive.
- La recherche reste full client-side.
- Les dépendances externes doivent être évitées pour préserver l'usage offline et la compatibilité iPad.

## Installation iPad

1. Ouvrir l'application dans Safari.
2. Toucher le bouton de partage.
3. Choisir **Ajouter à l'écran d'accueil**.
4. Lancer DocVault comme une application installée.
