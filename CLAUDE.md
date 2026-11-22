# Kronos : contexte pour Claude Code

Ce fichier reprend une longue conversation menée dans l'app Claude (novembre 2026) : cahier des charges, maquette jouable, puis codage de la phase 1. Lis-le avant de travailler sur le dépôt.

## Le projet

Kronos est un calculateur balistique hors ligne pour le tir sportif en France : tir aux armes réglementaires (TAR, FFTir), tir longue distance (TLD), armes historiques (K98k, MAS 36…). L'utilisateur est francophone. **Toute l'interface, les messages et la documentation sont en français**, avec la virgule décimale (`num()` dans `js/ui/format.js`).

- Dépôt : https://github.com/Helmet-Legend/Kronos (branche `main`)
- Site (GitHub Pages, branche `main`, racine) : https://helmet-legend.github.io/Kronos/
- Cahier des charges v2.1 (Claude Docs) : https://claude.ai/artifact/N2Rq8jXZKkgWzFqp3wzoMh
- Maquette jouable de toute l'app (Claude Design) : https://claude.ai/artifact/Cx4sAGm4spyQUjetqSjYnb. Elle a trois écrans : l'app portrait, le paysage au stand, et le dossier « Séances contrôlées ».

## Choix techniques (décidés avec l'utilisateur)

