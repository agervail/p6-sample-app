# P-6 Sample Manager

Gestionnaire d'échantillons pour clé USB, façon Roland AIRA P-6 : 4 banques de 6 pads,
un WAV par pad, réglages par pad (fréquence, mono, pitch, découpe en tranches), puis
écriture séquentielle dans le dossier `IMPORT` de la clé.

Page web sans build ni dépendance runtime hors Google Fonts. Tout se passe dans le
navigateur, il n'y a pas de serveur applicatif.

## Lancer

```sh
python3 -m http.server 8080
```

Puis ouvrir <http://localhost:8080> dans **Chrome, Edge ou Brave**.

La File System Access API n'existe que sur Chromium et exige une origine sûre : en
`file://` le sélecteur de dossier est bloqué et IndexedDB inutilisable. La page ne
fonctionne pas non plus dans une iframe cross-origin. Ouverte en `file://`, elle
affiche un encart qui rappelle la commande au lieu d'une page vide.

## Installer comme application

La page est une PWA : servie depuis `localhost` ou `https://`, Chrome propose de
l'installer (icône dans la barre d'adresse, ou `⋮ → Diffuser, enregistrer et partager
→ Installer`). Elle atterrit alors dans `~/Applications/Chrome Apps` et s'ouvre dans sa
propre fenêtre.

Le service worker met en cache tout ce que la page charge — modules, styles, polices
Google — et la sert ensuite depuis ce cache : une fois visitée, l'app démarre serveur
éteint et réseau coupé.

La stratégie est *stale-while-revalidate* : le cache répond immédiatement, la version
fraîche est récupérée en arrière-plan et prise en compte au chargement suivant. **Une
modification du code apparaît donc au deuxième rechargement**, pas au premier.

## Utilisation

- **Charger** ouvre le sélecteur de fichier ; un glisser-déposer sur un pad marche aussi.
- Un clic sur une forme d'onde lance la lecture depuis ce point. Ce qui est joué est
  exactement ce qui sera écrit : rééchantillonnage, mono et pitch sont appliqués avant
  l'écoute, et la partie qui dépasse la mémoire du pad est coupée.
- La zone hachurée en rouge sur la forme d'onde montre ce qui ne tiendra pas.
- **Chop** découpe l'échantillon en tranches de longueur égale, régulièrement ou sur les
  transitoires détectées, et le remplace par le résultat sur le même pad.
- **Banques → clé** écrit toutes les banques, un fichier après l'autre, dans l'ordre des
  pads. **Clé → banques** relit le dossier `IMPORT`.
- ⌘Z / ⇧⌘Z annulent et rétablissent les modifications des pads.

## Conventions d'écriture

- Les fichiers sont nommés `A1_nom.wav` : lettre de banque, numéro de pad, nom nettoyé
  (`NFD`, diacritiques retirés, `[^A-Za-z0-9._-]` remplacé par `_`). Le préfixe rend
  l'ordre explicite quel que soit le tri du lecteur.
- L'écriture est strictement séquentielle, dans l'ordre des banques puis des pads.
- Les noms en double sont dédupliqués avant écriture (`_2`, `_3`).
- Export en WAV PCM 16 bits, en-tête écrit à la main.

## Hypothèses à ajuster

`MAX_PAD_BYTES` dans `js/constants.js` vaut 512 Kio par pad — c'est la valeur qui
reproduit les durées maximales observées (2,97 s en 44,1 kHz stéréo), pas une valeur
lue dans la documentation Roland. Le nom du dossier cible (`IMPORT_FOLDER_NAME`) et la
liste des fréquences proposées sont dans le même fichier.

## Limites assumées

- WAV uniquement : `decodeAudioData` suffit, pas de ffmpeg.wasm.
- Le pitch est un changement de vitesse, pas un time-stretch : la durée varie avec la
  hauteur.
- L'espace libre de la clé est inconnu du navigateur ; seule la taille à écrire est
  affichée.
- Pas d'éjection du volume, ça reste au Finder. Pollution macOS à nettoyer après coup :
  `dot_clean -m /Volumes/MaCle`.
- Les chunks WAV non audio (LIST/INFO, cue points) sont perdus à l'export.
- Seul le dossier de destination est mémorisé entre deux sessions (IndexedDB) ; les
  échantillons chargés ne le sont pas.
- Le handle de la clé est lié à l'origine : passer de `localhost` à un domaine `https://`
  demande une nouvelle autorisation.
- Les icônes sont générées par `tools/make-icons.py` (Python seul, sans dépendance).
