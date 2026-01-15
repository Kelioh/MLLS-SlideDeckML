import type { AstNode, ValidationAcceptor, ValidationChecks } from 'langium';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';

import {
    Box,
    Component,
    ComponentBox,
    ComponentBoxReference,
    ComponentContentBox,
    ContentBox,
    ListBox,
    Model,
    SlideDeckMlAstType,
    TextBox,
    isCommonAttribute,
    isContentAttribute,
    isListAttribute,
    isMediaAttribute,
    isTextAttribute,
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
                case 'ComponentContentBox': return item => isCommonAttribute(item) || isContentAttribute(item);
                
                case 'ListBox': return item => isCommonAttribute(item) || isListAttribute(item);

                case 'ImageBox':
                case 'VideoBox': return item => isCommonAttribute(item) || isMediaAttribute(item);

                case 'CodeBox' :
                case 'MathematicalBox':
                case 'TextBox': return item => isCommonAttribute(item) || isTextAttribute(item);

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

}