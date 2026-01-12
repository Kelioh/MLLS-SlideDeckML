import type { AstNode, ValidationAcceptor, ValidationChecks } from 'langium';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';

import {
    Attribute,
    Box,
    Component,
    ComponentBox,
    ComponentBoxReference,
    ComponentContentBox,
    ContentBox,
    LiveQuizBox,
    Model,
    QuizBox,
    Slide,
    SlideDeckMlAstType,
    TerminalBox,
    TextBox
} from './generated/ast.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SlideDeckMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SlideDeckMlValidator;
    const checks: ValidationChecks<SlideDeckMlAstType> = {
        Model: validator.checkComponentReferences,
        ComponentContentBox: validator.checkContentBoxesAttributes,
        ContentBox: validator.checkContentBoxesAttributes,
        TerminalBox: validator.checkTerminalBoxAttributes,
        QuizBox: validator.checkQuizBox,
        LiveQuizBox: validator.checkLiveQuizBox,
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
        const content = box.content;
        switch (content.$type) {
            case 'ComponentBoxReference': return [content];
            case 'ContentBox': return content.boxes.flatMap(b => this.collectComponentBoxReferences(b));
            default: return [];
        }
    }


    /* Boxes attributes */

    private boxAttributes: Record<string, Set<string>> = {
        TextBox: new Set(['font']),
        ComponentContentBox: new Set(['column', 'height']),
        ContentBox: new Set(['column', 'height']),
        ListBox: new Set(['type', 'spaceBetweenItems']),
        Slide: new Set(['annotable']),
        // Add box attributes here
    };

    checkContentBoxesAttributes(box: ContentBox | ComponentContentBox, validator: ValidationAcceptor): void {
        this.checkAttributes(box.attributes, this.boxAttributes[box.$type], box, validator);
    }

    checkTerminalBoxAttributes(box: TerminalBox, validator: ValidationAcceptor): void {
        switch (box.$type) {
            case 'QuizBox': break;
            case 'ImageBox': break;
            case 'VideoBox': break;
            case 'LiveQuizBox': break;

            case 'ComponentBoxReference':
                const componentContent = box.reference.ref?.content;
                if (componentContent) {
                    this.checkAttributes(box.attributes, this.boxAttributes[componentContent.$type], box, validator);
                }
                break;

            default:
                this.checkAttributes(box.attributes, this.boxAttributes[box.$type], box, validator);
                break;
        }
    }

    private checkAttributes(attributes: Attribute[], authorizedAttributes: Set<string>, node: AstNode, validator: ValidationAcceptor): void {
        const usedAttributes: Set<string> = new Set();
        for (const attribute of attributes) {
            if (!authorizedAttributes.has(attribute.key)) {
                validator('error', `Attribute '${attribute.key}' is not authorized`, { node: node });
            }
            if (usedAttributes.has(attribute.key)) {
                validator('warning', `Attribute '${attribute.key}' is declared multiple times`, { node: node });
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

}