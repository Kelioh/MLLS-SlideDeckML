import { type ComponentBoxReference, type Box, type Model, type Slide, type TextBox, ComponentBox, ComponentSlot, ComponentSlotReference } from 'slide-deck-ml-language';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CompositeGeneratorNode, expandToNode, toString } from 'langium/generate';
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


function generateModel(model: Model): CompositeGeneratorNode {
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
                    ${model.slides.map((slide: Slide) =>  generateSlide(slide)).join('')}
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

function generateSlide(slide: Slide): string {
    return `
        <section id="${slide.id}" data-transition="fade">
            ${generateBox(slide.content)}
        </section>
    `;
}

function generateBox(box: Box): string {
    switch(box.content.$type) {
        case 'TextBox': return generateTextBox(box.content);
        case 'ComponentBoxReference': return generateComponentBoxReference(box.content);

        case 'ContentBox':
            return `
                <div>
                    ${box.content.boxes.map(b => generateBox(b)).join('\n')}
                </div>
            `;
    }
}

function generateTextBox(textBox: TextBox): string {
    return `<p>${textBox.content.slice(1, -1).trim()}</p>`;
}

function generateComponentBoxReference(reference: ComponentBoxReference): string {
    const declaration = reference.reference.ref!; // TODO: check if the ref is valid
    let slots: Record<string, string> = {};
    for (let slot of reference.slots) {
        slots[slot.name] = generateBox(slot.content);
    }
    return generateComponentBox(declaration.content, slots);
}

function generateComponentBox(box: ComponentBox, slots: Record<string, string>): string {
    switch(box.content.$type) {
        case 'TextBox': return generateTextBox(box.content);
        case 'ComponentBoxReference': return generateComponentBoxReference(box.content);

        case 'ComponentSlot': return generateComponentSlot(box.content, slots);
        case 'ComponentContentBox':
            return `
                <div>
                    ${box.content.boxes.map(box => generateComponentBox(box, slots)).join('\n')}
                </div>
            `;
    }
}

function generateComponentSlot(slot: ComponentSlot, slots: Record<string, string>): string {
    return slots[slot.name] || '';
}