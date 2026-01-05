import { type ComponentBoxReference, type Box, type Model, type Slide, type TextBox, type QuizBox, type ListBox, ComponentBox, ComponentSlot, ComponentSlotReference, Component } from 'slide-deck-ml-language';

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

                .sdml-quiz { border: 1px solid rgba(0,0,0,0.25); border-radius: 10px; padding: 14px; margin: 12px 0; }
                .sdml-quiz__title { font-size: 14px; letter-spacing: 0.02em; text-transform: uppercase; opacity: 0.85; margin-bottom: 6px; }
                .sdml-quiz__question { font-size: 22px; margin: 8px 0 12px; }
                .sdml-quiz__options { display: grid; gap: 8px; margin: 10px 0; }
                .sdml-quiz__options label { display: flex; gap: 10px; align-items: center; cursor: pointer; }
                .sdml-quiz__actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
                .sdml-quiz__input { border: 1px solid rgba(0,0,0,0.25); border-radius: 10px; padding: 10px 12px; font-size: 18px; min-width: 240px; }
                .sdml-quiz__btn { border: 0; border-radius: 10px; padding: 10px 12px; cursor: pointer; background: rgba(25,113,194,0.9); color: white; font-size: 14px; }
                .sdml-quiz__feedback { min-height: 1.2em; margin-top: 10px; font-weight: 600; }
                .sdml-quiz__results { margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.25); }
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
    switch(box.content.$type) {
        case 'TextBox': return generateTextBox(box.content);
        case 'ComponentBoxReference': return generateComponentBoxReference(box.content);
        case 'QuizBox': return generateQuizBox(box.content);
        case 'ListBox': return generateListBox(box.content);

        case 'ContentBox':
            return expandToNode`
                <div>
                    ${joinToNode(box.content.boxes.map(b => generateBox(b).appendNewLineIfNotEmpty()))}
                </div>
            `;
    }
}


function generateComponentBoxReference(reference: ComponentBoxReference): CompositeGeneratorNode {
    const declaration: Component = componentsSymbolTable.get(reference.reference.ref!.name)!; // Did not use reference.reference.ref! because it preserves the first declaration of a component (and not the last)
    let slots: Record<string, CompositeGeneratorNode> = {};
    for (let slot of reference.slots) {
        slots[slot.name] = generateBox(slot.content);
    }
    return generateComponentBox(declaration.content, slots);
}

function generateComponentBox(box: ComponentBox, slots: Record<string, CompositeGeneratorNode>): CompositeGeneratorNode {
    switch(box.content.$type) {
        case 'TextBox': return generateTextBox(box.content);
        case 'ComponentBoxReference': return generateComponentBoxReference(box.content);
        case 'QuizBox': return generateQuizBox(box.content);
        case 'ListBox': return generateListBox(box.content);

        case 'ComponentSlot': return generateComponentSlot(box.content, slots);
        case 'ComponentContentBox':
            return expandToNode`
                <div>
                    ${joinToNode(box.content.boxes.map(box => generateComponentBox(box, slots).appendNewLineIfNotEmpty()))}
                </div>
            `;
    }
}

function generateComponentSlot(slot: ComponentSlot, slots: Record<string, CompositeGeneratorNode>): CompositeGeneratorNode {
    return slots[slot.name] || expandToNode``;
}


function generateTextBox(textBox: TextBox): CompositeGeneratorNode {
    return expandToNode`<p>${textBox.content.slice(1, -1).trim()}</p>`;
}

function textContent(text: string): string {
    return text.slice(1, -1).trim();
}

