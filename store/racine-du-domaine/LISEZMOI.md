# Racine du domaine helmet-legend.github.io

Ces fichiers vont dans un dépôt GitHub public nommé exactement `Helmet-Legend.github.io` (GitHub Pages sur la branche `main`, dossier racine). Ils ne servent pas à Kronos lui-même.

- `.well-known/assetlinks.json` : prouve à Android que l'application `io.github.helmet_legend.kronos` et le site appartiennent à la même personne. Sans lui, Kronos installé depuis le Play Store affiche une barre d'adresse en haut.
- `.nojekyll` : sans ce fichier vide, GitHub Pages ignore les dossiers qui commencent par un point, dont `.well-known`.
- `index.html` : renvoie `https://helmet-legend.github.io/` vers Kronos.

Empreintes SHA-256 dans `assetlinks.json` :
1. clé de PWABuilder (`signing.keystore`) : déjà présente ;
2. clé de Google Play (Play Console, « Tester et publier », « Configuration », « Intégrité de l'application », « Certificat de la clé de signature d'application ») : à ajouter après le premier envoi, dans la même liste `sha256_cert_fingerprints`.

Vérification : https://helmet-legend.github.io/.well-known/assetlinks.json doit afficher le fichier.
