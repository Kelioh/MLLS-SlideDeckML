import { LangiumDocument, MaybePromise } from 'langium';
import { CodeActionProvider } from 'langium/lsp';
import {
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
    Diagnostic,
    Range,
    TextEdit
} from 'vscode-languageserver';

/**
 * Custom code action provider for SlideDeckML.
 * Provides quick fixes for common validation issues.
 */
export class SlideDeckMlCodeActionProvider implements CodeActionProvider {

    getCodeActions(
        document: LangiumDocument,
        params: CodeActionParams
    ): MaybePromise<Array<CodeAction | Command> | undefined> {
        const result: CodeAction[] = [];
        const diagnostics = params.context.diagnostics;

        for (const diagnostic of diagnostics) {
            const quickFix = this.createQuickFix(document, diagnostic);
            if (quickFix) {
                result.push(quickFix);
            }
        }

        return result;
    }

    private createQuickFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction | undefined {
        const message = diagnostic.message;

        // Image/Video alt text fixes
        if (message.includes('Image alt text should not be empty') || message.includes('alt text cannot be empty')) {
            return this.createAddAltTextFix(document, diagnostic, 'Add descriptive alt text');
        }
        if (message.includes('Video description (alt) should not be empty')) {
            return this.createAddAltTextFix(document, diagnostic, 'Add descriptive video description');
        }

        // Image/Video source fixes
        if (message.includes('Image source (src) should not be empty') || message.includes('src') && message.includes('cannot be empty')) {
            return this.createAddSrcFix(document, diagnostic, 'image.jpg');
        }
        if (message.includes('Video source (src) should not be empty')) {
            return this.createAddSrcFix(document, diagnostic, 'video.mp4');
        }

        // Column value fix
        if (message.includes('exceeds 12')) {
            return this.createFixColumnValueFix(document, diagnostic);
        }

        // Height format fixes
        if (message.includes('height must be a percentage') || message.includes('Height must be a percentage format')) {
            return this.createFixHeightFormatFix(document, diagnostic);
        }
        if (message.includes('height percentage must be between 0% and 100%') || message.includes('Height percentage must be between')) {
            return this.createFixHeightRangeFix(document, diagnostic);
        }

        // Quiz fixes
        if (message.includes("missing 'correctAnswer'") || message.includes("Missing correct answer")) {
            return this.createAddCorrectAnswerFix(document, diagnostic);
        }
        if (message.includes('Live quiz requires a non-empty session id')) {
            return this.createAddSessionIdFix(document, diagnostic);
        }
        if (message.includes('MCQ quizzes should define at least 2 options') || message.includes('at least 2 options')) {
            return this.createAddMcqOptionsFix(document, diagnostic);
        }
        if (message.includes("Unknown quiz type")) {
            return this.createFixQuizTypeFix(document, diagnostic);
        }

        // List fixes
        if (message.includes('List item should not be empty')) {
            return this.createRemoveEmptyListItemFix(document, diagnostic);
        }
        if (message.includes('spaceBetweenItems value is very large')) {
            return this.createFixSpaceBetweenItemsFix(document, diagnostic);
        }

        // Component fixes
        if (message.includes('Unknown component')) {
            return this.createSuggestComponentFix(document, diagnostic);
        }
        if (message.includes('cannot reference itself')) {
            return this.createRemoveSelfReferenceFix(document, diagnostic);
        }

        // Slot fixes
        if (message.includes('Unknown slot')) {
            return this.createRemoveUnknownSlotFix(document, diagnostic);
        }
        if (message.includes('used more than once')) {
            return this.createRemoveDuplicateSlotFix(document, diagnostic);
        }

        // Attribute fixes
        if (message.includes('declared multiple times')) {
            return this.createRemoveDuplicateAttributeFix(document, diagnostic);
        }
        if (message.includes('not authorized')) {
            return this.createRemoveUnauthorizedAttributeFix(document, diagnostic);
        }

        return undefined;
    }

