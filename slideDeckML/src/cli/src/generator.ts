import { type ComponentBoxReference, type Box, type Model, type Slide, type TextBox, type QuizBox, type ListBox, ComponentBox, ComponentSlot, ComponentSlotReference, Component } from 'slide-deck-ml-language';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractDestinationAndName } from './util.js';

import {
    CompositeGeneratorNode,
    expandToNode,
    joinToNode,
    toString
} from 'langium/generate';


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
                .reveal .slides section {
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: column;
                    justify-content: center;
                }

                .canvas-container {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 10;
                }

                .canvas-container.active {
                    pointer-events: all;
                }

                /* Different cursors for each tools */
                .tool-pen,
                .tool-highlighter {
                    cursor: crosshair;
                }

                .tool-eraser {
                    cursor: cell;
                }

                .tool-text {
                    cursor: copy;
                }

                /* Text annotation */
                .floating-text {
                    position: absolute;
                    min-width: 50px;
                    z-index: 15;
                    color: #000;
                    font-weight: bold;
                    font-size: 30px;
                    border: 1px dashed transparent;
                    cursor: move;
                }

                .floating-text:focus {
                    border-color: #000;
                    outline: none;
                    background: rgba(255, 255, 255, 0.8);
                    cursor: text;
                }

                /* Style of the toolbar */
                #toolbar {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    z-index: 100;
                    background: rgba(255, 255, 255, 0.9);
                    padding: 12px;
                    border-radius: 8px;
                    display: flex;
                    gap: 10px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    font-family: sans-serif;
                }

                button {
                    cursor: pointer;
                    padding: 8px 15px;
                    border: 1px solid #ccc;
                    background: white;
                    border-radius: 5px;
                    font-size: 14px;
                }

                button.active {
                    background: #ffeb3b;
                    font-weight: bold;
                    border-color: #fbc02d;
                }

                .save-btn {
                    background: #4caf50;
                    color: white;
                }

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
            <div id="toolbar">
                <button id="btn-pen" onclick="setTool('pen')">✏️ Stylo (D)</button>
                <button id="btn-highlighter" onclick="setTool('highlighter')">🖍️ Surligneur (H)</button>
                <button id="btn-text" onclick="setTool('text')">🔤 Texte (T)</button>
                <button id="btn-eraser" onclick="setTool('eraser')">🧽 Gomme (E)</button>
                <button onclick="clearCurrentSlide()">🗑️ Effacer (C)</button>
                <button class="save-btn" onclick="exportAnnotatedHTML()">💾 Sauvegarder (S)</button>
            </div>
            
            <div class="reveal">
                <div class="slides">
                    ${joinToNode(model.slides.map((slide: Slide) => generateSlide(slide).appendNewLineIfNotEmpty()))}
                </div>
            </div>
            
            <script id="annotation-storage">window.savedPaths = {};</script>

            <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
            <script>
                Reveal.initialize({ width: "100%", height: "100%", margin: 0, center: false, hash: true });

                let currentTool = null;
                let isDrawing = false;
                const allCanvases = {};

                document.querySelectorAll('.slides section.annotable').forEach(section => {
                    const canvas = document.createElement('canvas');
                    canvas.className = 'canvas-container';
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    section.appendChild(canvas);

                    const id = section.id || 'slide-' + Math.random().toString(36).substr(2, 5);
                    section.id = id;
                    allCanvases[id] = canvas;
                    setupEvents(canvas, section);

                    section.querySelectorAll('.floating-text').forEach(txt => makeDraggable(txt, section));
                });

                function updateToolbarVisibility(currentSlide) {
                    const toolbar = document.getElementById('toolbar');
                    if (currentSlide.classList.contains('annotable')) {
                        toolbar.style.display = 'flex';
                    } else {
                        toolbar.style.display = 'none';
                        setTool(null);
                    }
                }

                function setTool(tool) {
                    currentTool = (currentTool === tool) ? null : tool;
                    document.querySelectorAll('#toolbar button').forEach(btn => btn.classList.remove('active'));
                    if (currentTool) document.getElementById(\`btn-\${ currentTool }\`).classList.add('active');

                    document.querySelectorAll('.canvas-container').forEach(c => {
                        c.className = \`canvas-container \${ currentTool ? 'active tool-' + currentTool : '' } \`;
                    });
                }

                function setupEvents(canvas, section) {
                    const ctx = canvas.getContext('2d');
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    if (window.savedPaths[section.id]) {
                        const img = new Image();
                        img.onload = () => ctx.drawImage(img, 0, 0);
                        img.src = window.savedPaths[section.id];
                    }

                    canvas.onmousedown = (e) => {
                        if (!currentTool) return;
                        if (currentTool === 'text') { createTextElement(section, e); return; }

                        isDrawing = true;
                        const rect = canvas.getBoundingClientRect();
                        ctx.beginPath();
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);

                        ctx.globalCompositeOperation = 'source-over';
                        ctx.globalAlpha = 1.0;
                        ctx.lineWidth = 50;

                        if (currentTool === 'eraser') {
                            ctx.globalCompositeOperation = 'destination-out';
                        } else if (currentTool === 'highlighter') {
                            ctx.strokeStyle = '#ffff00';
                            ctx.globalAlpha = 0.015;
                        } else {
                            ctx.strokeStyle = '#ff0000';
                            ctx.lineWidth = 4;
                        }
                    };

                    canvas.onmousemove = (e) => {
                        if (!isDrawing) return;
                        const rect = canvas.getBoundingClientRect();
                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                        ctx.stroke();
                    };
                    window.addEventListener('mouseup', () => isDrawing = false);
                }

                function createTextElement(section, e) {
                    const txt = document.createElement('div');
                    txt.className = 'floating-text';
                    txt.contentEditable = true;
                    const rect = section.getBoundingClientRect();
                    txt.style.left = (e.clientX - rect.left) + "px";
                    txt.style.top = (e.clientY - rect.top) + "px";

                    makeDraggable(txt, section);
                    section.appendChild(txt);
                    setTimeout(() => txt.focus(), 10);
                }

                function makeDraggable(txt, section) {
                    txt.onmousedown = (e) => {
                        if (document.activeElement === txt) return;
                        e.preventDefault();
                        const onMove = (ev) => {
                            const sRect = section.getBoundingClientRect();
                            txt.style.left = (ev.clientX - sRect.left - 20) + "px";
                            txt.style.top = (ev.clientY - sRect.top - 10) + "px";
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onMove), { once: true });
                    };
                }

                function clearCurrentSlide() {
                    const canvas = Reveal.getCurrentSlide().querySelector('canvas');
                    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                    Reveal.getCurrentSlide().querySelectorAll('.floating-text').forEach(t => t.remove());
                }

                function exportAnnotatedHTML() {
                    const canvasData = {};
                    for (const id in allCanvases) {
                        const url = allCanvases[id].toDataURL();
                        if (url.length > 1000) canvasData[id] = url;
                    }

                    const clone = document.documentElement.cloneNode(true);

                    clone.querySelector('#toolbar')?.remove();

                    clone.querySelectorAll('.canvas-container').forEach(c => c.remove());

                    clone.querySelector('#annotation-storage').innerText = \`window.savedPaths = \${ JSON.stringify(canvasData) }; \`;

                    const blob = new Blob(["<!DOCTYPE html>", String.fromCharCode(10), clone.outerHTML], { type: 'text/html' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = "presentation_finale.html";
                    a.click();
                }

                function exportAnnotatedHTML() {
                    const data = {};
                    for (const id in allCanvases) {
                        const url = allCanvases[id].toDataURL();
                        if (url.length > 1000) data[id] = url;
                    }
                    const clone = document.documentElement.cloneNode(true);
                    clone.querySelector('#toolbar')?.remove();
                    clone.querySelectorAll('.canvas-container').forEach(c => c.remove());
                    clone.querySelector('#annotation-storage').innerText = \`window.savedPaths = \${ JSON.stringify(data) }; \`;

                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob(["<!DOCTYPE html>\\\n" + clone.outerHTML], { type: 'text/html' }));
                    a.download = "presentation.html";
                    a.click();
                }

                document.addEventListener('keydown', (e) => {
                    const key = e.key.toLowerCase();
                    if (key === 'escape') {
                        if (document.activeElement) document.activeElement.blur();
                        setTool(null);
                        return;
                    }
                    if (document.activeElement.contentEditable === "true") return;
                    if (key === 'd') setTool('pen');
                    if (key === 'h') setTool('highlighter');
                    if (key === 't') setTool('text');
                    if (key === 'e') setTool('eraser');
                    if (key === 'c') clearCurrentSlide();
                    if (key === 's') exportAnnotatedHTML();
                });

                Reveal.on('ready', event => {
                    updateToolbarVisibility(event.currentSlide);
                });

                Reveal.on('slidechanged', event => {
                    updateToolbarVisibility(event.currentSlide);
                });
            </script>
        </body>
        </html>
    `;
}


function generateSlide(slide: Slide): CompositeGeneratorNode {
    // TODO : need to check for attribute annotable, not all slides are annotable
    return expandToNode`
        <section id="${slide.id}" class="annotable" data-transition="fade">
            ${generateBox(slide.content)}
        </section>
    `;
}


function generateBox(box: Box): CompositeGeneratorNode {
    switch (box.content.$type) {
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
    switch (box.content.$type) {
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