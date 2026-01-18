# 📘 Guide Utilisateur SlideDeckMl
SlideDeckMl est un langage de modélisation dédié à la création de présentations dynamiques et interactives. Ce guide vous explique comment structurer vos fichiers pour transformer vos idées en slides professionnelles.

## 1. Structure Globale du Fichier
Tout document commence par le mot-clé presentation. Vous pouvez ensuite configurer l'identité visuelle et les éléments répétitifs comme le thème, l'en-tête et le pied de page.

```
presentation nom_de_la_presentation
```

### Theme
Définit la police (font), la couleur principale (primary) et le logo (logo).

```
theme font "Roboto" primary "#2c3e50" logo "https://lien-vers-mon-logo.png"
```

### Header / Footer
Contenu affiché en haut ou en bas de chaque slide (accepte n'importe quel type de box).

```
header bg "white" color "#2c3e50" size "20px" {
    box [alignment = "right"] {
        text [italic] {SlideDeckML Framework Demo}
    }
}

footer bg "#2c3e50" color "white" {
    box [column = 2] {
        text {L. Brunet - MLLS Project}
        text [alignment = "right"] {2024}
    }
}
```

## 2. Description d'une slide
La slide est l'unité fondamentale de votre présentation. Pour chaque nouvelle diapositive, on utilise le mot-clé slide suivi d'un identifiant unique qui vous permet de nommer et d'organiser votre diaporama.

À l'intérieur des accolades {}, vous êtes libre d'organiser votre espace. Vous avez deux manières principales d'insérer du contenu :

- Insérer une Box classique : C'est l'option idéale pour structurer votre slide. En créant une boîte, vous pouvez diviser votre écran en colonnes et gérer précisément la disposition de vos éléments.

Pour en savoir plus sur l'organisation des grilles, consultez la 
[Partie 3 : Système de Mise en Page : Les Boxes](#3-système-de-mise-en-page--les-boxes).

- Utiliser directement des Terminal Boxes : Si vous n'avez besoin que d'un seul élément sur votre slide (par exemple, une image en plein écran ou un titre centré), vous pouvez placer directement un bloc de contenu sans passer par une boîte intermédiaire.

Découvrez tous les éléments disponibles dans la Partie 5 : Blocs de Contenu.
[Partie 5 : Blocs de Contenu](#5-blocs-de-contenu-terminal-boxes).

### Option de configuration
Vous pouvez personnaliser le comportement de votre slide en ajoutant des attributs entre crochets [] :

- non-annotable : Cet attribut est propre aux slides. Par défaut, une barre d'outils interactive s'affiche sur chaque diapositive pour vous permettre de dessiner ou de surligner des éléments en direct. En activant non-annotable, vous verrouillez la diapositive : la barre d'outils est masquée et votre contenu est protégé contre toute modification accidentelle durant votre présentation.

```
// Exemple d'une slide protégée avec un contenu direct
slide MaSlideIntro [non-annotable] {
    text [bold, text-size = "xl"] {Bienvenue dans la présentation}
}
```

## 3. Système de Mise en Page : Les Boxes
Le concept fondamental de SlideDeckMl est la Box. Elle permet de transformer votre diapositive en une structure organisée sous forme de grid (grille). Le système répartit l'espace automatiquement en prenant en compte les espacements (gaps) pour éviter tout débordement.

Vous avez accès à plusieurs paramètres pour personnaliser cette grille :

- Colonnes : Précisez column = 3 pour diviser l'espace en 3 colonnes (si aucun paramètre, par default à 2). Le nombre de lignes est calculé automatiquement en fonction du nombre d'éléments que vous insérez.

- Dimensions : Vous pouvez définir la largeur (width) et la hauteur (height) en pourcentage pour que la boîte occupe une place précise sur la slide.

```
box [column = 2, width = 100%, height = 100%] {
    text {Ceci est à gauche}
    text {Ceci est à droite}
}
```

## 4. Composants et Slots (Réutilisation)
Les composants permettent de définir des structures réutilisables. Ils doivent être définis avant les slides. Les slots sont des zones réservées que vous remplirez lors de l'appel du composant.

Définition d'un composant :

```

component mon_composant {
    box [column = 2] {
        text {Titre fixe}
        slot @zone_variable {
            text {Texte par défaut si vide}
        }
    }
}
```

Appel du composant dans une slide :

```
slide ma_slide {
    mon_composant {
        @zone_variable image { src {./img.png} alt {Ma photo} }
    }
}
```

Il est aussi possible de surcharger les attributs de la box définie par le composant : 

```
slide ma_slide {
    mon_composant [width = 50%, height = 75%] {
        @zone_variable image { src {./img.png} alt {Ma photo} }
    }
}
```

## 5. Blocs de Contenu (Terminal Boxes)

Gérer les box est utile pour organiser les éléments, mais voyons maintenant quels sont les éléments que vous pouvez placer dans ces box, que ce soit dans des composants réutilisables ou directement dans les slides.

### Texte (text)
Cette première box permet d'afficher du contenu textuel stylisé.

Attributs de style possible en ne mettant juste le mot-clé pour l'activer : bold, italic, underline, strikethrough, highlight.

Autres attributs de style pour lesquels vous pouvez définir des valeurs préciser : color (exemple : red, blue, #000000, etc...), font (exemple : Arial, Roboto, etc...), text-size (xs, s, m, l, xl).

```
text [bold, color = "red", highlight] {Ceci est un texte important}
```

### Liste (list)
Ce bloc permet d'afficher des énumérations de manière structurée. Contrairement à une succession de blocs de texte, la list gère automatiquement l'alignement des puces et l'espacement entre vos points.

Type de liste : vous pouvez choisir le format via l'attribut type :

- unordered : affiche des puces classiques (par défaut).

- ordered : affiche une liste numérotée (1, 2, 3...).

Espacement : l'attribut spaceBetweenItems permet de définir précisément l'écart vertical (en pixels) entre chaque élément de la liste pour aérer votre contenu.

Contenu : chaque élément de la liste doit être entouré d'accolades {}.

```
list [type = ordered, spaceBetweenItems = 30] {
    {Premier point important}
    {Deuxième étape de la démonstration}
    {Conclusion de la liste}
}
```

### Multimédia (image & video)
Les boxes d'image et de vidéos fonctionnent globalement de la même manière, c'est juste le type de src qui différera (.png par exemple pour une image et .mp4 par exemple pour une vidéo)

Image : Requiert une source (src) et un texte alternatif (alt).

Video : Supporte les liens YouTube et les fichiers locaux.

> ⚠️ Attention pour les vidéos YouTube : Pour que les lecteurs YouTube s'affichent correctement, vous devez impérativement exposer votre site via un serveur local (ex: http://localhost:3000). Si vous tentez d'ouvrir directement le fichier HTML dans votre navigateur (protocole file://), les vidéos risquent de ne pas charger en raison des restrictions de sécurité de YouTube (Erreur 150/153).

Attribut : scale permet de définir la taille (ex: scale = 50%).

```
image [scale = 30%] { 
    src {https://lien.jpg} 
    alt {Description} 
}

video [scale = 100%] { 
    src {https://youtu.be/ID} 
    alt {Titre}
}
```

### Mathématiques (mathematics)
Ce bloc permet d'intégrer des équations scientifiques complexes avec un rendu professionnel. Pour assurer une cohérence visuelle parfaite, il hérite des mêmes attributs de style que le texte standard (couleur, taille, etc.).

Syntaxe : les formules doivent être rédigées en utilisant la syntaxe LaTeX entre les balises dédiées "$$" car on ne peut utiliser notre syntaxe classique avec des "{}" car KaTeX les utilisent dans ses expressions mathématiques.

Rendu : le système utilise la bibliothèque KaTeX pour transformer vos expressions en formules propres et parfaitement alignées.

```
mathematics [text-size = "xl", color = "#2980b9"]
$$ 
\zeta(s) = \sum_{n=1}^{\infty} \frac{1}{n^s} = \prod_{p \in \text{primes}} \frac{1}{1 - p^{-s}} 
$$
```

### Code (code)
Affiche des blocs de code avec coloration syntaxique pour vos démonstrations techniques.

Configuration : vous devez préciser le langage entre guillemets (ex: "java", "javascript") suivi du code entouré de triples accents graves (```).

Annotations de lignes : l'attribut line permet d'associer des images à des lignes spécifiques (ex: line { 3..4 ... }) pour afficher des explications visuelles lorsque ces lignes sont mises en avant durant la présentation.

```
code [text-size = "14px"] {
    "java"
    ```
    public class Main {
        public static void main(String[] args) {
            System.out.println("Hello SlideDeckML");
        }
    }
    ```
    line { 3..4 image [scale = 50%] { src {[https://logo.png](https://logo.png)} alt {Explication} } }
}
```

### Quiz & LiveQuiz
Ces blocs transforment votre présentation en un outil interactif pour sonder votre audience.

Quiz (Local) : idéal pour un questionnaire classique. Vous définissez le type (mcq pour un QCM ou short pour une réponse libre), les option disponibles et la correctAnswer. Utilisez l'attribut revealResultsOnDemand pour cacher la solution jusqu'à ce que vous décidiez de la montrer.

LiveQuiz (Interactif) : permet un vote en temps réel via smartphone. Ce mode nécessite un sessionId unique et le lancement préalable du serveur poll-server (via npm run dev). Un QR Code sera automatiquement généré sur la slide pour les participants.

Plaintext

quiz [fragment = fade-up] q1 {
    {Quel terminal définit une expression LaTeX dans notre BNF ?}
    mcq
    option a {TEXT}
    option b {STRING}
    option c {MATH_EXPR}
    {c}
    revealResultsOnDemand
}

livequiz lq1 {
    {Êtes-vous convaincus par le DSL ?}
    option yes {Oui}
    option no {Absolument}
    {yes}
    {session_mlls_2026}
}

## 6. Attributs et Comportements Communs
Tous les blocs terminaux peuvent aussi recevoir des réglages de positionnement, de taille et d'animation pour dynamiser vos slides.

- alignment : positionne l'élément à l'intérieur de son conteneur (box) ou directement sur la slide. Vous pouvez utiliser des combinaisons comme "top left", "center", "bottom right", etc.

- width : définit la largeur de l'élément en pourcentage par rapport à la largeur de sa colonne ou de son conteneur (ex: width = 50%).

- height : définit la hauteur de l'élément en pourcentage par rapport à la hauteur de sa ligne ou de son conteneur (ex: height = 20%).

- fragment : définit une animation d'apparition pour l'élément lors de la présentation. Les styles disponibles incluent fade-in, grow, shrink, fade-up, fade-down, etc.

### Exemple de mise en pratique
Dans cet exemple, le titre occupe une hauteur précise en haut de la slide, tandis que l'image est réduite et alignée spécifiquement dans sa zone.

```
slide MaSlideStylisee {
    // Titre occupant 20% de la hauteur, centré et gras
    text [height = 20%, alignment = "center", bold, text-size = "xl"] {
        Analyse des résultats
    }

    box [column = 2] {
        // Image réduite à 80% de sa colonne avec une animation d'entrée
        image [width = 80%, fragment = fade-in] {
            src {https://mon-image.png}
            alt {Graphique de ventes}
        }

        // Texte aligné en bas à droite de sa cellule
        text [alignment = "bottom right", italic, color = "gray"] {
            Source : Rapport annuel 2026
        }
    }
}
```