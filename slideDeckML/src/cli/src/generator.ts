import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractDestinationAndName } from './util.js';

import {
    Component,
    ComponentBox,
    ComponentSlot,
    ContentBoxAttribute,
    type Box,
    type ComponentBoxReference,
    type Footer,
    type Header,
    type ImageBox,
    type ListBox,
    type LiveQuizBox,
    type Model,
    type QuizBox,
    type Slide,
    type TextBox,
    type VideoBox
} from 'slide-deck-ml-language';

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
            <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" crossorigin="anonymous"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/solarized.css">

            <style>
                /* Reset body margins/padding */
                body {
                    margin: 0;
                    padding: 0;
                    font-family: ${model.theme?.fontName ? model.theme.fontName.slice(1, -1) : 'Arial, sans-serif'};
                    overflow: hidden;
                }

                /* Reveal.js viewport adjustment for header/footer */
                .reveal {
                    top: 80px !important;
                    height: calc(100% - 160px) !important;
                }

                .reveal .slides section {
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: column;
                    justify-content: center;
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
                    gap: 1rem;
                }

                .slide-header img.theme-logo {
                    height: 50px;
                    max-width: 100px;
                    object-fit: contain;
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

            <div id="global-header" class="slide-header"></div>

            <div class="reveal">
                <div class="slides">
                    ${joinToNode(model.slides.map((slide: Slide) => generateSlide(slide, model).appendNewLineIfNotEmpty()))}
                </div>
            </div>

            <div id="global-footer" class="slide-footer"></div>
            
            <script id="annotation-storage">window.savedPaths = {};</script>

            <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/qrcodejs2@0.0.2/qrcode.min.js"></script>
            <script src="http://localhost:3000/socket.io/socket.io.js"></script>
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            if (typeof io !== 'undefined') {
                const host = (window.location.protocol === 'file:') ? 'localhost' : window.location.hostname;
                const serverUrl = "http://" + host + ":3000";

                const socket = io(serverUrl, {
                    reconnection: false,
                    reconnectionAttempts: 0,
                    timeout: 2000
                });

                window["sdmlMobileVoteUrl"] = "http://localhost:3000/vote";
                
                socket.on("connect", () => {
                    console.log("Connected to:", serverUrl);
                    socket.emit("join-session", "SESSION123");
                });

                let sdmlShownConnectError = false;
                socket.on("connect_error", (err) => {
                    if (sdmlShownConnectError) return;
                    sdmlShownConnectError = true;
                    console.warn("Socket.IO server not reachable:", serverUrl);
                    try { socket.close(); } catch {}
                });

                socket.on("mobile-ip", (url) => {
                    if (typeof url === 'string' && url.length > 0) {
                        window["sdmlMobileVoteUrl"] = url;
                        window.dispatchEvent(new CustomEvent('sdml-mobile-ip', { detail: { url } }));
                        console.log('QR URL:', url);
                    }
                });

                window["sdmlSocket"] = socket; 
            }
        });
    </script>
            <script>
                // Theme logo URL
                const THEME_LOGO_URL = ${model.theme?.logo ? `"${model.theme.logo}"` : '""'};

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
                        // Add logo if theme has one
                        let finalHeaderContent = headerContent;
                        if (THEME_LOGO_URL) {
                            finalHeaderContent = '<img src="' + THEME_LOGO_URL + '" alt="Logo" class="theme-logo" />' + headerContent;
                        }

                        headerDiv.innerHTML = finalHeaderContent;
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

