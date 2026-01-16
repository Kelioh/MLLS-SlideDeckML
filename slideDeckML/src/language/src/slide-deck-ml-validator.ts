import type { AstNode, ValidationAcceptor, ValidationChecks } from 'langium';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';

import {
    Box,
    Component,
    ComponentBox,
    ComponentBoxReference,
    ComponentContentBox,
    ContentBox,
    ContentBoxAttribute,
    ImageBox,
    ListBox,
    ListBoxAttribute,
    LiveQuizBox,
    MediaBoxAttribute,
    Model,
    QuizBox,
    SlideDeckMlAstType,
    TextBox,
    VideoBox,
    isContentBoxAttribute,
    isListBoxAttribute,
    isMediaBoxAttribute,
    isTextBoxAttribute
} from './generated/ast.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SlideDeckMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SlideDeckMlValidator;
    const checks: ValidationChecks<SlideDeckMlAstType> = {
        Model: validator.checkComponentReferences,
        ComponentBoxReference: validator.checkComponentBoxAttributes,
        ComponentContentBox: validator.checkBoxAttributesUsages,
        ContentBox: [validator.checkBoxAttributesUsages, validator.checkContentBoxAttributeValues],
        TextBox: validator.checkBoxAttributesUsages,
        ListBox: [validator.checkBoxAttributesUsages, validator.checkListBox],
        QuizBox: validator.checkQuizBox,
        LiveQuizBox: validator.checkLiveQuizBox,
        ImageBox: validator.checkImageBox,
        VideoBox: validator.checkVideoBox,
    };
    registry.register(checks, validator);
}


/**
 * Implementation of custom validations.
 */

export type ComponentInformation = {
    slots: Set<string>;
    references: Set<ComponentBoxReference>;
};


export class SlideDeckMlValidator {

    /* Components usages */

    checkComponentReferences(model: Model, validator: ValidationAcceptor): void {
        /* Create symbol table and check multiple declarations */
        const componentsSymbolTable: Map<string, ComponentInformation> = new Map();
        for (const component of model.components) {
            if (componentsSymbolTable.has(component.name)) {
                validator('warning', `Component '${component.name}' is declared multiple times`, { node: component });
            }
            componentsSymbolTable.set(component.name, this.collectComponentInformations(component.content)); // Only the last declaration is considered
        }

        /* Check component references within component declarations */
        for (const [name, informations] of componentsSymbolTable) {
            for (const reference of informations.references) {
                if (!reference.reference.ref || !componentsSymbolTable.get(reference.reference.ref.name)) {
                    validator('error', 'Unknown component', { node: reference });
                }
                else if (name === reference.reference.ref.name) {
                    validator('error', `Component '${name}' cannot reference itself`, { node: reference });
                }
            }
        }

        /* Check component references within slides */
        const componentBoxReferences: ComponentBoxReference[] = model.slides.flatMap(slide => this.collectComponentBoxReferences(slide.content));
        for (const reference of componentBoxReferences) {
            const component: Component | undefined = reference.reference.ref;
            let informations: ComponentInformation | undefined;
            if (!component || !(informations = componentsSymbolTable.get(component.name))) {
                validator('error', 'Unknown component', { node: reference });
                continue;
            }

            /* Check slots usages */
            const usedSlots = new Set<string>();
            for (const slot of reference.slots) {
                /* Already used slots */
                if (usedSlots.has(slot.name)) {
                    validator('error', `Slot '${slot.name}' is used more than once`, { node: slot });
                    continue;
                }
                usedSlots.add(slot.name);

                /* Unkown slots */
                if (!informations.slots.has(slot.name)) {
                    validator('error', `Unknown slot '${slot.name}' for component '${component.name}'`, { node: slot });
                }
            }

            /* Unused slots */
            for (const slot of informations.slots) {
                if (!usedSlots.has(slot)) {
                    validator('warning', `Slot '${slot}' of component '${component.name}' is never used`, { node: reference });
                }
            }
        }
    }

