# Bplace+

Extension Chrome / Opera GX qui ajoute des outils à [bplace.art](https://bplace.art).

## Fonctionnalités

- **Capture de zone** au pixel près : 1 pixel du jeu = 1 pixel dans le PNG, fond transparent, coordonnées dans le nom du fichier. Idéal pour préparer des templates dans Krita.
- **Palettes Krita (.kpl)** : couleurs de base, mes couleurs débloquées, toutes les couleurs du jeu.
- **Objectifs épinglés** : épingle des quêtes et des succès dans une petite fenêtre déplaçable. Les lieux des quêtes sont cliquables.
- **Compteurs de template** : nombre de pixels restants sur chaque couleur en mode Peindre.
- **Favoris** : une étoile dans la fiche d'un pixel, un onglet Favoris dans les épingles et des étoiles sur la carte.
- **Amis dans les guildes** : ajouter un membre en ami directement depuis la liste des membres.
- **Éditeur de templates** : un mini Krita dans bplace avec calques, crayon, gomme, remplissage, pipette, sélection, copier-coller et import d'images, uniquement avec les couleurs du jeu. S'ouvre depuis une capture, un template du site ou la section « Templates locaux ». Section Références pour calquer sur une ou plusieurs images. Interface réglable avec le crayon (ou Tab) : déplacer les barres et les panneaux Couleurs, Calques et Références, en ranger un dans un autre, changer leur taille.
- **Pinceaux** : dans l'éditeur, panneau Pinceaux pour créer ses pinceaux (forme dessinée au pixel, motif, densité, espacement, dispersion) et les partager en fichiers `.bplusbrush`. Import des pinceaux Krita (`.kpp`, `.gbr`) et d'images en forme de pinceau. Les pinceaux peuvent avoir une couleur de bordure, un mode de fusion (addition, produit, écran, couleur…), une opacité et de l'anticrénelage, toujours ramenés aux couleurs du jeu.
- **Dégradés** : outil Dégradé (D) et panneau Dégradés. « Principale → secondaire » et « Couleurs → transparent » prennent le nombre de couleurs du jeu que tu choisis ; « Modifier ces couleurs » crée un dégradé perso où tu ajoutes, remplaces ou retires chaque couleur (transparent compris). Bandes ou tramé, linéaire ou radial. Le transparent laisse ce qui est déjà dessiné.
- **Texte** : outil Texte (T) et panneau Texte avec des polices en pixels (3×5, 5×7) et les polices du système passées en pixels (Arial, Impact, Courier…), taille, espacement, gras, italique et contour dans la couleur secondaire. Le texte se déplace avant d'être validé.
- **Calques** : verrouiller l'alpha pour peindre seulement sur ce qui est déjà dessiné, et outil Sélection par couleur (Y).
- **Modes de fusion des calques** : addition, produit, écran, incrustation, obscurcir, éclaircir, couleur. Le dessin final est ramené aux couleurs du jeu.
- **Fichiers .bplus** : exporte un dessin de l'éditeur avec tous ses calques (Exporter → Fichier .bplus) et envoie-le à quelqu'un. Il l'ouvre avec « + Ajouter » dans Templates locaux, ou en le glissant sur bplace.
- **Templates locaux illimités** : dans le panneau Templates, range un template en local pour libérer une place, puis réactive-le sur la carte quand tu veux.
- **Passeport** : quand le succès « pays différents » est dans tes objectifs, les pays où il te reste à poser un pixel sont colorés sur la carte. bplace ne donne que le nombre de pays, alors l'extension retient les pays où tu peins et tu peux cocher ceux déjà faits dans la liste. Contours des pays : Natural Earth (domaine public).
- **Boutique** : un bouton MAX sur les améliorations à curseur règle la quantité au maximum de tes chromas (l'achat reste à cliquer).
- **Sons** : sons pour les outils de Bplace+ et sons du jeu en attendant les sons officiels, réglables dans Paramètres → Sons. Les fichiers sont dans le dossier `sounds/` (.wav) : remplace un fichier par le tien en gardant le même nom pour changer un son.
- 11 langues, l'extension suit la langue du compte.

Chaque outil peut être activé ou désactivé dans le menu du logo bplace → **Bplace+** → **Modules**.

## Installation

1. Télécharge le projet depuis https://github.com/feverhary/bplace-plus (bouton **Code → Download ZIP**, puis décompresse-le).
2. Ouvre `opera://extensions` (Opera GX) ou `chrome://extensions` (Chrome).
3. Active le **Mode développeur**.
4. Clique sur **Charger l'extension non empaquetée** et choisis le dossier `bplace-plus`.
5. Recharge bplace.art.

Quand une nouvelle version est sur GitHub, une fenêtre s'affiche sur bplace avec le lien de téléchargement.

Pour mettre à jour : remplace les fichiers du dossier, puis clique sur **Recharger** sur la carte de l'extension.

## Contact

- Serveur Discord : https://discord.gg/p8FEMyrYMS
- Discord : `harywayve`

Bplace+ est un projet de fan, il n'est pas affilié à bplace.art.