function generateSlide(slide: Slide, model: Model): CompositeGeneratorNode {
    const attributes = (slide as unknown as { attributes?: unknown }).attributes;
    const isAnnotable = hasAttribute(attributes, 'annotable');

    // Determine header and footer (slide-specific or global)
    const header = slide.header || model.header;
    const footer = slide.footer || model.footer;

    // Generate header and footer HTML with styling
    const headerHtml = header ? generateHeaderFooterHtml(header, 'header') : '';
    const footerHtml = footer ? generateHeaderFooterHtml(footer, 'footer') : '';

    // Generate style attributes for header/footer
    const headerStyles = header ? generateHeaderFooterStyles(header) : '';
    const footerStyles = footer ? generateHeaderFooterStyles(footer) : '';

    return expandToNode`
        <section
            id="${slide.id}"
            ${isAnnotable ? `class="annotable"` : ''}
            data-transition="fade"
            ${headerHtml ? `data-header="${headerHtml.replace(/"/g, '&quot;')}"` : ''}
            ${footerHtml ? `data-footer="${footerHtml.replace(/"/g, '&quot;')}"` : ''}
            ${headerStyles ? `data-header-styles="${headerStyles}"` : ''}
            ${footerStyles ? `data-footer-styles="${footerStyles}"` : ''}
        >
            ${generateBox(slide.content)}
        </section>
    `;
}


function generateHeaderFooterHtml(headerOrFooter: Header | Footer, type: 'header' | 'footer'): string {
    const boxHtml = toString(generateBox(headerOrFooter.content));
    return boxHtml;
}

function generateHeaderFooterStyles(headerOrFooter: Header | Footer): string {
    const styles: string[] = [];
    if (headerOrFooter.background) {
        styles.push(`background: ${headerOrFooter.background.slice(1, -1)}`);
    }
    if (headerOrFooter.color) {
        styles.push(`color: ${headerOrFooter.color.slice(1, -1)}`);
    }
    if (headerOrFooter.fontSize) {
        styles.push(`font-size: ${headerOrFooter.fontSize.slice(1, -1)}`);
    }
    return styles.join('; ');
}


function generateBox(box: Box): CompositeGeneratorNode {
    // Handle fragment animation
    const fragmentClass = box.fragmentStyle ? `class="fragment ${box.fragmentStyle}"` : '';
    const content = box.content;

    switch (content.$type) {
        case 'TextBox':
            return fragmentClass
                ? expandToNode`<div ${fragmentClass}>${generateTextBox(content)}</div>`
                : generateTextBox(content);

        case 'ImageBox':
            return fragmentClass
                ? expandToNode`<div ${fragmentClass}>${generateImageBox(content)}</div>`
                : generateImageBox(content);

        case 'VideoBox':
            return fragmentClass
                ? expandToNode`<div ${fragmentClass}>${generateVideoBox(content)}</div>`
                : generateVideoBox(content);

        case 'ComponentBoxReference':
            return fragmentClass
                ? expandToNode`<div ${fragmentClass}>${generateComponentBoxReference(content)}</div>`
                : generateComponentBoxReference(content);

        case 'QuizBox':
            return fragmentClass
                ? expandToNode`<div ${fragmentClass}>${generateQuizBox(content)}</div>`
                : generateQuizBox(content);

        case 'LiveQuizBox':
            return fragmentClass
                ? expandToNode`<div ${fragmentClass}>${generateLiveQuizBox(content)}</div>`
                : generateLiveQuizBox(content);

        case 'ListBox':
            return fragmentClass
                ? expandToNode`<div ${fragmentClass}>${generateListBox(content)}</div>`
                : generateListBox(content);

        case 'ContentBox':
            return expandToNode`
                <div ${fragmentClass} ${(content.attributes.length !== 0) ? `style="${generateContentBoxAttributes(content.attributes, content.boxes.length)}"` : ''}>
                    ${joinToNode(content.boxes.map(b => generateBox(b).appendNewLineIfNotEmpty()))}
                </div>
            `;

        default: throw new Error(`Unknown box content type: ${(content as any).$type}`);
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
    let declarationBox: any = declaration.content;
    switch (declaration.content.$type) {
        case 'ComponentContentBox':
        case 'TextBox':
        case 'ListBox':
        case 'ComponentBoxReference':
            let mergedAttributes: Map<string, string | undefined>;
            mergedAttributes = new Map(declarationBox.attributes.map((attribute: any) => [attribute.key, attribute.value]));
            for (const attribute of reference.attributes) {
                mergedAttributes.set(attribute.key, (attribute as any).value);
            }
            declarationBox = { ...declarationBox, attributes: Array.from(mergedAttributes.entries(), ([key, value]) => ({ $type: collectAttributeType(reference), key, value } as any)) }; // Does not include $container, $containerProperty, $containerIndex, $cstNode, $document
            break;
    }

    return generateComponentBox(declarationBox as ComponentBox, slots);
}

function collectAttributeType(reference: ComponentBoxReference): string {
    const componentContent = reference.reference.ref?.content;
    if (componentContent) {
        switch (componentContent.$type) {
            case 'ComponentContentBox': return 'ContentBoxAttribute';
            case 'TextBox': return 'TextBoxAttribute';
            case 'ListBox': return 'ListBoxAttribute';
            case 'ImageBox': return 'MediaBoxAttribute';
            case 'VideoBox': return 'MediaBoxAttribute';
            case 'ComponentBoxReference': return collectAttributeType(componentContent)
        }
    }
    return '';
}

function generateComponentBox(box: ComponentBox, slots: Record<string, CompositeGeneratorNode>): CompositeGeneratorNode {
    switch (box.$type) {
        case 'TextBox': return generateTextBox(box);
        case 'ImageBox': return generateImageBox(box);
        case 'VideoBox': return generateVideoBox(box);
        case 'ComponentBoxReference': return generateComponentBoxReference(box);
        case 'QuizBox': return generateQuizBox(box);
        case 'ListBox': return generateListBox(box);
        case 'LiveQuizBox': return generateLiveQuizBox(box);

        case 'ComponentSlot': return generateComponentSlot(box, slots);
        case 'ComponentContentBox':
            return expandToNode`
                <div ${(box.attributes.length !== 0) ? `style="${generateContentBoxAttributes(box.attributes, box.boxes.length)}"` : ''}>
                    ${joinToNode(box.boxes.map(box => generateComponentBox(box, slots).appendNewLineIfNotEmpty()))}
                </div>
            `;

        default: throw new Error(`Unknown box type: ${(box as any).$type}`);
    }
}

function generateContentBoxAttributes(attributes: ContentBoxAttribute[], boxCount: number): string {
    let style = '';
    let alignmentValue: string | undefined;
    let hasHeight = false;

    for (const attribute of attributes) {
        switch (attribute.key) {
            case 'column':
                style += `display: grid; 
                    grid-template-columns: repeat(${attribute.value}, 1fr); 
                    grid-template-rows: repeat(${Math.ceil(boxCount / (attribute.value as any))}, ${100 / Math.ceil(boxCount / (attribute.value as any))}%);
                    width: 100%;
                    gap: 10px;
                    box-sizing: border-box;
                `;
                break;

            case 'height':
                style += `height: ${attribute.value};`;
                hasHeight = true;
                break;

            case 'alignment':
                alignmentValue = attribute.value;
                break;
        }
    }

    if (!hasHeight) {
        style += 'height: 100%; ';
    }

    const alignment = mapAlignment(alignmentValue);

    style += `
        place-items: ${alignment};
        place-content: ${alignment};
    `;

    return style;
}

function mapAlignment(value?: string): string {
    if (!value) {
        return 'center center';
    }

    const [vertical, horizontal] = value.split(' ');

    const map: Record<string, string> = {
        top: 'start',
        center: 'center',
        bottom: 'end',
        left: 'start',
        right: 'end'
    };

    const v = map[vertical] ?? 'center';
    const h = map[horizontal] ?? 'center';

    return `${v} ${h}`;
}

function generateComponentSlot(slot: ComponentSlot, slots: Record<string, CompositeGeneratorNode>): CompositeGeneratorNode {
    return slots[slot.name] ?? (slot.content ? generateBox(slot.content) : expandToNode``); // Override slot content or use default
}

function generateTextBox(textBox: TextBox): CompositeGeneratorNode {
    const attributes = (textBox as unknown as { attributes?: unknown }).attributes;

    const bold = hasAttribute(attributes, 'bold');
    const italic = hasAttribute(attributes, 'italic');
    const underline = hasAttribute(attributes, 'underline');
    const strikethrough = hasAttribute(attributes, 'strikethrough');
    const highlight = hasAttribute(attributes, 'highlight');
    const color = getAttributeValue(attributes, 'color');
    const font = getAttributeValue(attributes, 'font');

    const text = textBox.content.slice(1, -1).trim();

    return expandToNode`<p style="${generateTextBoxStyles(bold, italic, underline, strikethrough, highlight, color, font)}">${text}</p>`;
}

function generateTextBoxStyles(bold: boolean, italic: boolean, underline: boolean, strikethrough: boolean, highlight: boolean, color: string | unknown, font: string | unknown): string {
    let style = '';

    if (bold) {
        style += 'font-weight: bold; ';
    }
    if (italic) {
        style += 'font-style: italic; ';
    }
    if (underline) {
        style += 'text-decoration: underline; ';
    }
    if (strikethrough) {
        style += 'text-decoration: line-through; ';
    }
    if (highlight) {
        style += 'background-color: yellow; ';
    }
    if (color) {
        style += `color: ${color}; `;
    }
    if (font) {
        style += `font-family: ${font}; `;
    }

    return style;
}

function generateImageBox(imageBox: ImageBox): CompositeGeneratorNode {
    const src = imageBox.src.slice(1, -1).trim();
    const alt = imageBox.alt.slice(1, -1).trim();
    const attributes = (imageBox as unknown as { attributes?: unknown }).attributes;
    const scaleAttribute = getAttributeValue(attributes, 'scale');

    let style = `
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        margin: auto;
    `;

    if (scaleAttribute) {
        style += `
            width: ${scaleAttribute};
            height: auto;
        `;
    } else {
        style += `
            width: 100%; 
            height: 100%;
        `;
    }

    return expandToNode`
        <img 
            src="${src}" 
            alt="${alt}" 
            style="${style}" 
        />`;
}

function toYouTubeEmbed(url: string): string {
    const match = url.match(/(?:youtu\.be\/|v=)([^?&]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function generateVideoBox(videoBox: VideoBox): CompositeGeneratorNode {
    const src = videoBox.src.slice(1, -1).trim();
    const embed = toYouTubeEmbed(src);
    const alt = videoBox.alt.slice(1, -1).trim();

    const attributes = (videoBox as unknown as { attributes?: unknown }).attributes;
    const scaleAttribute = getAttributeValue(attributes, 'scale');

    let maxWidthStyle = '100%';
    if (scaleAttribute) {
        const val = scaleAttribute.toString();
        maxWidthStyle = val.endsWith('%') ? val : `${val}%`;
    }

    const style = `
        display: block;
        aspect-ratio: 16 / 9;
        width: auto;
        height: auto;
        max-width: ${maxWidthStyle};
        max-height: 100%;
        border: 0;
    `;

    return expandToNode`
        <iframe
            src="${embed}"
            title="${alt}"
            style="${style}"
            allowfullscreen>
        </iframe>
    `;
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


type AstAttribute = { key: string; value?: unknown };

function getAttributeValue(attributes: unknown, key: string): unknown {
    if (!Array.isArray(attributes)) return undefined;
    const attr = (attributes as AstAttribute[]).find(a => a?.key === key);
    return attr?.value;
}

function hasAttribute(attributes: unknown, key: string): boolean {
    if (!Array.isArray(attributes)) return false;
    return (attributes as AstAttribute[]).some(a => a?.key === key);
}

function generateLiveQuizBox(quiz: LiveQuizBox): CompositeGeneratorNode {
    const quizId = quiz.id;
    const questionText = textContent(quiz.question);
    const correctAnswer = quiz.correctAnswer ? textContent(quiz.correctAnswer) : '';
    const sessionId = "SESSION123";

    const options = quiz.options.map(opt => textContent(opt.content));
    const optionsJson = JSON.stringify(options);

    return expandToNode`
        <div class="sdml-quiz live-quiz" id="quiz-${quizId}" data-correct-answer="${correctAnswer}">
            <div class="sdml-quiz__title">Live Quiz</div>
            <div class="sdml-quiz__question">${questionText}</div>
            
            <div style="display: flex; gap: 20px; align-items: flex-start;">
                <div class="sdml-quiz__options" style="flex: 1;">
                    ${joinToNode(options.map((opt, index) => expandToNode`
                        <div class="live-option-row" style="margin: 8px 0; display: flex; justify-content: space-between; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">
                            <span>${opt}</span>
                            <span class="vote-count" data-option="${opt}" style="font-weight: bold; color: #007bff;">0</span>
                        </div>
                    `))}
                </div>
                
                <div class="sdml-quiz__qr-container" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div id="qr-${quizId}" style="border: 2px solid #ddd; border-radius: 8px; padding: 6px; background: #fff;"></div>
                    <div style="font-size: 12px; color: #666;">Scan to vote</div>
                </div>
            </div>

            <div class="sdml-quiz__actions" style="margin-top: 15px;">
                ${quiz.revealResultsOnDemand
            ? expandToNode`
                        <div class="sdml-quiz__reveal-wrap">
                            <button class="sdml-quiz__btn sdml-quiz__reveal" type="button" 
                                onclick="(function(btn){
                                    const r = btn.closest('.sdml-quiz');
                                    const res = r.querySelector('.sdml-quiz__results');
                                    if(res) res.style.display = 'block';
                                    btn.style.display = 'none';
                                })(this)">Reveal Answer</button>
                            <div class="sdml-quiz__results" style="display:none; margin-top: 10px; padding: 10px; background: #e0f2f1; border-radius: 4px;">
                                Correct answer: <strong>${correctAnswer}</strong>
                            </div>
                        </div>`
            : expandToNode`
                        <div class="sdml-quiz__results" style="margin-top: 10px; padding: 10px; background: #e0f2f1; border-radius: 4px;">
                            Correct answer: <strong>${correctAnswer || '—'}</strong>
                        </div>`
        }
            </div>

            <script>
                (function() {
                    const quizId = "${quizId}";
                    const sessionId = "${sessionId}";
                    const options = ${optionsJson};
                    const voteCounts = {};

                    
                    options.forEach(opt => { voteCounts[opt] = 0; });

                    const renderQRCode = (url) => {
                        const qrEl = document.getElementById("qr-" + quizId);
                        if (!qrEl) return;

                        qrEl.innerHTML = '';

                        if (typeof QRCode === 'function') {
                            const level = (QRCode.CorrectLevel && QRCode.CorrectLevel.M) ? QRCode.CorrectLevel.M : undefined;
                            new QRCode(qrEl, {
                                text: String(url || ''),
                                width: 150,
                                height: 150,
                                ...(level ? { correctLevel: level } : {})
                            });
                            return;
                        }
                    };

                    const updateQRCodeFromGlobal = () => {
                        const url = window["sdmlMobileVoteUrl"] || "http://localhost:3000/vote";
                        renderQRCode(url);
                    };

                    const initQuiz = (socket) => {
                        
                        socket.emit("register-quiz", {
                            sessionId: sessionId,
                            question: "${questionText}",
                            options: options
                        });

                        socket.on("qcm-results-update", (v) => {
                            
                            voteCounts[v.choice] = (voteCounts[v.choice] || 0) + 1;
                            
                            const quizEl = document.getElementById("quiz-" + quizId);
                            const countEl = quizEl.querySelector('.vote-count[data-option="' + v.choice + '"]');
                            if (countEl) {
                                countEl.textContent = voteCounts[v.choice];
                                countEl.style.transform = "scale(1.2)";
                                setTimeout(() => { countEl.style.transform = "scale(1)"; }, 200);
                            }
                        });
                    };

                    const interval = setInterval(() => {
                        if (window.sdmlSocket) {
                            clearInterval(interval);
                            initQuiz(window.sdmlSocket);
                        }
                    }, 100);
                    
                    const onMobileIp = (ev) => {
                        const url = (ev && ev.detail && ev.detail.url) ? ev.detail.url : window["sdmlMobileVoteUrl"];
                        if (url) renderQRCode(url);
                    };
                    window.addEventListener('sdml-mobile-ip', onMobileIp);

                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', updateQRCodeFromGlobal);
                    } else {
                        updateQRCodeFromGlobal();
                    }
                })();
            </script>
        </div>
    `;
}