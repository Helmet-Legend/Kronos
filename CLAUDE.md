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
             tangent.js (hausse graduée : crans calculés / ajustés / mesurés, cranTable, étalonnage),
             poing.js (contrôle TAR des armes de poing), powder.js (sensibilité de la poudre par régression), ladder.js (développement de charge), confidence.js (zone probable 95 % : facteurs à 1 σ, zone ±2 σ, mêmes seuils que la maquette)
js/data/     model.js (état et opérations pures), store.js, catalog.js, meteo.js, crypto.js (sauvegarde chiffrée AES-GCM / PBKDF2)
js/ui/       dom.js (mini h(), fill() ; SVG_TAGS liste les balises créées dans l'espace de noms SVG), impacts.js (saisie des impacts : loupe, sélection, déplacement), photo.js (4 coins, redressement), chrono.js (mesures au chronographe), aide.js (accueil, bulles, panneau « ? »), ladder.js (échelle de charge), format.js, tir.js, table.js, armes.js, reglages.js, sheets.js (panneaux et formulaires),
             carnet.js (saisie de séance, carnet, recalage), hausse.js (tableau des crans, étalonnage) :
             panneaux à état local redessinés par draw() avec fill() de dom.js (jamais replaceChildren avec des null)
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

## État (v0.14.0)

Écran Tir (corrections en clics et sens, ou tenue en cm en visée mécanique ; distance, vent à l'horloge, angle ; vitesse, énergie, temps de vol, Mach), météo auto et manuelle (station ou QNH), table de tir, armes et munitions (catalogue et saisie manuelle), stabilité de Miller, compteur de coups (total jamais effacé, compteur depuis le nettoyage, annulation de la dernière saisie), thèmes sombre/clair/nuit, paysage, wake lock, sauvegarde, hors ligne. v0.2.0 : moteur validé jusqu'à 1 000 m (voir Validation). v0.3.0 : carnet de séance et recalage V0/BC (étapes 1 et 2 ci-dessous). v0.14.0 : arme de poing (`gun.type` = `'epaule'` | `'poing'`, `gun.hand = { type: 'pistolet'|'revolver', triggerKg, cat: 'recente'|'authentique', interdits[] }`, visée mécanique imposée, zéro 25 m ; `js/engine/poing.js` : `checkPoing()` contrôle calibre annexe A-830, canon ≤ 130 mm pistolet / 155 mm revolver, détente ≥ 1,360 kg, accessoires interdits ; `HANDGUNS` dans `catalog.js` : Glock 17 et 30S, pas et hauteur de visée à vérifier ; munitions S&B 9 mm et 45 ACP, discipline `POING`). Épreuves 830, 831, 832 dans `targets.js` (`kind: 'poing'`, 5e élément des phases = cible : C50, `VITESSE` 550 × 520, `GONG`) ; `eventScore()` (essais non comptés, gong = 5 points). Écran TAR : épreuves filtrées par type d'arme, données par phase `app.match.per[i] = { shots, gongs }`, pause automatique en fin de phase (bouton « Départ »), chrono en bandeau collé au-dessus de la cible pendant l'épreuve (`matchBar()`, réglages masqués, écran remonté en haut) avec commandes « Prêts ? » de 10 s par défaut, réglable 5/10/15/20 s (`settings.tar.countdown`, bip sur les 3 dernières secondes), « Feu ! », « Cessez le feu ! » et bips Web Audio (`settings.tar.sound`, coupables), une séance de carnet par cible papier à l'enregistrement. L'utilisateur a un Glock 17 et un Glock 30S. v0.13.0 : photo de cible redressée (`js/engine/homography.js` : `homography()`, `project()`, `convexQuad()`, `rectify()` au plus proche voisin ; `js/ui/photo.js` : photo réduite à 1 600 px, 4 poignées sur les coins du carton avec loupe canvas, image redressée de 900 px de large aux dimensions `T.w × T.h`, zones superposées en cyan) ; précision vérifiée sur une photo de synthèse déformée : trou à (100 ; 150) mm retrouvé à (99 ; 151). Correctif : `h()` ne créait pas `image` ni `ellipse` dans l'espace de noms SVG (photo du carnet et zone probable de l'écran TAR invisibles depuis leur création) ; ui_check vérifie l'ellipse. v0.12.0 : saisie des impacts commune au carnet et à l'écran TAR (`js/ui/impacts.js`, `impactPad()` + `selectionBar()`) : événements pointer, loupe ×4 en `position: fixed` construite une fois puis `viewBox` déplacée, impact posé au lever ; toucher le point dessiné sélectionne (rayon = trou dessiné, au moins 7 px, pour pouvoir poser un impact tout près d'un autre), glisser déplace (seuil 8 px au doigt) ; `touch-action: none` sur la cible ; `targetSvg()` accepte `view` et `sel`. v0.11.3 : données TAR reprises du règlement officiel 2025-2026 (PDF fourni par l'utilisateur) : zones et cordons des cibles, visuel noir relevé sur les dessins (C200 400 mm, C200 50 % 200 mm, C50 200 mm, `blackConfirmed: true`), comptage ISSF ; épreuves 810, 811, 812, 813, 815, 816, 820, 822, 823 (`phases: [nom, s, coups, position]`, `verified: true`) ; 821 et 830-832 (biathlon, pistolet, gongs) non reprises. v0.11.2 : BC du catalogue vérifiés le 23/11/2026 sur les données des fabricants (Hornady, Sierra, Lapua, Berger, Sellier & Bellot) : 22 fiches confirmées (champ `src`), corrections notables : 6mm BR Lapua 105 Scenar G7 0,236 (le tableau donnait 0,275), .338 LM 300 Scenar G7 0,368 (0,400), 230 Hybrid G7 0,368 (0,382), .375 CT 377 MTAC G7 0,447 (0,480), .22 LR Center-X G1 0,172 (0,130), 8x57 S&B 196 FMJ G1 0,509. Restent `verify` : 7 fiches à sources divergentes ou non trouvées, et les 15 calibres de chasse génériques (BC estimés). v0.11.1 : mises à jour proposées par un bandeau (`setupUpdates()` dans `app.js` : `reg.update()` à l'ouverture et au retour dans l'app, au plus toutes les 30 min ; `controllerchange` → `app.updateReady` ; « Mettre à jour » enregistre puis recharge, demande confirmation si une épreuve chronométrée tourne ; pas de bandeau au premier lancement). v0.11.0 : catalogue de 44 munitions (`AMMO` dans `catalog.js` : `disc` TAR/TLD/CC, `verify` + `src` si non repris d'un fabricant, `bcEst` si BC estimé ; les calibres de chasse sont là pour le tir, Kronos n'est pas une app de chasse) ; `catalogPicker()` filtrable dans `sheets.js`, `load.catalogRef` garde l'origine ; comparateur `js/engine/compare.js` + `js/ui/compare.js` (bouton dans Table). Les tableaux comparatifs fournis par l'utilisateur (nov. 2026) avaient des énergies justes mais des chutes, élévations et vents sous-estimés de 12 à 30 % et des portées supersoniques surestimées : ne reprendre que leurs données d'entrée (masse, BC, V0), jamais leurs résultats. v0.10.0 : écran TAR (5e onglet, `js/ui/tar.js`) : visée plein centre ou à 6 h (`settings.tar = { target, aim }`, `aimPoint()`), en 6 h le cran « Auto » vise un rayon de visuel plus haut ; points par la règle de la ligne ; épreuves `EVENTS` de `targets.js` (données de la maquette, `verified: false`) avec chrono `matchClock()` (état `app.match` non enregistré) ; série enregistrée dans le carnet avec `event`, `aim`, `offset` (impact prévu sur la cible ; `shots` relatifs à cet impact prévu, donc le point moyen reste l'écart au calcul). Visuels noirs C200 400 mm, C200 50 % 200 mm, C50 200 mm : recherche du 23/11/2026 (fabricants, MLAIC, ISSF), règlement officiel non lu (fftir.org bloqué dans la session), `blackConfirmed: false`. v0.9.0 : développement de charge (`load.ladder = { source, powder, start, max, step, t, d, steps: [{ gr, v0, groupMm, signs[] }] }`, recette `load.chargeGr`, `load.powder`, `load.chargeSource`, `load.handload`). Aucune table de charges dans l'app (responsabilité, licence Malfatti). v0.8.0 : accueil et bulles (`settings.onboardingDone`, `tipsEnabled`, `seenTips[]`, `backupReminder` ; une installation existante n'a pas l'accueil après mise à jour ; bulles masquées en paysage) ; la sauvegarde différée est écrite tout de suite quand l'app est masquée. v0.7.0 : chronographe (`load.chronoLog[] = { id, d, t, v0, n, sd }`, `load.sdV0` repris dans la zone probable). v0.6.0 : hausse graduée (`gun.sight.tangent = { min, max, step, crans: { '<cran>': { mrad, d, dist, offCm } } }`, `shot.cran` = cran choisi ou null pour auto ; `solve({ alpha })` impose l'angle du canon). v0.5.0 : zone probable à 95 % sur l'écran Tir (`gun.dispersionMoa`, réglable dans la fiche d'arme, 1,5 par défaut) ; en paysage une ligne résumée, l'écran tient sans défiler (vérifié dans ui_check). v0.4.0 : export chiffré, import avec mot de passe et aperçu, rappel de sauvegarde (phase 2 du cahier, sans le choix « fusionner » à l'import). 108 tests node et le parcours UI passent.

Schéma de données 2 (`SCHEMA` dans `model.js`, migration `migrate()` appliquée au chargement et à l'import) :
- `gun.sessions[]` : `{ id, d, dist, loadId, loadName, target, coldFirst, met, wind, cran, shots: [{x, y}] }` (`cran` : hausse graduée, cran utilisé ; le recalage garde son angle fixe), impacts en mm, origine au point visé, y vers le haut. Aucune valeur dérivée stockée : `groupStats()` recalcule.
- `load.trueLog[]` : `{ id, d, dist, dyCm, param: 'v0'|'bc', from, to, sessionId, undone? }`, `load.bcTrued` si un recalage BC est actif.
- `settings.lastBackupIso` et `settings.changesSinceBackup` (compté dans `set()` quand `guns` change) : rappel de sauvegarde (`backupDue`), bandeau dans Armes et Réglages, jamais sur l'écran Tir.
- La photo de cible n'est pas conservée (elle sert seulement à placer les impacts).
- Cibles et épreuves TAR : règlement FFTir 2025-2026 (diffusion du 12/01/2026), VII.1 p. 45 et fiches des épreuves. À relire à chaque nouvelle saison.

## Prochaines étapes (déjà maquettées, voir la maquette et le cahier des charges)

1. ~~**Carnet de séance**~~ (fait en v0.3.0, photo redressée en v0.13.0 ; reste la détection automatique des trous) : photo de la cible, impacts touchés à l'écran, groupement (cm, MOA), point moyen, coup à froid (1er impact exclu du point moyen), enregistrement qui ajoute les coups aux compteurs. Synthèse du coup à froid au bout de 3 séances (écart vertical moyen > 0,05 mrad et > 2× son incertitude).
2. ~~**Recalage V0 / BC**~~ (fait en v0.3.0) : bisection sur la V0 (±150 m/s) ou le BC (×0,6 à ×1,5) pour que le calcul retombe sur le point moyen observé. On ajuste le BC si la V0 est mesurée au chrono, sinon la V0. Refus en dessous de 300 m et si l'écart est inférieur à 2 × (rayon moyen / √n). Historique des recalages.
3. ~~**Visée mécanique avancée**~~ (fait en v0.6.0, visée à 6 h en v0.10.0) : crans de hausse (angle mécanique par cran) avec corrections mesurées et interpolées.
4. ~~**Zone de confiance à 95 %**~~ (fait en v0.5.0) : propagation des erreurs par différences finies (V0 ±12 m/s si non mesurée, BC ±5 % ou ±1,5 % si recalé, vent ±25 %, distance ±1 %, dispersion de l'arme).
5. **Fiche d'identité de l'arme** : n° de série masqué, photos, journal d'entretien, codes fabricants (K98k byf/bcd…, G98, G43, Mosin, SMLE, No4), modèles d'armes avec pas et sens connus.
6. ~~**Développement de charge**~~ (fait en v0.9.0), ~~**cibles et épreuves TAR**~~ (fait en v0.10.0, données du règlement officiel en v0.11.3) (C200, C200 50 %, C50 ; épreuves 810, 813, 815, 823), chrono de match.
7. **Dossier « Séances contrôlées »**, à part et verrouillé. Première demande en catégorie B : 3 séances sur 12 mois, espacées d'au moins 2 mois. Le carnet papier est supprimé depuis 2020 : le registre du club fait foi, l'app tient un relevé personnel non officiel. Visa signé au doigt, fiche verrouillée après signature, relevé PDF.
8. ~~Onboarding et bulles d'aide~~ (fait en v0.8.0), mode paysage enrichi.
9. **Compteur de coups au micro** (maquette : https://claude.ai/artifact/U6XaRCnr5zYaZpAw2KmtEE) : option coupée par défaut dans le bandeau du chrono, détections sur une frise (niveau en dB), seuil réglable et calé par k-moyennes entre vos coups et ceux des voisins, correction d'un toucher, temps des coups, ajout au compteur seulement après accord. L'utilisateur tire avec des voisins : la séparation reste à valider au stand. Décidé : dans la vraie version, pas de « stand simulé » ni de boutons « + Mon coup » / « + Coup du voisin » (maquette seulement), seulement le micro.

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
