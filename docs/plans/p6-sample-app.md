# P-6 Sample Manager

## État

- [x] 2026-08-19 — Squelette de l'application : modèle banques × pads, décodage WAV,
      rééchantillonnage, pitch, mono, découpe en tranches, export WAV 16 bits, écriture
      séquentielle dans `IMPORT`, relecture, undo/redo, persistance du dossier cible.
      Commit `11d8119`, poussé sur `origin/main`.

- [x] 2026-08-19 — Encart de démarrage quand la page est ouverte en `file://`, au lieu
      d'une grille vide et silencieuse.
- [x] 2026-08-19 — PWA : manifest, icônes générées, service worker hors-ligne. Vérifié
      serveur éteint : l'app démarre depuis le cache, polices comprises.
- [ ] Publier sur GitHub Pages pour se passer du serveur local — en attente de l'accord
      d'Antoine, ça rend le dépôt et l'app publics.

- [x] 2026-08-19 — Specs Roland fournies par Antoine : 512 Kio par échantillon confirmé,
      fréquences corrigées en 44100 / 22050 / 14700 / 11025 (32000 et 16000 n'existent
      pas sur l'appareil).

## Décisions

- Modèle retenu : 4 banques × 6 pads (le screenshot P-6), pas la liste à plat du brief.
- Traitements retenus : ceux du P-6 (fréquence, mono, pitch en cents, chop). La
  normalisation, le rognage des silences et les fondus du brief initial sont écartés
  de la V1.
- Direction visuelle sombre reprise du screenshot, mais retypographiée : une seule
  couleur de signal, l'ambre réservé à l'action d'écriture, le rouge au destructif.
- Le brief prévoyait un fichier HTML unique ; le périmètre réel (banques, chop,
  rééchantillonnage, undo, accès disque) l'a fait éclater en modules ES servis tels
  quels. Toujours aucun build.
- Le service worker ne maintient pas de liste de fichiers à précacher : la page lui
  envoie ce qu'elle vient réellement de charger (`performance.getEntriesByType`), plus
  le manifest et les icônes que cette API ne voit pas. Rien à mettre à jour en ajoutant
  un module.
- Stratégie *stale-while-revalidate* plutôt qu'un cache versionné : pas de numéro de
  version à incrémenter, au prix d'un rechargement de décalage après un changement.
- Le pitch est baké dans le fichier écrit par changement de vitesse, pas exposé comme
  paramètre au P-6 : on rééchantillonne vers `sampleRate / 2^(cents/1200)` et on déclare
  l'en-tête à `sampleRate`.
- La lecture rend exactement le fichier qui sera écrit, troncature comprise.

## À vérifier

- Le format de nommage `A1_` suppose que le P-6 importe par ordre alphabétique.

## Suite possible

- Presets de traitement, hash de doublons, découpe manuelle sur la waveform,
  réordonnancement des pads par glisser-déposer.