    private collectComponentInformations(componentBox: ComponentBox): ComponentInformation {
        const informations: ComponentInformation = { slots: new Set(), references: new Set() };

        switch (componentBox.$type) {
            case 'ComponentSlot':
                informations.slots.add(componentBox.name);
                if (componentBox.content) { // Collect references from slot default implementation
                    this.collectComponentBoxReferences(componentBox.content).forEach(reference => informations.references.add(reference));
                }
                break;

            case 'ComponentBoxReference':
                informations.references.add(componentBox);
                break;

            case 'ComponentContentBox':
                for (const box of componentBox.boxes) {
                    const childInformations: ComponentInformation = this.collectComponentInformations(box);
                    childInformations.slots.forEach(slot => informations.slots.add(slot)); // set.union seems to not exists
                    childInformations.references.forEach(reference => informations.references.add(reference));
                }
                break;
        }

        return informations;
    }

    private collectComponentBoxReferences(box: Box): ComponentBoxReference[] {
        switch (box.$type) {
            case 'ComponentBoxReference': return [box];
            case 'ContentBox': return box.boxes.flatMap((b: Box) => this.collectComponentBoxReferences(b));
            default: return [];
        }
    }


    /* Boxes attributes */

    checkComponentBoxAttributes(reference: ComponentBoxReference, validator: ValidationAcceptor): void {
        const componentContent = reference.reference.ref?.content;
        if (componentContent) {
            let attributeTypeChecker: (item: unknown) => boolean = this.collectAttributeTypeChecker(reference);
            const usedAttributes: Set<string> = new Set();
            for (const attribute of reference.attributes) {
                if (!attributeTypeChecker(attribute)) {
                    validator('error', `Attribute '${attribute.key}' is not authorized`, { node: reference });
                }

                if (usedAttributes.has(attribute.key)) {
                    validator('warning', `Attribute '${attribute.key}' is declared multiple times`, { node: reference });
                    continue;
                }
                usedAttributes.add(attribute.key);
            }
        }
    }

    private collectAttributeTypeChecker(reference: ComponentBoxReference): (item: unknown) => boolean {
        const componentContent = reference.reference.ref?.content;
        if (componentContent) {
            switch (componentContent.$type) {
                case 'ComponentContentBox': return isContentBoxAttribute;
                case 'TextBox': return isTextBoxAttribute;
                case 'ListBox': return isListBoxAttribute;
                case 'ImageBox': return isMediaBoxAttribute;
                case 'VideoBox': return isMediaBoxAttribute;

                case 'ComponentBoxReference':
                    return this.collectAttributeTypeChecker(componentContent)
            }
        }
        return (item: unknown) => false;
    }


    checkBoxAttributesUsages(box: ComponentContentBox | ContentBox | TextBox | ListBox, validator: ValidationAcceptor): void {
        const usedAttributes: Set<string> = new Set();
        for (const attribute of box.attributes) {
            if (usedAttributes.has(attribute.key)) {
                validator('warning', `Attribute '${attribute.key}' is declared multiple times`, { node: box });
                continue;
            }
            usedAttributes.add(attribute.key);
        }
    }

    checkQuizBox(quiz: QuizBox, validator: ValidationAcceptor): void {
        this.checkQuizCommon(quiz, validator);

        if (quiz.type !== 'mcq' && quiz.type !== 'short') {
            validator('error', `Unknown quiz type '${quiz.type}'. Expected 'mcq' or 'short'.`, { node: quiz, property: 'type' });
        }
    }

    checkLiveQuizBox(quiz: LiveQuizBox, validator: ValidationAcceptor): void {
        this.checkQuizCommon(quiz, validator);

        const sessionId = this.textContent(quiz.sessionId);
        if (!sessionId) {
            validator('error', `Live quiz requires a non-empty session id (e.g. {session123}).`, { node: quiz, property: 'sessionId' });
        }
    }