    private createAddAltTextFix(document: LangiumDocument, diagnostic: Diagnostic, placeholder: string): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/alt\s*\{\s*\}/, `alt {${placeholder}}`);

        return {
            title: `Add ${placeholder.toLowerCase()}`,
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createAddSrcFix(document: LangiumDocument, diagnostic: Diagnostic, placeholder: string): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/src\s*\{\s*\}/, `src {${placeholder}}`);

        return {
            title: `Add placeholder source (${placeholder})`,
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createFixColumnValueFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/column=\d+/, 'column=12');

        return {
            title: 'Set column to 12 (standard grid maximum)',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createFixHeightFormatFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/height=(\d+)(?!%)/, 'height=$1%');

        return {
            title: 'Add percentage sign to height value',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createFixHeightRangeFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/height=\d+%/, 'height=100%');

        return {
            title: 'Set height to 100%',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createAddCorrectAnswerFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const insertPosition = { line: range.end.line, character: range.end.character };

        return {
            title: 'Add placeholder correctAnswer',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.insert(insertPosition, '\n            {a}')
                    ]
                }
            }
        };
    }

    private createAddSessionIdFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const insertPosition = { line: range.end.line, character: range.end.character };

        return {
            title: 'Add placeholder session ID',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.insert(insertPosition, '\n            {session123}')
                    ]
                }
            }
        };
    }

    private createAddMcqOptionsFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const insertPosition = { line: range.end.line, character: range.end.character };

        return {
            title: 'Add placeholder MCQ options',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.insert(insertPosition, '\n            option a {Option A}\n            option b {Option B}')
                    ]
                }
            }
        };
    }

    private createFixQuizTypeFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/\b(mcq|short|[a-zA-Z]+)\b/, 'mcq');

        return {
            title: "Change quiz type to 'mcq'",
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createRemoveEmptyListItemFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/\{\s*\}\s*/g, '');

        return {
            title: 'Remove empty list items',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createFixSpaceBetweenItemsFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const text = document.textDocument.getText(range);
        const newText = text.replace(/spaceBetweenItems=\d+/, 'spaceBetweenItems=20');

        return {
            title: 'Set spaceBetweenItems to reasonable value (20px)',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.replace(range, newText)
                    ]
                }
            }
        };
    }

    private createSuggestComponentFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        return {
            title: 'Create component definition',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: false,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.insert({ line: 0, character: 0 }, 'component NewComponent {\n    box {\n        text {Component content}\n    }\n}\n\n')
                    ]
                }
            }
        };
    }

    private createRemoveSelfReferenceFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        // Extend range to include the whole line
        const lineRange: Range = {
            start: { line: range.start.line, character: 0 },
            end: { line: range.end.line + 1, character: 0 }
        };

        return {
            title: 'Remove self-referencing component',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.del(lineRange)
                    ]
                }
            }
        };
    }

    private createRemoveUnknownSlotFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const lineRange: Range = {
            start: { line: range.start.line, character: 0 },
            end: { line: range.end.line + 1, character: 0 }
        };

        return {
            title: 'Remove unknown slot',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.del(lineRange)
                    ]
                }
            }
        };
    }

    private createRemoveDuplicateSlotFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        const range = diagnostic.range;
        const lineRange: Range = {
            start: { line: range.start.line, character: 0 },
            end: { line: range.end.line + 1, character: 0 }
        };

        return {
            title: 'Remove duplicate slot usage',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.uri.toString()]: [
                        TextEdit.del(lineRange)
                    ]
                }
            }
        };
    }

    private createRemoveDuplicateAttributeFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        return {
            title: 'Remove duplicate attribute (keep first occurrence)',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            // Note: This would need more sophisticated logic to actually remove duplicates
            // For now, it's a placeholder that highlights the issue
            edit: undefined
        };
    }

    private createRemoveUnauthorizedAttributeFix(document: LangiumDocument, diagnostic: Diagnostic): CodeAction {
        return {
            title: 'Remove unauthorized attribute',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            // Note: This would need more sophisticated logic to remove the specific attribute
            edit: undefined
        };
    }
}
