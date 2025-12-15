import type { Box, Model, Slide, TextBox } from 'slide-deck-ml-language';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expandToNode, toString } from 'langium/generate';
import { extractDestinationAndName } from './util.js';

export function generateOutput(model: Model, filePath: string, destination: string): string {
    const data = extractDestinationAndName(destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.html`;

    const fileNode = expandToNode`
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
            <h1>Debug: ${model.name}</h1>
            <hr/>
            
            <div class="reveal">
                <div class="slides">
                    ${model.slides.map(slide => generateSlide(slide))}
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
    `.appendNewLineIfNotEmpty();

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    fs.writeFileSync(generatedFilePath, toString(fileNode));

    return generatedFilePath;
}

function generateTextBox(textBox: TextBox): string {
    return `<p>${textBox.text}</p>`;
}

function generateBox(box: Box): string {
    const content = box.content;

    if (content.$type === 'TextBox') {
        return generateTextBox(content);
    }

    if (content.$type === 'ContentBox') {
        const boxes = content.boxes.map(b => generateBox(b)).join('\n');
        return `
            <div>
                ${boxes}
            </div>
        `;
    }

    return '';
}

function generateSlide(slide: Slide): string {
    const header = slide.header ? generateBox(slide.header.box) : '';
    const body = generateBox(slide.body.box);
    const footer = slide.footer ? generateBox(slide.footer.box) : '';

    return `
        <section id="${slide.id}" data-transition="fade">
            ${header}
            ${body}
            ${footer}
        </section>
    `;
}
