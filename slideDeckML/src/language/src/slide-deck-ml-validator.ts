import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { Attribute, Box, Component, ComponentBox, ComponentBoxReference, Model, SlideDeckMlAstType, TextBox } from './generated/ast.js';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SlideDeckMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SlideDeckMlValidator;
    const checks: ValidationChecks<SlideDeckMlAstType> = {
       Model: validator.checkComponentReferences,
       TextBox: validator.checkTextBox,
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

        switch (componentBox.content.$type) {
            case 'ComponentSlot': 
                informations.slots.add(componentBox.content.name);
                break;
            
            case 'ComponentBoxReference': 
                informations.references.add(componentBox.content);
                break;

            case 'ComponentContentBox':
                for (const box of componentBox.content.boxes) {
                    const childInformations: ComponentInformation = this.collectComponentInformations(box);
                    childInformations.slots.forEach(slot => informations.slots.add(slot)); // set.union seems to not exists
                    childInformations.references.forEach(reference => informations.references.add(reference));
                }
                break;
        }

        return informations;
    }

    private collectComponentBoxReferences(box: Box): ComponentBoxReference[] {
        switch(box.content.$type) {
            case 'ComponentBoxReference': return [box.content];
            case 'ContentBox': return box.content.boxes.flatMap(b => this.collectComponentBoxReferences(b));
            default: return [];
        }
    }


    checkTextBox(textBox: TextBox, validator: ValidationAcceptor): void {
        const authorizedAttributes: Set<string> = new Set(['font']);
        const usedAttributes: Set<string> = new Set();
        for (const attribute of textBox.attributes) {
            if (!authorizedAttributes.has(attribute.key)) {
                validator('error', `Attribute '${attribute.key}' is not authorized`, { node: textBox });
            }
            if (usedAttributes.has(attribute.key)) {
                validator('warning', `Attribute '${attribute.key}' is declared multiple times`, { node: textBox });
                continue;
            }
            usedAttributes.add(attribute.key);
        }
    }

}