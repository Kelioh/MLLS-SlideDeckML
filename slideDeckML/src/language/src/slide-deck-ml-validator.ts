import type { AstNode, ValidationAcceptor, ValidationChecks } from 'langium';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';

import {
    Box,
    Component,
    ComponentBox,
    ComponentBoxReference,
    ComponentContentBox,
    ContentBox,
    ImageBox,
    ListBox,
    LiveQuizBox,
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
        ContentBox: validator.checkBoxAttributesUsages,
        TextBox: validator.checkBoxAttributesUsages,
        ListBox: validator.checkBoxAttributesUsages,
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

}