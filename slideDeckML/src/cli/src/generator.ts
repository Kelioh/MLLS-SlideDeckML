import { type ComponentBoxReference, type Box, type Model, type Slide, type TextBox, type QuizBox, ComponentBox, ComponentSlot, Component } from 'slide-deck-ml-language';

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

    // Extract theme properties (Langium automatically strips quotes from STRING terminals)
    const fontFamily = model.theme?.fontName || 'sans-serif';
    const primaryColor = model.theme?.primaryColor || '#1971c2';
    const logoUrl = model.theme?.logo || '';

    return expandToNode`
        <!doctype html>
        <html>
        <head>
            <title>${model.name}</title>

            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/solarized.css">

            <style>
                /* Reset body margins/padding */
                body {
                    margin: 0;
                    padding: 0;
                    font-family: ${fontFamily};
                    overflow: hidden;
                }

                /* Reveal.js viewport adjustment for header/footer */
                .reveal {
                    top: 80px !important;
                    height: calc(100% - 160px) !important;
                }

                /* Header & Footer Styling */
                .slide-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 1.5rem;
                    opacity: 0.8;
                    border-bottom: 2px solid rgba(0,0,0,0.2);
                    padding: 1.5rem 2rem;
                    background: rgba(255,255,255,0.95);
                    z-index: 1000;
                    height: 80px;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .slide-footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 1.2rem;
                    opacity: 0.7;
                    border-top: 2px solid rgba(0,0,0,0.2);
                    padding: 1.2rem 2rem;
                    background: rgba(255,255,255,0.95);
                    z-index: 1000;
                    height: 80px;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .slide-header p,
                .slide-footer p {
                    margin: 0;
                    padding: 0;
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
            <div id="global-header" class="slide-header"></div>

            <div class="reveal">
                <div class="slides">
                    ${joinToNode(model.slides.map((slide: Slide) =>  generateSlide(slide, model).appendNewLineIfNotEmpty()))}
                </div>
            </div>

            <div id="global-footer" class="slide-footer"></div>

            <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
            <script>
                Reveal.initialize({
                    hash: true,
                    slideNumber: true,
                    transition: 'slide',
                    width: "100%",
                    height: "100%",
                    margin: 0.1,
                    backgroundTransition: 'fade',
                    center: true
                });

                // Update header/footer when slide changes
                Reveal.on('slidechanged', event => {
                    const currentSlide = event.currentSlide;
                    const headerDiv = document.getElementById('global-header');
                    const footerDiv = document.getElementById('global-footer');

                    const headerContent = currentSlide.getAttribute('data-header');
                    const footerContent = currentSlide.getAttribute('data-footer');
                    const headerStyles = currentSlide.getAttribute('data-header-styles');
                    const footerStyles = currentSlide.getAttribute('data-footer-styles');

                    if (headerContent) {
                        headerDiv.innerHTML = headerContent;
                        headerDiv.style.display = 'block';
                        if (headerStyles) {
                            headerDiv.style.cssText += '; ' + headerStyles;
                        }
                    } else {
                        headerDiv.style.display = 'none';
                    }

                    if (footerContent) {
                        footerDiv.innerHTML = footerContent;
                        footerDiv.style.display = 'block';
                        if (footerStyles) {
                            footerDiv.style.cssText += '; ' + footerStyles;
                        }
                    } else {
                        footerDiv.style.display = 'none';
                    }
                });

                // Trigger initial update
                Reveal.on('ready', event => {
                    Reveal.dispatchEvent({ type: 'slidechanged', currentSlide: event.currentSlide });
                });
            </script>
        </body>
        </html>
    `;
}


function generateSlide(slide: Slide, model: Model): CompositeGeneratorNode {
    // Fallback logic: slide header/footer overrides global ones
    const header = slide.header || model.header;
    const footer = slide.footer || model.footer;

    // Generate HTML strings for header/footer to store in data attributes
    const headerHTML = header ? toString(generateBox(header.content)) : '';
    const footerHTML = footer ? toString(generateBox(footer.content)) : '';

    // Extract style attributes for header/footer
    const headerStyles = header ? generateHeaderFooterStyles(header) : '';
    const footerStyles = footer ? generateHeaderFooterStyles(footer) : '';

    // Escape quotes for HTML attributes
    const escapeQuotes = (str: string) => str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    return expandToNode`
        <section
            id="${slide.id}"
            data-transition="fade"
            ${headerHTML ? `data-header="${escapeQuotes(headerHTML)}"` : ''}
            ${footerHTML ? `data-footer="${escapeQuotes(footerHTML)}"` : ''}
            ${headerStyles ? `data-header-styles="${escapeQuotes(headerStyles)}"` : ''}
            ${footerStyles ? `data-footer-styles="${escapeQuotes(footerStyles)}"` : ''}
        >
            ${generateBox(slide.content)}
        </section>
    `;
}

function generateHeaderFooterStyles(headerOrFooter: any): string {
    const styles: string[] = [];

    if (headerOrFooter.background) {
        styles.push(`background: ${headerOrFooter.background}`);
    }

    if (headerOrFooter.color) {
        styles.push(`color: ${headerOrFooter.color}`);
    }

    if (headerOrFooter.fontSize) {
        styles.push(`font-size: ${headerOrFooter.fontSize}`);
    }

    return styles.join('; ');
}


function generateBox(box: Box): CompositeGeneratorNode {
    switch(box.content.$type) {
        case 'TextBox': return generateTextBox(box.content);
        case 'ComponentBoxReference': return generateComponentBoxReference(box.content);
        case 'QuizBox': return generateQuizBox(box.content);

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