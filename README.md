Génération d’une présentation
Prérequis

Node.js (version recommandée ≥ 18)

npm installé

1 Installation des dépendances

Depuis la racine du projet :

npm install

2️ Génération du code Langium

Cette étape génère automatiquement le parser et les services du DSL :

npm run langium:generate

3  Compilation du projet
npm run build

4  Générer une présentation HTML

Pour transformer un fichier .sd en présentation web :

node src/cli/bin/cli.js generate <input.sd> <output-folder>

Exemple :
node src/cli/bin/cli.js generate src/example/scenario2.sd generated/scenario2


Cette commande produira un fichier HTML ainsi que les ressources nécessaires dans le dossier :

generated/scenario2/

Tester avec d’autres exemples

Un autre fichier exemple peut être généré avec :

node src/cli/bin/cli.js generate src/example/slides-demo.sd generated/demo

Workflow complet

Pour partir d’un projet fraîchement cloné et générer une présentation en une seule séquence :

npm install
npm run langium:generate
npm run build
node src/cli/bin/cli.js generate src/example/scenario2.sd generated/scenario2