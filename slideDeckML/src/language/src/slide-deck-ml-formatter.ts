import { AstNode } from 'langium';
import { AbstractFormatter, Formatting } from 'langium/lsp';
import * as ast from './generated/ast.js';

/**
 * Custom formatter for SlideDeckML.
 * Provides automatic code formatting for all AST node types.
 */
export class SlideDeckMlFormatter extends AbstractFormatter {

    protected format(node: AstNode): void {
        if (ast.isModel(node)) {
            this.formatModel(node);
        } else if (ast.isComponent(node)) {
            this.formatComponent(node);
        } else if (ast.isSlide(node)) {
            this.formatSlide(node);
        } else if (ast.isContentBox(node)) {
            this.formatContentBox(node);
        } else if (ast.isTextBox(node)) {
            this.formatTextBox(node);
        } else if (ast.isListBox(node)) {
            this.formatListBox(node);
        } else if (ast.isQuizBox(node)) {
            this.formatQuizBox(node);
        } else if (ast.isLiveQuizBox(node)) {
            this.formatLiveQuizBox(node);
        } else if (ast.isImageBox(node)) {
            this.formatImageBox(node);
        } else if (ast.isVideoBox(node)) {
            this.formatVideoBox(node);
        }
    }

    private formatModel(model: ast.Model): void {
        const formatter = this.getNodeFormatter(model);

        // Presentation keyword
        formatter.keyword('presentation').prepend(Formatting.noSpace());

        // Components section
        for (let i = 0; i < model.components.length; i++) {
            const component = model.components[i];
            if (i === 0) {
                formatter.node(component).prepend(Formatting.newLines(2));
            } else {
                formatter.node(component).prepend(Formatting.newLine());
            }
        }

        // Slides section
        for (let i = 0; i < model.slides.length; i++) {
            const slide = model.slides[i];
            if (i === 0 && model.components.length === 0) {
                formatter.node(slide).prepend(Formatting.newLines(2));
            } else {
                formatter.node(slide).prepend(Formatting.newLine());
            }
        }
    }

    private formatComponent(component: ast.Component): void {
        const formatter = this.getNodeFormatter(component);

        // Component keyword and name
        formatter.keyword('component').append(Formatting.oneSpace());

        // Opening brace
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.newLine());

        // Content with indentation
        formatter.node(component.content).prepend(Formatting.indent()).append(Formatting.newLine());

        // Closing brace
        formatter.keyword('}').prepend(Formatting.noIndent());
    }

    private formatSlide(slide: ast.Slide): void {
        const formatter = this.getNodeFormatter(slide);

        // Slide keyword and name
        formatter.keyword('slide').append(Formatting.oneSpace());

        // Opening brace
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.newLine());

        // Content boxes with indentation
        formatter.node(slide.content).prepend(Formatting.indent()).append(Formatting.newLine());

        // Closing brace
        formatter.keyword('}').prepend(Formatting.noIndent());
    }

    private formatContentBox(box: ast.ContentBox): void {
        const formatter = this.getNodeFormatter(box);

        // Attributes formatting
        if (box.attributes && box.attributes.length > 0) {
            formatter.keyword('[').prepend(Formatting.oneSpace()).append(Formatting.noSpace());
            formatter.keyword(']').prepend(Formatting.noSpace());
        }

        // Opening brace
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.newLine());

        // Nested boxes with indentation
        for (const nestedBox of box.boxes) {
            formatter.node(nestedBox).prepend(Formatting.indent()).append(Formatting.newLine());
        }

        // Closing brace
        formatter.keyword('}').prepend(Formatting.noIndent());
    }

    private formatTextBox(textBox: ast.TextBox): void {
        const formatter = this.getNodeFormatter(textBox);

        // Attributes formatting
        if (textBox.attributes && textBox.attributes.length > 0) {
            formatter.keyword('[').prepend(Formatting.oneSpace()).append(Formatting.noSpace());
            formatter.keyword(']').prepend(Formatting.noSpace());
        }

        // Content braces
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.noSpace());
        formatter.keyword('}').prepend(Formatting.noSpace());
    }

    private formatListBox(listBox: ast.ListBox): void {
        const formatter = this.getNodeFormatter(listBox);

        // Attributes formatting
        if (listBox.attributes && listBox.attributes.length > 0) {
            formatter.keyword('[').prepend(Formatting.oneSpace());
            formatter.keyword(']').prepend(Formatting.noSpace());
        }

        // Opening brace
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.newLine());

        // Closing brace
        formatter.keyword('}').prepend(Formatting.noIndent());
    }

    private formatQuizBox(quizBox: ast.QuizBox): void {
        const formatter = this.getNodeFormatter(quizBox);

        // Quiz keyword and id
        formatter.keyword('quiz').append(Formatting.oneSpace());

        // Opening brace
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.newLine());

        // Options (indented)
        for (const option of quizBox.options) {
            formatter.node(option).prepend(Formatting.indent()).append(Formatting.newLine());
        }

        // Closing brace
        formatter.keyword('}').prepend(Formatting.noIndent());
    }

    private formatLiveQuizBox(liveQuiz: ast.LiveQuizBox): void {
        const formatter = this.getNodeFormatter(liveQuiz);

        // LiveQuiz keyword and id
        formatter.keyword('livequiz').append(Formatting.oneSpace());

        // Opening brace
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.newLine());

        // Options (indented)
        for (const option of liveQuiz.options) {
            formatter.node(option).prepend(Formatting.indent()).append(Formatting.newLine());
        }

        // Closing brace
        formatter.keyword('}').prepend(Formatting.noIndent());
    }

    private formatImageBox(imageBox: ast.ImageBox): void {
        this.formatMediaBox(imageBox, 'image');
    }

    private formatVideoBox(videoBox: ast.VideoBox): void {
        this.formatMediaBox(videoBox, 'video');
    }

    private formatMediaBox(mediaBox: ast.ImageBox | ast.VideoBox, keyword: string): void {
        const formatter = this.getNodeFormatter(mediaBox);

        // Opening brace
        formatter.keyword('{').prepend(Formatting.oneSpace()).append(Formatting.newLine());

        // src and alt keywords with indentation
        formatter.keyword('src').prepend(Formatting.indent());
        formatter.keyword('alt').prepend(Formatting.indent());

        // Closing brace
        formatter.keyword('}').prepend(Formatting.noIndent());
    }
}
