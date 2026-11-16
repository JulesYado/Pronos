# Pronos de saison

Outil web pour pronostiquer le classement d'une saison à plusieurs, pensé pour le partage d'écran / stream. V1 : NBA (Conférence Est puis Ouest). Interface en français ou en anglais (bouton FR/EN en haut à droite, touche L) ; les textes sont dans `src/i18n/dict.ts`.

**En ligne : https://julesyado.github.io/Pronos/** (déployé automatiquement à chaque push sur `main`).

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests du moteur
npm run build    # version statique dans dist/
```

## Fonctionnement

1. Choix de la ligue → 2. Joueurs (ordre de passage) → 3. Méthode + options → Partie → Révélation.

- **Méthodes** : tier list (catégories éditables, rouge → bleu), classement relatif (insertion entre deux équipes), par position (du haut ou du bas), par équipe (positions prises bloquées).
- **Ordre des équipes** : aléatoire, alphabétique ou choix libre (liste latérale).
- **Enchaînement** : joueur par joueur, ou tour par tour (chaque équipe passe par tous les joueurs).
- **Révélation** : dévoilement de la 15e à la 1re place, colonne consensus (moyenne), plus gros désaccords, correction a posteriori (✏️).
- Sauvegarde automatique (localStorage), export/import JSON, export PNG.

### Mode Playoffs

Sur la carte NBA, bouton **🏆 Playoffs** :

1. Options : play-in (7e à 10e), score des séries (4-0 … 4-3), MVP des Finales, ordre de passage.
2. Têtes de série : clic sur les équipes dans l'ordre, glisser pour corriger (10 par conférence avec play-in, 8 sinon).
3. Partie : chaque série s'affiche en duel ; un clic sur le score sous le vainqueur (ou sur le vainqueur sans score). Le tableau du joueur est toujours visible, ceux des autres en cliquant sur leur nom.
4. Révélation tour par tour : table des séries, tableau consensus (vainqueur choisi par la majorité), tableau de chaque joueur, champions et MVP, séries les plus disputées. ✏️ pour corriger un tableau.

## Raccourcis

| Touche | Action |
| --- | --- |
| 1–9 | Tier list : placer dans le tier |
| chiffres | Par équipe : position (ex. « 1 » puis « 2 » = 12e) |
| ↑ ↓ / ← → + Entrée | Relatif / par position : naviguer et valider |
| Ctrl/Cmd + Z | Annuler |
| ← → puis 0–3 | Playoffs : choisir le vainqueur puis ses défaites (4-0 … 4-3) ; Entrée sans score |
| Espace | Révélation : ligne / tour suivant |
| T | Thème clair / sombre |
| L | Langue : français / anglais |

## Ajouter un sport

Créer `src/leagues/<sport>.ts` sur le modèle de `nba.ts` (équipes, `groups` = classements à pronostiquer, `zones` optionnelles) et l'enregistrer dans `src/leagues/index.ts`.
