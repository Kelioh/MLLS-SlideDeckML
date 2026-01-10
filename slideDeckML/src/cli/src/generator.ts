import { type ComponentBoxReference, type Box, type Model, type Slide, type TextBox, ComponentBox, ComponentSlot, ComponentSlotReference, Component, Attribute } from 'slide-deck-ml-language';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CompositeGeneratorNode, expandToNode, joinToNode, toString } from 'langium/generate';
import { extractDestinationAndName } from './util.js';


/* Generate file */

export function generateOutput(model: Model, filePath: string, destination: string): string {
    const data = extractDestinationAndName(destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.html`;

    const fileNode = generateModel(model).appendNewLineIfNotEmpty();

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    fs.writeFileSync(generatedFilePath, toString(fileNode));

    return generatedFilePath;
}


/* Nodes generation */

let componentsSymbolTable: Map<string, Component>;

function generateModel(model: Model): CompositeGeneratorNode {
    componentsSymbolTable = new Map(model.components.map(component => [component.name, component]));
    return expandToNode`
        <!doctype html>
        <html>
        <head>
            <title>${model.name}</title>

            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/solarized.css">

            <style>
                /* CSS minimal juste pour visualiser les blocs */
                body { font-family: sans-serif; padding: 20px; }
                .slide { border: 2px solid black; margin-bottom: 20px; padding: 10px; border-radius: 5px; }
                h1, h2 { color: #333; }
                pre { background: #eee; padding: 5px; }
            </style>
        </head>
        <body>
            <h1>${model.name}</h1>
            <hr/>
            
            <div class="reveal">
                <div class="slides">
                    ${joinToNode(model.slides.map((slide: Slide) =>  generateSlide(slide).appendNewLineIfNotEmpty()))}
                </div>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
            <script>
                Reveal.initialize({
                    hash: true,
                    slideNumber: true,
                    transition: 'slide', // default transition
                    width: "100%",
                    height: "100%",
                    margin: 0.1,
                    backgroundTransition: 'fade',
                    center: true
                });
            </script>
        </body>
        </html>
    `;
}


function generateSlide(slide: Slide): CompositeGeneratorNode {
    return expandToNode`
        <section id="${slide.id}" data-transition="fade">
            ${generateBox(slide.content)}
        </section>
    `;
}


function generateBox(box: Box): CompositeGeneratorNode {
    switch(box.$type) {
        case 'TextBox': return generateTextBox(box);
        case 'ComponentBoxReference': return generateComponentBoxReference(box);

        case 'ContentBox': // TODO: generate with attributes consideration
            return expandToNode`
                <div>
                    ${joinToNode(box.boxes.map(b => generateBox(b).appendNewLineIfNotEmpty()))}
                </div>
            `;
    }
}


function generateComponentBoxReference(reference: ComponentBoxReference): CompositeGeneratorNode {
    const declaration: Component = componentsSymbolTable.get(reference.reference.ref!.name)!; // Did not use reference.reference.ref! because it preserves the first declaration of a component (and not the last)

    /* Generate slots boxes */
    const slots: Record<string, CompositeGeneratorNode> = {};
    for (let slot of reference.slots) {
        slots[slot.name] = generateBox(slot.content);
    }

    /* Override declaration attributes  */
    let declarationBox: ComponentBox = declaration.content;
    if (declaration.content.$type !== 'ComponentSlot') {
        const mergedAttributes: Map<string, string> = new Map(declaration.content.attributes.map(attribute => [attribute.key, attribute.value]));
        for (const attribute of reference.attributes) {
            mergedAttributes.set(attribute.key, attribute.value);
        }
        declarationBox = { ...declaration.content, attributes: Array.from(mergedAttributes.entries(), ([key, value]) => ({ $type: 'Attribute', key, value } as Attribute)) }; // Does not include $container, $containerProperty, $containerIndex, $cstNode, $document
    }

    return generateComponentBox(declarationBox, slots);
}

function generateComponentBox(box: ComponentBox, slots: Record<string, CompositeGeneratorNode>): CompositeGeneratorNode {
    switch(box.$type) {
        case 'TextBox': return generateTextBox(box);
        case 'ComponentBoxReference': return generateComponentBoxReference(box);

        case 'ComponentSlot': return generateComponentSlot(box, slots);
        case 'ComponentContentBox': // TODO: generate with attributes consideration
            return expandToNode`
                <div>
                    ${joinToNode(box.boxes.map(box => generateComponentBox(box, slots).appendNewLineIfNotEmpty()))}
                </div>
            `;
    }
}

function generateComponentSlot(slot: ComponentSlot, slots: Record<string, CompositeGeneratorNode>): CompositeGeneratorNode {
    return slots[slot.name] || expandToNode``;
}


function generateTextBox(textBox: TextBox): CompositeGeneratorNode {
    return expandToNode`<p>${textBox.content.slice(1, -1).trim()}</p>`; // TODO: generate with attributes consideration
}