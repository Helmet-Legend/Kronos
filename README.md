# Kronos

Calculateur balistique hors ligne pour le tir sportif : application web installable (PWA), sans dépendance, sans compte, sans serveur.

## Fonctions

- **Écran Tir** : élévation et dérive en MRAD ou MOA, avec le nombre de clics et le sens. En visée mécanique, la tenue en cm. Vitesse, énergie, temps de vol, régime (supersonique, transsonique, subsonique).
- **Zone probable d'impact (95 %)** : propagation des incertitudes (V0, BC, vent, distance, sens des rayures, dispersion arme + tireur), part de chaque facteur et conseil qui réduit le plus la zone.
- **Réglages du tir** : distance (saisie ou ±10/±50 m), vent à l'horloge (12 h = de face, 3 h = de la droite), angle de site.
- **Météo** : automatique (GPS + Open-Meteo, pression au stand) ou saisie manuelle (pression station ou QNH + altitude). Le vent météo peut être converti en heures si la direction du tir est connue.
- **Catalogue de munitions** (46 fiches) : TAR, TLD et calibres de chasse utilisés au tir, filtres par discipline, recherche, mention « à vérifier » et « BC estimé » pour les données non reprises d'un fabricant.
- **Comparateur** (onglet Table) : jusqu'à 4 munitions, les vôtres ou celles du catalogue, dans les mêmes conditions : élévation, chute, vent, énergie, portée supersonique, courbes.
- **Profil de la trajectoire** (en tête de la table) : courbe par rapport à la ligne de visée, flèche maximale, passage sous Mach 1,2.
- **Table de tir** : 100 à 1500 m, pas de 25, 50 ou 100 m, avec le vent du moment. La ligne la plus proche de la distance de l'écran Tir est surlignée.
- **Chronographe** : journal des V0 mesurées avec la température de la poudre ; sensibilité apprise par régression (à partir de 3 mesures sur 10 °C d'écart), appliquée à la munition avec la V0 à la température de référence.
- **Développement de charge** : échelle entre les bornes saisies par le tireur (source obligatoire, aucune charge fournie par Kronos), paliers de 0,2, 0,3 ou 0,5 gr (20 au plus, jamais au-delà du maximum), V0 et groupement par palier, arrêt au premier signe de pression, charge candidate au milieu des 3 paliers où la V0 varie le moins, enregistrée dans la recette de la munition.
- **Hausse graduée** (tangentielle, curseur, dioptre à crans) : cran conseillé et tenue restante sur l'écran Tir et dans la table, choix manuel du cran. Étalonnage au tir : l'angle réel d'un cran mesuré est enregistré (il reste valable avec une autre munition) et corrige les crans voisins par interpolation (calculé, ajusté, mesuré).
- **Armes** : plusieurs armes, plusieurs munitions par arme (saisie manuelle ou catalogue), lunette ou visée mécanique, stabilité de Miller.
- **Écran TAR** : cible C200, C200 50 % ou C50 dessinée avec le guidon, visée plein centre ou à 6 h (cran conseillé pour chaque visée), impact prévu avec sa zone probable et ses points, comptage des points en touchant les impacts, épreuves chronométrées (810, 813, 815, 823 ; durées à vérifier sur le règlement) enregistrées dans le carnet.
- **Carnet de séance** : cible C200, C200 50 %, C50 ou quadrillage (ou photo de la cible), impacts touchés à l'écran avec zoom, groupement (cm, MOA), rayon moyen, point moyen, clics pour recentrer, coup à froid (1er impact exclu du point moyen). Les coups s'ajoutent aux compteurs. Synthèse du coup à froid au bout de 3 séances, affichée aussi sur l'écran Tir.
- **Recalage V0 / BC** : à partir d'une séance ou d'un écart saisi, Kronos ajuste la V0 (non mesurée) ou le BC (V0 mesurée) pour retomber sur le point moyen. Refus en dessous de 300 m (ou 2 × le zéro) et si l'écart n'est pas significatif. Historique daté, dernier recalage annulable.
- **Compteur de coups** : total jamais remis à zéro, compteur depuis le dernier nettoyage, historique, annulation de la dernière saisie.
- **Premier lancement et aide** : accueil en 3 écrans (rejouable), bulles pédagogiques une fois par écran, bouton « ? » (activer ou réafficher les bulles, revoir l'accueil, toutes les explications).
- **Thèmes** : sombre, clair (plein soleil), nuit (rouge sur noir). Disposition paysage au stand.
- **Écran toujours allumé** sur l'écran Tir (Wake Lock, si le navigateur le permet).
- **Sauvegarde** : export et import d'un fichier JSON, en clair ou chiffré par mot de passe (AES-GCM 256 bits, clé PBKDF2-SHA256 600 000 itérations), aperçu du contenu avant restauration, partage par la feuille du système si disponible. Rappel si plus de 20 modifications ou plus de 30 jours depuis la dernière sauvegarde. Les données restent sur le téléphone (IndexedDB, stockage protégé demandé au navigateur).

## Moteur balistique

Point-masse, intégration Runge-Kutta 4 (pas de 1 ms) dans le repère de la ligne de visée : traînée G1 ou G7, air humide (Tetens), densité et vitesse du son qui suivent l'altitude de la balle, vent, angle de site, dérive gyroscopique (Litz) avec le facteur de stabilité de Miller, sensibilité de la poudre à la température.

Validation :
- contre 31 valeurs publiées par Federal (Army Standard Metro) et Hornady (ICAO) jusqu'à 500 yards : écart maximal 2,2 ft/s (0,7 m/s) et 0,12 pouce (3 mm). Voir `tests/validation.test.js` ;
- contre le calculateur libre py-ballisticcalc jusqu'à 1 000 m, 16 cas en G1 et en G7 (supersonique, transsonique, subsonique ; chaleur, froid, basse pression, air saturé, site ±10°) : écart maximal 0,006 mrad en chute et en dérive, pour une exigence de 0,1 mrad. Voir `tests/reference1000.test.js` et `tests/tools/reference.py` ;
- les tables G1 et G7 (jusqu'à Mach 5) sont identiques point par point aux tables standard de py-ballisticcalc.

Calcul complet (zéro + table de 25 à 1 500 m) : moins de 1 ms sur un ordinateur.

Pas encore pris en compte : effet Coriolis. Au-delà de 800 m et en zone transsonique, recalez sur vos impacts réels.

## Utiliser

Il faut servir les fichiers en HTTPS (ou en local) pour que le service worker et la géolocalisation fonctionnent :

```sh
npm run serve        # python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`. Sur le téléphone : menu du navigateur, « Ajouter à l'écran d'accueil ». L'application fonctionne ensuite hors ligne.

Hébergement gratuit possible avec GitHub Pages (branche `main`, dossier racine).

## Tests

```sh
npm test                       # moteur, validation, données, météo (node:test, Node 20+)
python3 tests/ui_check.py      # parcours complet dans Chrome sans écran (Playwright)
```

## Organisation

```
index.html, manifest.webmanifest, sw.js   application installable et hors ligne
css/app.css                               thèmes et mises en page portrait et paysage
js/engine/                                moteur balistique (SI), groupement, recalage, cibles TAR ; sans dépendance au navigateur
js/data/                                  modèle, stockage, catalogue, météo
js/ui/                                    écrans et panneaux
tests/                                    tests automatiques
```

## Mentions

Météo : [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0), gratuit pour un usage non commercial. Une version commerciale de Kronos demandera un abonnement Open-Meteo.

Kronos est une aide au calcul. Vérifiez toujours vos réglages sur cible et respectez les règles de sécurité du stand.