    private checkQuizCommon(quiz: { question: string; correctAnswer?: string; options: Array<{ id: string }>; type?: string }, validator: ValidationAcceptor): void {
        const question = this.textContent(quiz.question);
        if (!question) {
            validator('error', 'Quiz question is required.', { node: quiz as unknown as AstNode, property: 'question' as any });
        }

        const type = quiz.type;
        const optionIds = new Set((quiz.options ?? []).map(o => o.id));
        const correctAnswer = quiz.correctAnswer ? this.textContent(quiz.correctAnswer) : '';

        if (type === 'mcq') {
            if (!quiz.options || quiz.options.length < 2) {
                validator('error', 'MCQ quizzes should define at least 2 options.', { node: quiz as unknown as AstNode, property: 'options' as any });
            }
            if (!correctAnswer) {
                validator('warning', "MCQ quiz is missing 'correctAnswer'.", { node: quiz as unknown as AstNode, property: 'correctAnswer' as any });
            } else if (optionIds.size > 0 && !optionIds.has(correctAnswer)) {
                validator('warning', `MCQ correctAnswer '${correctAnswer}' does not match any option id (${Array.from(optionIds).join(', ')}).`, { node: quiz as unknown as AstNode, property: 'correctAnswer' as any });
            }
        }

        if (type === 'short') {
            if (quiz.options && quiz.options.length > 0) {
                validator('warning', "Short-answer quizzes should not define 'option' entries.", { node: quiz as unknown as AstNode, property: 'options' as any });
            }
            if (!correctAnswer) {
                validator('warning', "Short-answer quiz is missing 'correctAnswer'.", { node: quiz as unknown as AstNode, property: 'correctAnswer' as any });
            }
        }
    }

