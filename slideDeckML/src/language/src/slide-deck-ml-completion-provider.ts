import { MaybePromise } from 'langium';
import { CompletionAcceptor, CompletionContext, DefaultCompletionProvider, NextFeature } from 'langium/lsp';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

/**
 * Custom completion provider for SlideDeckML.
 * Provides context-aware code completions and snippets.
 */
export class SlideDeckMlCompletionProvider extends DefaultCompletionProvider {

    override completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): MaybePromise<void> {
        // Add custom completions based on context
        this.addCustomCompletions(context, acceptor);
        // Call parent for default completions
        return super.completionFor(context, next, acceptor);
    }

    private addCustomCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const text = context.textDocument.getText();
        const offset = context.offset;

        // Add contextual completions
        if (this.isInSlideContext(text, offset)) {
            this.addBoxCompletions(context, acceptor);
        }

        if (this.isInBoxContext(text, offset)) {
            this.addBoxContentCompletions(context, acceptor);
        }

        if (this.isInAttributeContext(text, offset)) {
            this.addAttributeCompletions(context, acceptor);
        }

        // Always add snippet completions
        this.addSnippetCompletions(context, acceptor);
    }

    private isInSlideContext(text: string, offset: number): boolean {
        const beforeCursor = text.substring(0, offset);
        return /slide\s+\w+\s*\{[^}]*$/.test(beforeCursor);
    }

    private isInBoxContext(text: string, offset: number): boolean {
        const beforeCursor = text.substring(0, offset);
        return /box\s*(?:\[[^\]]*\])?\s*\{[^}]*$/.test(beforeCursor);
    }

    private isInAttributeContext(text: string, offset: number): boolean {
        const beforeCursor = text.substring(0, offset);
        return /\[[^\]]*$/.test(beforeCursor);
    }

    private addBoxCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        acceptor(context, {
            label: 'box',
            kind: CompletionItemKind.Keyword,
            detail: 'Container box for layout',
            documentation: 'Creates a container box that can hold other elements. Supports grid layout attributes.',
            insertText: 'box {\n\t$0\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_box'
        });

        acceptor(context, {
            label: 'text',
            kind: CompletionItemKind.Keyword,
            detail: 'Text content',
            documentation: 'Adds text content with support for formatting (bold, italic, etc.)',
            insertText: 'text {$0}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_text'
        });

        acceptor(context, {
            label: 'image',
            kind: CompletionItemKind.Keyword,
            detail: 'Image element',
            documentation: 'Embeds an image with src and alt attributes',
            insertText: 'image {\n\tsrc {${1:image.jpg}}\n\talt {${2:Description}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_image'
        });

        acceptor(context, {
            label: 'video',
            kind: CompletionItemKind.Keyword,
            detail: 'Video element',
            documentation: 'Embeds a video with src and alt attributes',
            insertText: 'video {\n\tsrc {${1:video.mp4}}\n\talt {${2:Description}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_video'
        });

        acceptor(context, {
            label: 'list',
            kind: CompletionItemKind.Keyword,
            detail: 'List element',
            documentation: 'Creates an ordered or unordered list',
            insertText: 'list {\n\t{${1:Item 1}}\n\t{${2:Item 2}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_list'
        });

        acceptor(context, {
            label: 'quiz',
            kind: CompletionItemKind.Keyword,
            detail: 'Quiz element',
            documentation: 'Creates an interactive quiz (MCQ or short answer)',
            insertText: 'quiz ${1:q1} {\n\t{${2:Question?}}\n\tmcq\n\toption a {${3:Option A}}\n\toption b {${4:Option B}}\n\t{${5:a}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_quiz'
        });

        acceptor(context, {
            label: 'livequiz',
            kind: CompletionItemKind.Keyword,
            detail: 'Live quiz element',
            documentation: 'Creates a real-time interactive quiz',
            insertText: 'livequiz ${1:lq1} {\n\t{${2:Question?}}\n\toption a {${3:Option A}}\n\toption b {${4:Option B}}\n\t{${5:a}}\n\t{${6:session123}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_livequiz'
        });

        acceptor(context, {
            label: 'code',
            kind: CompletionItemKind.Keyword,
            detail: 'Code block element',
            documentation: 'Displays syntax-highlighted code with optional line annotations',
            insertText: 'code {\n\t"${1:javascript}"\n\t\\`\\`\\`\n\t${2:// Your code here}\n\t\\`\\`\\`\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_code'
        });

        acceptor(context, {
            label: 'mathematics',
            kind: CompletionItemKind.Keyword,
            detail: 'Mathematical expression',
            documentation: 'Displays LaTeX mathematical expressions using KaTeX/MathJax',
            insertText: 'mathematics \\$\\$${1:E = mc^2}\\$\\$',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_mathematics'
        });
    }

    private addBoxContentCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        // Reuse box completions
        this.addBoxCompletions(context, acceptor);

        acceptor(context, {
            label: 'component',
            kind: CompletionItemKind.Reference,
            detail: 'Component reference',
            documentation: 'References a reusable component',
            insertText: 'component ${1:ComponentName} {\n\tslot ${2:slotName} {${3:Content}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_component'
        });
    }

    private addAttributeCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        // ContentBox attributes
        acceptor(context, {
            label: 'column',
            kind: CompletionItemKind.Property,
            detail: 'Grid column span (1-12)',
            documentation: 'Specifies how many columns this element should span in the 12-column grid',
            insertText: 'column=${1:6}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_column'
        });

        acceptor(context, {
            label: 'height',
            kind: CompletionItemKind.Property,
            detail: 'Height percentage (0-100%)',
            documentation: 'Sets the height as a percentage of the container',
            insertText: 'height=${1:50}%',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_height'
        });

        acceptor(context, {
            label: 'verticalAlignment',
            kind: CompletionItemKind.Property,
            detail: 'Vertical alignment (top, center, bottom)',
            documentation: 'Sets the vertical alignment of content',
            insertText: 'verticalAlignment=${1|top,center,bottom|}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_verticalAlignment'
        });

        acceptor(context, {
            label: 'horizontalAlignment',
            kind: CompletionItemKind.Property,
            detail: 'Horizontal alignment (left, center, right)',
            documentation: 'Sets the horizontal alignment of content',
            insertText: 'horizontalAlignment=${1|left,center,right|}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '0_horizontalAlignment'
        });

        // TextBox attributes
        acceptor(context, {
            label: 'bold',
            kind: CompletionItemKind.Property,
            detail: 'Bold text style',
            documentation: 'Makes the text bold',
            insertText: 'bold',
            sortText: '1_bold'
        });

        acceptor(context, {
            label: 'italic',
            kind: CompletionItemKind.Property,
            detail: 'Italic text style',
            documentation: 'Makes the text italic',
            insertText: 'italic',
            sortText: '1_italic'
        });

        acceptor(context, {
            label: 'underline',
            kind: CompletionItemKind.Property,
            detail: 'Underline text style',
            documentation: 'Underlines the text',
            insertText: 'underline',
            sortText: '1_underline'
        });

        acceptor(context, {
            label: 'strikethrough',
            kind: CompletionItemKind.Property,
            detail: 'Strikethrough text style',
            documentation: 'Adds strikethrough to the text',
            insertText: 'strikethrough',
            sortText: '1_strikethrough'
        });

        acceptor(context, {
            label: 'highlight',
            kind: CompletionItemKind.Property,
            detail: 'Highlight text style',
            documentation: 'Highlights the text with a background color',
            insertText: 'highlight',
            sortText: '1_highlight'
        });

        acceptor(context, {
            label: 'color',
            kind: CompletionItemKind.Property,
            detail: 'Text color',
            documentation: 'Sets the text color',
            insertText: 'color=${1:black}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '1_color'
        });

        acceptor(context, {
            label: 'font',
            kind: CompletionItemKind.Property,
            detail: 'Font family',
            documentation: 'Sets the font family',
            insertText: 'font=${1:Arial}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '1_font'
        });

        // ListBox attributes
        acceptor(context, {
            label: 'type',
            kind: CompletionItemKind.Property,
            detail: 'List type (ordered, unordered)',
            documentation: 'Sets the list type',
            insertText: 'type=${1|ordered,unordered|}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '1_type'
        });

        acceptor(context, {
            label: 'spaceBetweenItems',
            kind: CompletionItemKind.Property,
            detail: 'Space between list items (px)',
            documentation: 'Sets the spacing between list items in pixels (recommended: 10-30)',
            insertText: 'spaceBetweenItems=${1:20}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '1_spaceBetweenItems'
        });

        // Media attributes
        acceptor(context, {
            label: 'scale',
            kind: CompletionItemKind.Property,
            detail: 'Scale factor',
            documentation: 'Sets the scale factor for images/videos (e.g., 0.5 for 50%)',
            insertText: 'scale=${1:1.0}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '1_scale'
        });
    }

    private addSnippetCompletions(context: CompletionContext, acceptor: CompletionAcceptor): void {
        acceptor(context, {
            label: 'slide-basic',
            kind: CompletionItemKind.Snippet,
            detail: 'Basic slide template',
            documentation: 'Creates a basic slide with title and content',
            insertText: 'slide ${1:slideName} {\n\tbox {\n\t\ttext {${2:Slide Title}}\n\t\t\n\t\ttext {${3:Content}}\n\t}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '9_slide-basic'
        });

        acceptor(context, {
            label: 'slide-two-columns',
            kind: CompletionItemKind.Snippet,
            detail: 'Two-column slide layout',
            documentation: 'Creates a slide with two equal columns',
            insertText: 'slide ${1:slideName} {\n\tbox {\n\t\ttext {${2:Slide Title}}\n\t}\n\t\n\tbox [column=6] {\n\t\ttext {${3:Left column}}\n\t}\n\t\n\tbox [column=6] {\n\t\ttext {${4:Right column}}\n\t}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '9_slide-two-columns'
        });

        acceptor(context, {
            label: 'component-template',
            kind: CompletionItemKind.Snippet,
            detail: 'Component template',
            documentation: 'Creates a reusable component with slots',
            insertText: 'component ${1:ComponentName} {\n\tslot ${2:slotName}\n\t\n\tbox {\n\t\ttext {Component Template}\n\t}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '9_component-template'
        });

        acceptor(context, {
            label: 'quiz-mcq',
            kind: CompletionItemKind.Snippet,
            detail: 'Multiple choice quiz',
            documentation: 'Creates a multiple choice quiz',
            insertText: 'quiz ${1:quizId} {\n\t{${2:Question?}}\n\tmcq\n\toption a {${3:Option A}}\n\toption b {${4:Option B}}\n\toption c {${5:Option C}}\n\t{${6:a}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '9_quiz-mcq'
        });

        acceptor(context, {
            label: 'quiz-short',
            kind: CompletionItemKind.Snippet,
            detail: 'Short answer quiz',
            documentation: 'Creates a short answer quiz',
            insertText: 'quiz ${1:quizId} {\n\t{${2:Question?}}\n\tshort\n\t{${3:Answer}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '9_quiz-short'
        });

        acceptor(context, {
            label: 'image-template',
            kind: CompletionItemKind.Snippet,
            detail: 'Image template',
            documentation: 'Inserts an image with proper accessibility',
            insertText: 'image {\n\tsrc {${1:https://example.com/image.jpg}}\n\talt {${2:Description of the image}}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '9_image-template'
        });

        acceptor(context, {
            label: 'presentation-template',
            kind: CompletionItemKind.Snippet,
            detail: 'Full presentation template',
            documentation: 'Creates a complete presentation structure',
            insertText: 'presentation ${1:PresentationName}\n\nslide intro {\n\tbox {\n\t\ttext {${2:Title}}\n\t\ttext {${3:Subtitle}}\n\t}\n}\n\nslide content {\n\tbox {\n\t\ttext {${4:Content}}\n\t}\n}\n\nslide conclusion {\n\tbox {\n\t\ttext {${5:Thank You!}}\n\t}\n}',
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: '9_presentation-template'
        });
    }
}
