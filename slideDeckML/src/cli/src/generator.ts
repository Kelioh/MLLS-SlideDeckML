import type { Model, Slide } from 'slide-deck-ml-language';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractDestinationAndName } from './util.js';
import { isTitleSlide } from 'slide-deck-ml-language';

import {
    CompositeGeneratorNode,
    expandToNode,
    toString
} from 'langium/generate';

export function generateOutput(model: Model, filePath: string, destination: string): string {
    const data = extractDestinationAndName(destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.html`;

    const fileNode = expandToNode`
        <!doctype html>
        <html>
        <head>
            <title>${model.name}</title>
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
            
            ${model.slides.map(slide => generateSlide(slide))}
            
        </body>
        </html>
    `.appendNewLineIfNotEmpty();

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    fs.writeFileSync(generatedFilePath, toString(fileNode));

    return generatedFilePath;
}

function generateSlide(slide: Slide): CompositeGeneratorNode {
    if (isTitleSlide(slide)) {
        return expandToNode`
            <div class="slide">
                <h2>[Title Slide] ${slide.title}</h2>
                ${slide.subtitle ? `<p><i>${slide.subtitle}</i></p>` : ''}
            </div>
        `;
    }
    return expandToNode``;
}