function generateQuizBox(quiz: QuizBox): CompositeGeneratorNode {
    const question = textContent(quiz.question);
    const correctAnswer = quiz.correctAnswer ? textContent(quiz.correctAnswer) : '';
    const options = quiz.options.map(opt => ({ id: opt.id, label: textContent(opt.content) }));

    return expandToNode`
        <div
            class="sdml-quiz"
            data-quiz-id="${quiz.id}"
            data-quiz-type="${quiz.type}"
            data-correct-answer="${correctAnswer}"
            data-reveal-on-demand="${quiz.revealResultsOnDemand ? 'true' : 'false'}"
        >
            <div class="sdml-quiz__title">Quiz</div>
            <div class="sdml-quiz__question">${question}</div>

            ${quiz.type === 'short'
                ? expandToNode`
                    <div class="sdml-quiz__actions">
                        <input class="sdml-quiz__input" type="text" placeholder="Your answer" />
                        <button
                            class="sdml-quiz__btn sdml-quiz__submit"
                            type="button"
                                    onclick="(function(btn){const r=btn.closest('.sdml-quiz');if(!r)return;const c=(r.getAttribute('data-correct-answer')||'').trim();const f=r.querySelector('.sdml-quiz__feedback');if(!f)return;const i=r.querySelector('input.sdml-quiz__input');if(!i)return;const v=(i.value||'').trim();if(!v)return;const ok=v.toLowerCase()===c.toLowerCase();f.textContent=ok?'Correct.':'Not quite.';f.style.color=ok?'#2aa198':'#dc322f';if(!ok){const res=r.querySelector('.sdml-quiz__results');if(res){res.style.display='block';}const rb=r.querySelector('.sdml-quiz__reveal');if(rb)rb.style.display='none';} })(this)"
                        >Submit</button>
                    </div>
                `
                : expandToNode`
                    <div class="sdml-quiz__options">
                        ${joinToNode(options.map(opt => expandToNode`
                            <label>
                                <input type="radio" name="quiz-${quiz.id}" value="${opt.id}" />
                                <span>${opt.label}</span>
                            </label>
                        `))}
                    </div>
                    <div class="sdml-quiz__actions">
                        <button
                            class="sdml-quiz__btn sdml-quiz__submit"
                            type="button"
                                    onclick="(function(btn){const r=btn.closest('.sdml-quiz');if(!r)return;const c=(r.getAttribute('data-correct-answer')||'').trim();const f=r.querySelector('.sdml-quiz__feedback');if(!f)return;const ch=r.querySelector('input[type=radio]:checked');if(!ch)return;const v=(ch.value||'').trim();const ok=v.toLowerCase()===c.toLowerCase();f.textContent=ok?'Correct.':'Not quite.';f.style.color=ok?'#2aa198':'#dc322f';if(!ok){const res=r.querySelector('.sdml-quiz__results');if(res){res.style.display='block';}const rb=r.querySelector('.sdml-quiz__reveal');if(rb)rb.style.display='none';} })(this)"
                        >Submit</button>
                    </div>
                `
            }

                    <div class="sdml-quiz__feedback" aria-live="polite"></div>
                    ${quiz.revealResultsOnDemand
                        ? expandToNode`
                            <div class="sdml-quiz__reveal-wrap">
                                <button class="sdml-quiz__btn sdml-quiz__reveal" type="button" onclick="(function(btn){const r=btn.closest('.sdml-quiz');if(!r)return;const res=r.querySelector('.sdml-quiz__results');if(res){res.style.display='block';}btn.style.display='none';})(this)">Reveal answer</button>
                                <div class="sdml-quiz__results" style="display:none">Correct answer: <strong>${correctAnswer}</strong></div>
                            </div>
                        `
                        : expandToNode`<div class="sdml-quiz__results">Correct answer: <strong>${correctAnswer || '—'}</strong></div>`
                    }
        </div>
    `;
}

type AstAttribute = { key: string; value?: unknown };

function getAttributeValue(attributes: unknown, key: string): unknown {
    if (!Array.isArray(attributes)) return undefined;
    const attr = (attributes as AstAttribute[]).find(a => a?.key === key);
    return attr?.value;
}

function generateListBox(listBox: ListBox): CompositeGeneratorNode {
    const attributes = (listBox as unknown as { attributes?: unknown }).attributes;
    const type = String(getAttributeValue(attributes, 'type') ?? 'unordered');
    const spacing = Number(getAttributeValue(attributes, 'spaceBetweenItems') ?? 0);
    const listTag = type === 'ordered' ? 'ol' : 'ul';
    const items = listBox.items.map(textContent);

    return expandToNode`
        <${listTag} class="sdml-list" style="--sdml-list-gap: ${spacing}px">
            ${joinToNode(items.map((item: string) => expandToNode`<li>${item}</li>`))}
        </${listTag}>
    `;
}