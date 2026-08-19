# P-6 Sample Manager

## État

- [x] 2026-08-19 — Squelette de l'application : modèle banques × pads, décodage WAV,
      rééchantillonnage, pitch, mono, découpe en tranches, export WAV 16 bits, écriture
      séquentielle dans `IMPORT`, relecture, undo/redo, persistance du dossier cible.
      Commit `11d8119`, poussé sur `origin/main`.

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
- Le pitch est baké dans le fichier écrit par changement de vitesse, pas exposé comme
  paramètre au P-6 : on rééchantillonne vers `sampleRate / 2^(cents/1200)` et on déclare
  l'en-tête à `sampleRate`.
- La lecture rend exactement le fichier qui sera écrit, troncature comprise.

## À vérifier

- `MAX_PAD_BYTES` = 512 Kio est une hypothèse calée sur les durées du screenshot, pas
  une donnée constructeur. À confronter à un vrai P-6.
- Le format de nommage `A1_` suppose que le P-6 importe par ordre alphabétique.

## Suite possible

- Presets de traitement, hash de doublons, découpe manuelle sur la waveform,
  réordonnancement des pads par glisser-déposer.
