# Kronos sur Google Play : test fermé

Tout ce qu'il faut pour publier Kronos en test fermé : textes à copier dans la Play Console, réponses aux formulaires, images, et la marche à suivre pour fabriquer l'application Android depuis le site.

Fichiers dans ce dossier :
- `image-presentation.png` (1024 × 500, « Image de présentation »), source : `image-presentation.html`
- `captures/1-tir.png` à `captures/5-tir-nuit.png` (1080 × 1920, « Captures d'écran du téléphone »)
- Icône 512 × 512 : `../icons/icon-512.png`
- Politique de confidentialité : https://helmet-legend.github.io/Kronos/confidentialite.html

---

## 1. Fiche du Play Store

**Nom de l'application** (30 caractères au plus)

```
Kronos · balistique
```

**Description courte** (80 caractères au plus)

```
Balistique hors ligne pour le tir sportif : TAR, longue distance, armes d'époque
```

**Description complète** (4 000 caractères au plus)

```
Kronos calcule vos réglages de tir au stand, sans réseau, sans compte et sans publicité. Il est pensé pour le tir sportif en France : tir aux armes réglementaires (TAR, FFTir), tir longue distance et armes historiques.

RÉGLAGES DE TIR
• Corrections en clics et en sens (MRAD ou MOA), ou tenue en centimètres en visée mécanique
• Distance, vent à l'horloge, angle de site, météo du stand
• Vitesse, énergie, temps de vol et nombre de Mach à la cible
• Zone probable d'impact à 95 %, avec ce qui pèse le plus (vent, vitesse, distance…)
• Table de tir et comparateur de munitions

UN CALCUL VÉRIFIÉ
Moteur point-masse (traînée G1 ou G7, air humide, vent, angle de site, dérive gyroscopique). Comparé à 31 valeurs publiées par Federal et Hornady, puis à un calculateur de référence jusqu'à 1 000 m : écart maximal de 0,006 mrad.

TAR ET ARMES DE POING
• Cibles C200, C200 50 %, C50 et cible vitesse aux cotes du règlement 2025-2026
• Visée plein centre ou à 6 h, cran de hausse conseillé
• Épreuves chronométrées (810 à 823, 830, 831, 832) : « Prêts ? », « Feu ! », « Cessez le feu ! », bips, points sur 200
• Contrôle indicatif d'une arme de poing selon le règlement : calibre, canon, poids de détente, accessoires

ARMES HISTORIQUES
• Hausse graduée (K98k, MAS 36, Mosin…) : cran conseillé et étalonnage sur vos séances
• Modèles d'armes préremplis : canon, pas et sens des rayures

CARNET DE SÉANCE
• Photo de la cible redressée, impacts posés au doigt avec une loupe
• Groupement, point moyen, coup à froid, clics pour recentrer
• Recalage de la vitesse ou du coefficient balistique sur vos impacts
• Chronographe, développement de charge (vos propres mesures, aucune donnée de charge fournie), compteur de coups

AU STAND
• Fonctionne entièrement hors ligne
• Météo automatique en un toucher (facultative)
• Thème nuit rouge sur noir, mode paysage, écran qui reste allumé
• Sauvegarde dans un fichier, chiffrée si vous le souhaitez

VOS DONNÉES RESTENT CHEZ VOUS
Aucun compte, aucun serveur, aucun traceur. Tout est enregistré sur votre téléphone. Seule la météo automatique envoie votre position approximative à Open-Meteo, quand vous la demandez.

Kronos est une aide au calcul : vérifiez toujours vos réglages sur cible et respectez les règles de sécurité du stand.

Météo : Open-Meteo.com (CC BY 4.0).
```

**Catégorie** : Sports. **Tags** : tir sportif, balistique, outils.

**Coordonnées** :
- Adresse e-mail : la vôtre (obligatoire, elle sera publique sur la fiche ; une adresse dédiée à Kronos est plus prudente).
- Site web : https://helmet-legend.github.io/Kronos/
- Politique de confidentialité : https://helmet-legend.github.io/Kronos/confidentialite.html

---

## 2. Contenu de l'application (formulaires de la Play Console)

Réponses proposées. Relisez chaque question au moment de remplir : les intitulés de Google changent.

**Politique de confidentialité** : l'adresse ci-dessus.

**Annonces** : Non, l'application ne contient pas d'annonces.

**Accès à l'application** : Toutes les fonctionnalités sont accessibles sans identifiants.

**Public cible** : 18 ans et plus. Cela évite les règles des applications pour enfants, et convient à une application de tir.

**Classification du contenu** (questionnaire IARC) : catégorie « Toutes les autres types d'applications » (ou « Référence, actualités ou éducation »). Répondez honnêtement aux questions : pas de violence, pas de contenu sexuel, pas de jeux d'argent, pas d'échanges entre utilisateurs, pas d'achat. S'il y a une question sur les armes, indiquez que l'application traite d'armes réelles dans un cadre de tir sportif, sans violence.

**Sécurité des données** :
- Données collectées ou partagées : Oui.
- Type : Position, « Position approximative ».
  - Collectée : Oui (elle quitte le téléphone pour la météo).
  - Partagée : Non. Open-Meteo agit comme un prestataire qui fournit la météo demandée par l'utilisateur ; Google ne compte pas ce transfert comme un partage.
  - Traitée de façon éphémère : Non (nous ne maîtrisons pas les journaux d'Open-Meteo, mieux vaut répondre Non).
  - Obligatoire ou facultative : Facultative, l'utilisateur peut saisir la météo à la main.
  - Finalité : Fonctionnalités de l'application.
- Données chiffrées en transit : Oui (HTTPS).
- Suppression des données : l'éditeur ne conserve aucune donnée ; tout s'efface dans l'application (Réglages, « Réinitialiser ») ou en la désinstallant.
- Aucun autre type de données (pas de photos envoyées, pas d'identifiants, pas de contacts, pas d'informations financières).

**Applications d'actualités, santé, finance, gouvernement** : Non.

**Point à surveiller : le développement de charge.** Le règlement de Google interdit les applications qui expliquent comment fabriquer des munitions. Kronos ne fournit ni donnée de charge ni méthode : il enregistre seulement les essais de l'utilisateur. Si Google le refuse malgré tout, on masquera cet écran dans la version Play Store.

---

## 3. Fabriquer l'application Android (PWABuilder)

1. Ouvrir https://www.pwabuilder.com, saisir `https://helmet-legend.github.io/Kronos/`, puis « Package for stores », « Android », « Generate Package ».
2. Options :
   - Package ID : `io.github.helmet_legend.kronos` (définitif : on ne peut plus le changer une fois publié).
   - App name : `Kronos`, Launcher name : `Kronos`.
   - Version : `0.15.1`, version code : `1` (à augmenter à chaque envoi).
   - Signing key : « New », avec vos nom et mot de passe.
3. Télécharger le ZIP. Il contient :
   - le fichier `.aab` à envoyer dans la Play Console ;
   - la clé de signature (`signing.keystore`) et ses mots de passe : **à garder précieusement en lieu sûr**, sans elle aucune mise à jour n'est possible ;
   - un fichier `assetlinks.json`.
4. **Fichier de vérification** (pour que Kronos s'ouvre en plein écran, sans barre d'adresse) : `assetlinks.json` doit être servi à `https://helmet-legend.github.io/.well-known/assetlinks.json`, à la racine du domaine, pas dans `/Kronos/`.
   - Créer sur GitHub un dépôt public nommé exactement `Helmet-Legend.github.io`, activer GitHub Pages sur sa branche `main`.
   - Y mettre `.well-known/assetlinks.json` et un fichier `.nojekyll` vide (sinon GitHub ignore les dossiers qui commencent par un point).
   - Après le premier envoi, la Play Console (Configuration, « Intégrité de l'application ») donne une **deuxième empreinte SHA-256**, celle de la signature de Google : l'ajouter dans `assetlinks.json` à côté de celle de PWABuilder.
   - Sans ce fichier, l'application marche mais affiche une barre d'adresse en haut.

## 4. Test fermé

1. Play Console : « Tester et publier », « Tests », « Test fermé », créer un canal, envoyer le `.aab`, remplir les notes de version.
2. Testeurs : une liste d'adresses Gmail ou un groupe Google. Au moins 12 testeurs inscrits pendant 14 jours de suite (comptes personnels créés après le 13 novembre 2023 ; à revérifier dans la Play Console).
3. Pays : France (et les pays de vos testeurs).
4. Après 14 jours, « Demander l'accès à la production » et répondre au questionnaire sur le test.

**Notes de version** (500 caractères au plus) :

```
Première version de test. Merci de signaler tout calcul qui vous paraît faux, toute donnée d'arme ou de munition incorrecte (beaucoup sont marquées « à vérifier ») et tout souci d'affichage au stand. Gardez l'application installée 14 jours.
```

**Message d'invitation pour les testeurs du club** :

```
Bonjour,

Je teste Kronos, un calculateur balistique hors ligne pour le tir sportif (TAR, tir longue distance, armes anciennes), avant sa sortie sur Google Play. Google demande au moins 12 testeurs pendant 14 jours.

Pour participer (téléphone Android et compte Google) :
1. Envoyez-moi l'adresse Gmail de votre téléphone.
2. Ouvrez le lien d'inscription que je vous enverrai et acceptez de devenir testeur.
3. Installez Kronos depuis Google Play avec le même compte.
4. Gardez l'application installée au moins 14 jours et utilisez-la au stand si vous pouvez.

Aucun compte à créer, aucune publicité, aucune donnée envoyée : tout reste sur votre téléphone.
Vos remarques (calculs, données d'armes, affichage) m'aident beaucoup.

Merci !
```