- **PWA en JavaScript pur, sans dépendance ni build** : modules ES, `index.html` servi tel quel. Ce choix a remplacé React + Vite du cahier des charges, faute de pouvoir installer des paquets dans la session d'origine. On peut migrer plus tard, mais garde « zéro dépendance » tant que l'utilisateur n'a rien décidé d'autre.
- Données locales uniquement : IndexedDB (une clé `state`), repli sur localStorage. Pas de compte ni de serveur. Sauvegarde par export/import JSON.
- Hors ligne grâce au service worker `sw.js` (cache d'abord). **Incrémente `CACHE` dans `sw.js` et `VERSION` dans `js/app.js` à chaque version**, et ajoute tout nouveau fichier à la liste `SHELL`.
- Météo automatique : géolocalisation + Open-Meteo (pression station, `surface_pressure`). Gratuit en usage non commercial seulement (CC BY 4.0).
- APK : pas maintenant. Plus tard, Capacitor pour le Bluetooth (chronographes), le baromètre du téléphone et le Play Store. En attendant, PWABuilder peut générer un APK depuis l'URL.
- Palette « Signal » (nom de l'app : Kronos). Sombre : fond `#05080F`, accent ambre `#FF8A1F`, cyan `#38BDF8`. Clair. Nuit : rouge sur noir uniquement. Variables CSS dans `css/app.css`.
- Icône fournie par l'utilisateur : `icons/` (source 1024 px : `icons/icon-1024.png`).
- Accessibilité : cibles tactiles de 44 px au minimum, `aria-label` sur les boutons à icône, contraste suffisant en plein soleil.

## Organisation du code

```
js/engine/   moteur balistique (SI), sans dépendance au navigateur : drag.js (G1, G7), atmo.js, units.js, solver.js,
             grouping.js (groupe, point moyen, coup à froid, clics), truing.js (recalage V0/BC), targets.js (cibles TAR),
             confidence.js (zone probable 95 % : facteurs à 1 σ, zone ±2 σ, mêmes seuils que la maquette)
js/data/     model.js (état et opérations pures), store.js, catalog.js, meteo.js, crypto.js (sauvegarde chiffrée AES-GCM / PBKDF2)
js/ui/       dom.js (mini h()), format.js, tir.js, table.js, armes.js, reglages.js, sheets.js (panneaux et formulaires),
             carnet.js (saisie de séance, carnet, recalage : panneaux à état local redessinés par draw())
js/app.js    état unique, set(), rendu complet à chaque changement, panneaux, wake lock, service worker
tests/       node:test (npm test) + tests/ui_check.py (Playwright + Chrome headless, parcours complet)
```

Conventions : on modifie l'état seulement avec `set(fn)` (sauvegarde différée puis rendu). Les opérations sur les données sont des fonctions pures dans `model.js`, testées. Les formulaires des panneaux sont construits une fois puis lus à l'enregistrement (`field().get()`). La mise en page paysage passe par une media query (`orientation: landscape` et `max-height: 520px`) avec une grille nommée dans `main.tir`.

## Moteur balistique

Point-masse RK4 (pas de 1 ms) dans le repère de la ligne de visée. Il prend en compte :
- la traînée G1 ou G7, avec `bc` en lb/in² converti par × 703,0696 ;
- l'air humide (Tetens) ;
- la densité et la vitesse du son qui suivent l'altitude de la balle (gradient −6,5 K/km, loi barométrique ; `tK` dans `trajectory`), sensible sur les tirs en site ;
- le vent à l'horloge (12 h = de face, 3 h = venant de la droite, qui pousse la balle à gauche) ;
- l'angle de site ;
- la dérive gyroscopique de Litz avec le Sg de Miller (sens du pas R, L ou `?`, nulle si inconnu) ;
- la sensibilité de la poudre (`v0 + sens·(T − refTemp)`).

Le zéro est calculé dans l'atmosphère ICAO par défaut (`zeroMet`).

**Validation** (ne casse jamais ces tests) :
- `tests/validation.test.js` : 31 valeurs Federal (Army Standard Metro) et Hornady (ICAO) jusqu'à 500 yd. Écart maximal 2,2 ft/s et 0,12 in, tolérance 3 ft/s et 0,2 in.
- `tests/reference1000.test.js` : 16 cas jusqu'à 1 000 m contre py-ballisticcalc 3.1.1 (G1 et G7, trans/subsonique, conditions extrêmes, site ±10°). Écart maximal 0,006 mrad, tolérance 0,03 mrad (porte du cahier : 0,1 mrad). Les données viennent de `tests/tools/reference.py` (outil hors application). Test de performance : < 5 ms pour zéro + table jusqu'à 1 500 m.
- Tables G1 et G7 vérifiées point par point contre py-ballisticcalc (novembre 2026), jusqu'à Mach 5.
- Le zéro se cherche par la sécante (dichotomie en secours).

Pas encore fait : effet Coriolis, comparaison à des relevés réels au-delà de 800 m.

## État (v0.3.0, branche `claude/nuit-moteur-carnet`)

Écran Tir (corrections en clics et sens, ou tenue en cm en visée mécanique ; distance, vent à l'horloge, angle ; vitesse, énergie, temps de vol, Mach), météo auto et manuelle (station ou QNH), table de tir, armes et munitions (catalogue et saisie manuelle), stabilité de Miller, compteur de coups (total jamais effacé, compteur depuis le nettoyage, annulation de la dernière saisie), thèmes sombre/clair/nuit, paysage, wake lock, sauvegarde, hors ligne. v0.2.0 : moteur validé jusqu'à 1 000 m (voir Validation). v0.3.0 : carnet de séance et recalage V0/BC (étapes 1 et 2 ci-dessous). v0.5.0 : zone probable à 95 % sur l'écran Tir (`gun.dispersionMoa`, réglable dans la fiche d'arme, 1,5 par défaut) ; en paysage une ligne résumée, l'écran tient sans défiler (vérifié dans ui_check). v0.4.0 : export chiffré, import avec mot de passe et aperçu, rappel de sauvegarde (phase 2 du cahier, sans le choix « fusionner » à l'import). 67 tests node et le parcours UI passent.

Schéma de données 2 (`SCHEMA` dans `model.js`, migration `migrate()` appliquée au chargement et à l'import) :
- `gun.sessions[]` : `{ id, d, dist, loadId, loadName, target, coldFirst, met, wind, shots: [{x, y}] }`, impacts en mm, origine au point visé, y vers le haut. Aucune valeur dérivée stockée : `groupStats()` recalcule.
- `load.trueLog[]` : `{ id, d, dist, dyCm, param: 'v0'|'bc', from, to, sessionId, undone? }`, `load.bcTrued` si un recalage BC est actif.
- `settings.lastBackupIso` et `settings.changesSinceBackup` (compté dans `set()` quand `guns` change) : rappel de sauvegarde (`backupDue`), bandeau dans Armes et Réglages, jamais sur l'écran Tir.
- La photo de cible n'est pas conservée (elle sert seulement à placer les impacts).
- Le diamètre du noir des cibles TAR reste indicatif (`blackConfirmed: false` dans `targets.js`) : à confirmer sur le règlement.

## Prochaines étapes (déjà maquettées, voir la maquette et le cahier des charges)

1. ~~**Carnet de séance**~~ (fait en v0.3.0, sauf redressement de la photo et détection automatique des trous) : photo de la cible, impacts touchés à l'écran, groupement (cm, MOA), point moyen, coup à froid (1er impact exclu du point moyen), enregistrement qui ajoute les coups aux compteurs. Synthèse du coup à froid au bout de 3 séances (écart vertical moyen > 0,05 mrad et > 2× son incertitude).
2. ~~**Recalage V0 / BC**~~ (fait en v0.3.0) : bisection sur la V0 (±150 m/s) ou le BC (×0,6 à ×1,5) pour que le calcul retombe sur le point moyen observé. On ajuste le BC si la V0 est mesurée au chrono, sinon la V0. Refus en dessous de 300 m et si l'écart est inférieur à 2 × (rayon moyen / √n). Historique des recalages.
3. **Visée mécanique avancée** : crans de hausse (angle mécanique par cran) avec corrections mesurées et interpolées.
4. ~~**Zone de confiance à 95 %**~~ (fait en v0.5.0) : propagation des erreurs par différences finies (V0 ±12 m/s si non mesurée, BC ±5 % ou ±1,5 % si recalé, vent ±25 %, distance ±1 %, dispersion de l'arme).
5. **Fiche d'identité de l'arme** : n° de série masqué, photos, journal d'entretien, codes fabricants (K98k byf/bcd…, G98, G43, Mosin, SMLE, No4), modèles d'armes avec pas et sens connus.
6. **Développement de charge** (rechargement, sans tables Malfatti), **cibles et épreuves TAR** (C200, C200 50 %, C50 ; épreuves 810, 813, 815, 823), chrono de match.
7. **Dossier « Séances contrôlées »**, à part et verrouillé. Première demande en catégorie B : 3 séances sur 12 mois, espacées d'au moins 2 mois. Le carnet papier est supprimé depuis 2020 : le registre du club fait foi, l'app tient un relevé personnel non officiel. Visa signé au doigt, fiche verrouillée après signature, relevé PDF.
8. Onboarding et bulles d'aide, mode paysage enrichi.

## Vérifier avant de livrer

```sh
npm test
python3 tests/ui_check.py [dossier_captures]
```

`ui_check.py` demande le paquet Python `playwright` (`pip install playwright`) ; il lance `/usr/bin/google-chrome`.

Regarde les captures en portrait (390 × 844), en paysage (844 × 390) et en thème nuit après tout changement d'interface.

## Préférences de l'utilisateur constatées

- Il valide par étapes (« Fais le », « Ok ») et préfère une maquette avant le code.
- Le nom de l'app reste « Kronos ».
- Pas de prédiction d'usure du canon : compter les coups suffit.
- Les données d'exemple (BC, années de fabrication, pas de rayure) doivent être marquées « à vérifier » quand elles ne sont pas sourcées.
- Commits avec les lignes d'attribution Claude habituelles.