    private textContent(text: string | undefined): string {
        if (!text) return '';
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return trimmed.slice(1, -1).trim();
        }
        return trimmed;
    }


    /* Image validation */

    checkImageBox(image: ImageBox, validator: ValidationAcceptor): void {
        // Check src is not empty
        const src = this.textContent(image.src);
        if (!src) {
            validator('error', 'Image source (src) cannot be empty.', { node: image, property: 'src' });
        }

        // Check alt text is not empty (accessibility)
        const alt = this.textContent(image.alt);
        if (!alt) {
            validator('warning', 'Image alt text cannot be empty. Provide a description for accessibility.', { node: image, property: 'alt' });
        }

        // Check scale attribute if present
        for (const attr of image.attributes) {
            if (attr.key === 'scale') {
                const scaleValue = parseFloat(attr.value);
                if (isNaN(scaleValue) || scaleValue <= 0) {
                    validator('error', `Scale value '${attr.value}' is invalid. Must be a positive number.`, { node: image });
                } else if (scaleValue > 5) {
                    validator('warning', `Scale value '${attr.value}' is very large. Consider using a value between 0.1 and 2.0.`, { node: image });
                }
            }
        }

        // Check for duplicate attributes
        this.checkMediaBoxAttributesDuplication(image, validator);
    }


    /* Video validation */

    checkVideoBox(video: VideoBox, validator: ValidationAcceptor): void {
        // Check src is not empty
        const src = this.textContent(video.src);
        if (!src) {
            validator('error', 'Video source (src) cannot be empty.', { node: video, property: 'src' });
        }

        // Check alt text is not empty (accessibility)
        const alt = this.textContent(video.alt);
        if (!alt) {
            validator('warning', 'Video alt text cannot be empty. Provide a description for accessibility.', { node: video, property: 'alt' });
        }

        // Check scale attribute if present
        for (const attr of video.attributes) {
            if (attr.key === 'scale') {
                const scaleValue = parseFloat(attr.value);
                if (isNaN(scaleValue) || scaleValue <= 0) {
                    validator('error', `Scale value '${attr.value}' is invalid. Must be a positive number.`, { node: video });
                } else if (scaleValue > 5) {
                    validator('warning', `Scale value '${attr.value}' is very large. Consider using a value between 0.1 and 2.0.`, { node: video });
                }
            }
        }

        // Check for duplicate attributes
        this.checkMediaBoxAttributesDuplication(video, validator);
    }

    private checkMediaBoxAttributesDuplication(mediaBox: ImageBox | VideoBox, validator: ValidationAcceptor): void {
        const usedAttributes = new Set<string>();
        for (const attr of mediaBox.attributes) {
            if (usedAttributes.has(attr.key)) {
                validator('warning', `Attribute '${attr.key}' is declared multiple times.`, { node: mediaBox });
            }
            usedAttributes.add(attr.key);
        }
    }


    /* List validation */

    checkListBox(list: ListBox, validator: ValidationAcceptor): void {
        // Check that list has at least one item
        if (!list.items || list.items.length === 0) {
            validator('warning', 'List should contain at least one item.', { node: list });
        }

        // Check for empty list items
        for (let i = 0; i < list.items.length; i++) {
            const itemContent = this.textContent(list.items[i]);
            if (!itemContent) {
                validator('warning', `List item ${i + 1} is empty.`, { node: list });
            }
        }

        // Check spaceBetweenItems attribute
        for (const attr of list.attributes) {
            if (attr.key === 'spaceBetweenItems') {
                const value = parseInt(attr.value, 10);
                if (isNaN(value) || value < 0) {
                    validator('error', `spaceBetweenItems value '${attr.value}' is invalid. Must be a non-negative integer.`, { node: list });
                } else if (value > 100) {
                    validator('warning', `spaceBetweenItems value '${attr.value}' is very large. Consider using a value between 0 and 50.`, { node: list });
                }
            }
            if (attr.key === 'type') {
                if (attr.value !== 'ordered' && attr.value !== 'unordered') {
                    validator('error', `List type '${attr.value}' is invalid. Expected 'ordered' or 'unordered'.`, { node: list });
                }
            }
        }
    }


    /* ContentBox attribute validation */

    checkContentBoxAttributeValues(contentBox: ContentBox, validator: ValidationAcceptor): void {
        for (const attr of contentBox.attributes) {
            switch (attr.key) {
                case 'column':
                    const columnValue = parseInt(attr.value, 10);
                    if (isNaN(columnValue) || columnValue < 1) {
                        validator('error', `Column value '${attr.value}' is invalid. Must be a positive integer.`, { node: contentBox });
                    } else if (columnValue > 12) {
                        validator('error', `Column value '${attr.value}' exceeds 12. The grid system uses a maximum of 12 columns.`, { node: contentBox });
                    }
                    break;

                case 'height':
                    // Height should be a percentage
                    const heightMatch = attr.value.match(/^(\d+)%?$/);
                    if (!heightMatch) {
                        validator('error', `Height must be a percentage format (e.g., '50%' or '50').`, { node: contentBox });
                    } else {
                        const heightValue = parseInt(heightMatch[1], 10);
                        if (heightValue < 0 || heightValue > 100) {
                            validator('error', `Height percentage must be between 0% and 100%.`, { node: contentBox });
                        }
                    }
                    break;

                case 'alignment':
                    const validAlignments = ['top', 'center', 'bottom', 'left', 'right', 'top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'];
                    if (!validAlignments.includes(attr.value)) {
                        validator('warning', `Alignment value '${attr.value}' may not be recognized. Common values are: ${validAlignments.join(', ')}.`, { node: contentBox });
                    }
                    break;

                case 'fragment':
                    const validFragments = ['fade-in', 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'fade-in-then-out', 'fade-in-then-semi-out', 'grow', 'shrink', 'strike', 'highlight-red', 'highlight-green', 'highlight-blue', 'current-visible', 'semi-fade-out'];
                    if (!validFragments.includes(attr.value)) {
                        validator('warning', `Fragment style '${attr.value}' may not be recognized. Common values are: ${validFragments.slice(0, 5).join(', ')}, ...`, { node: contentBox });
                    }
                    break;
            }
        }
    }

}