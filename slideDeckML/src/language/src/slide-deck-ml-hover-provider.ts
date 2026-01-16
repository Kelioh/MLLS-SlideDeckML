import { AstNode, CstUtils, MaybePromise } from 'langium';
import { AstNodeHoverProvider, LangiumServices } from 'langium/lsp';
import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver';
import type { LangiumDocument } from 'langium';

import {
    Component,
    ComponentBoxReference,
    ContentBox,
    ImageBox,
    isComponent,
    isComponentBoxReference,
    isContentBox,
    isImageBox,
    isListBox,
    isLiveQuizBox,
    isQuizBox,
    isTextBox,
    isVideoBox,
    ListBox,
    LiveQuizBox,
    QuizBox,
    TextBox,
    VideoBox,
    ComponentBox,
    isComponentSlot,
    isComponentContentBox
} from './generated/ast.js';

/**
 * Custom hover provider for SlideDeckML.
 * Provides contextual documentation when hovering over language elements.
 */
export class SlideDeckMlHoverProvider extends AstNodeHoverProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    override async getHoverContent(document: LangiumDocument, params: HoverParams): Promise<Hover | undefined> {
        // 1) Default behavior (AST nodes like component names)
        const defaultHover = await super.getHoverContent(document, params);
        if (defaultHover) {
            return defaultHover;
        }

        // 2) Keyword hover (presentation/slide/box/text/...)
        const rootNode = document.parseResult?.value?.$cstNode;
        if (!rootNode) {
            return undefined;
        }

        const offset = document.textDocument.offsetAt(params.position);

        // Leaf = real token under mouse ("box", "slide", "{", etc.)
        const leaf = CstUtils.findLeafNodeAtOffset(rootNode, offset);
        if (!leaf) {
            return undefined;
        }

        const keywordContent = this.getKeywordDocumentationFromToken(leaf.text);
        if (!keywordContent) {
            return undefined;
        }

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: keywordContent
            }
        };
    }

    /**
     * Returns documentation for a keyword token (e.g. "box", "slide", ...).
     * We keep only the first word to be robust if the token text contains extra chars.
     */
    private getKeywordDocumentationFromToken(tokenText: string): string | undefined {
        const word = tokenText.trim().match(/^[a-zA-Z]+/)?.[0];
        if (!word) return undefined;

        switch (word) {
            case 'presentation':
                return `### Presentation

**Root element** of a SlideDeckML file.

Defines the name of your presentation.

**Example:**
\`\`\`
presentation MyPresentation
\`\`\``;

            case 'slide':
                return `### Slide

**Presentation slide** container.

Each slide represents one page in the presentation.

**Example:**
\`\`\`
slide intro {
    box {
        text {Welcome!}
    }
}
\`\`\``;

            case 'component':
                return `### Component

**Reusable component** definition.

Define once, use multiple times across slides.

**Example:**
\`\`\`
component Header {
    slot title
    box {
        text {My Header}
    }
}
\`\`\``;

            case 'box':
                return `### Content Box

**Container for other boxes** (layout component).

**Available Attributes:**
- \`column\`: Grid column span (1-12, standard grid system)
- \`height\`: Height percentage (0-100%)
- \`verticalAlignment\`: Vertical alignment (top, center, bottom)
- \`horizontalAlignment\`: Horizontal alignment (left, center, right)

**Example:**
\`\`\`
box [column=6, height=50%] {
    text {Left column}
}
\`\`\``;

            case 'text':
                return `### Text Box

**Display formatted text** in your slides.

**Available Attributes:**
- \`bold\`: Make text bold
- \`italic\`: Make text italic
- \`underline\`: Underline text
- \`strikethrough\`: Strikethrough text
- \`highlight\`: Highlight text
- \`color\`: Text color
- \`font\`: Font family

**Example:**
\`\`\`
text [bold, color=blue] {
    This is bold and blue text
}
\`\`\``;

            case 'image':
                return `### Image Box

**Display images** in your presentation.

**Required Attributes:**
- \`src\`: Image URL or file path
- \`alt\`: Alternative text (for accessibility)

**Optional Attributes:**
- \`scale\`: Scale factor (e.g., \`scale=0.5\`)

**Example:**
\`\`\`
image {
    src {https://example.com/image.jpg}
    alt {Description of the image}
}
\`\`\``;

            case 'video':
                return `### Video Box

**Embed videos** in your presentation.

**Required Attributes:**
- \`src\`: Video URL or file path (supports YouTube, local files)
- \`alt\`: Video description (for accessibility)

**Example:**
\`\`\`
video {
    src {https://youtube.com/watch?v=...}
    alt {Tutorial on DSL development}
}
\`\`\``;

            case 'list':
                return `### List Box

**Display ordered or unordered lists** in your slides.

**Types:**
- \`ordered\`: Numbered list (1, 2, 3...)
- \`unordered\`: Bullet points (default)

**Attributes:**
- \`spaceBetweenItems\`: Space between items in pixels

**Example:**
\`\`\`
list [spaceBetweenItems=20] {
    {First item}
    {Second item}
}
\`\`\``;

            case 'quiz':
                return `### Quiz

**Interactive quiz component** for audience engagement.

**Types:**
- \`mcq\`: Multiple choice quiz
- \`short\`: Short answer quiz

**Example:**
\`\`\`
quiz q1 {
    {What is 2 + 2?}
    mcq
    option a {3}
    option b {4}
    {b}
}
\`\`\``;

            case 'livequiz':
                return `### Live Quiz

**Real-time interactive quiz** with live audience participation.

**Required:**
- Question text
- Session ID (for real-time connection)
- Options (for multiple choice)
- \`correctAnswer\`

**Example:**
\`\`\`
livequiz lq1 {
    {What's your favorite color?}
    option a {Red}
    option b {Blue}
    {a}
    {session123}
}
\`\`\``;

            case 'slot':
                return `### Slot

**Placeholder** in a component for customizable content.

When using a component, fill slots with specific content.

**Example:**
\`\`\`
component Card {
    slot title
    slot content
}
\`\`\``;

            case 'option':
                return `### Option

**Answer option** for quiz questions.

Each option has an ID and content.

**Example:**
\`\`\`
option a {First choice}
option b {Second choice}
\`\`\``;

            default:
                return undefined;
        }
    }

    protected override getAstNodeHoverContent(node: AstNode): MaybePromise<string | undefined> {
        return this.getNodeDocumentation(node);
    }

    private getNodeDocumentation(node: AstNode): string | undefined {
        if (isComponent(node)) {
            return this.getComponentDocumentation(node);
        }
        if (isComponentBoxReference(node)) {
            return this.getComponentReferenceDocumentation(node);
        }
        if (isQuizBox(node)) {
            return this.getQuizDocumentation(node);
        }
        if (isLiveQuizBox(node)) {
            return this.getLiveQuizDocumentation(node);
        }
        if (isImageBox(node)) {
            return this.getImageDocumentation(node);
        }
        if (isVideoBox(node)) {
            return this.getVideoDocumentation(node);
        }
        if (isListBox(node)) {
            return this.getListDocumentation(node);
        }
        if (isTextBox(node)) {
            return this.getTextDocumentation(node);
        }
        if (isContentBox(node)) {
            return this.getContentBoxDocumentation(node);
        }
        return undefined;
    }

    private getComponentDocumentation(component: Component): string {
        const slots = this.collectSlots(component.content);
        const slotList = slots.length > 0
            ? slots.map(s => `- \`${s}\``).join('\n')
            : '_No slots defined_';

        return `### Component: \`${component.name}\`

**Reusable component** that can be instantiated in slides.

**Slots:**
${slotList}

**Usage:**
\`\`\`
component ${component.name} {
    slot slotName {Content}
}
\`\`\`

---
Components promote code reuse and maintain consistency across slides.`;
    }

    private getComponentReferenceDocumentation(ref: ComponentBoxReference): string {
        const componentName = ref.reference.ref?.name || 'Unknown';
        return `### Component Reference: \`${componentName}\`

**Instantiates** a reusable component.

**Available Attributes:**
- \`column\`: Grid column span (1-12)
- \`height\`: Height percentage (e.g., \`50%\`)
- \`backgroundColor\`: Background color
- \`padding\`: Padding value

---
Use slots to customize component content for each instance.`;
    }

    private getQuizDocumentation(quiz: QuizBox): string {
        const type = quiz.type || 'unknown';
        if (type === 'mcq') {
            return `### Quiz (Multiple Choice)

**Interactive quiz** with predefined answer options.

**Required:**
- Question text
- At least 2 options
- \`correctAnswer\` (option id)

**Example:**
\`\`\`
quiz q1 {
    {What is 2 + 2?}
    mcq
    option a {3}
    option b {4}
    option c {5}
    {b}
}
\`\`\`

---
Best Practice: Always provide a \`correctAnswer\` for immediate feedback.`;
        } else if (type === 'short') {
            return `### Quiz (Short Answer)

**Interactive quiz** with free-form text answer.

**Required:**
- Question text
- \`correctAnswer\` (expected text)

**Example:**
\`\`\`
quiz q1 {
    {What is the capital of France?}
    short
    {Paris}
}
\`\`\`

---
Short answer quizzes should NOT have \`option\` entries.`;
        }

        return `### Quiz

**Interactive quiz component** for audience engagement.

**Types:**
- \`mcq\`: Multiple choice quiz
- \`short\`: Short answer quiz

---
Quizzes enhance learning and engagement in presentations.`;
    }

    private getLiveQuizDocumentation(_liveQuiz: LiveQuizBox): string {
        return `### Live Quiz

**Real-time interactive quiz** with live audience participation.

**Required:**
- Question text
- Session ID (for real-time connection)
- Options (for multiple choice)
- \`correctAnswer\`

**Example:**
\`\`\`
livequiz lq1 {
    {What's your favorite color?}
    option a {Red}
    option b {Blue}
    {a}
    {session123}
}
\`\`\`

---
Live quizzes require a session ID to connect with the poll server.`;
    }

    private getImageDocumentation(_image: ImageBox): string {
        return `### Image Box

**Display images** in your presentation.

**Required Attributes:**
- \`src\`: Image URL or file path
- \`alt\`: Alternative text (for accessibility)

**Optional Attributes:**
- \`scale\`: Scale factor (e.g., \`scale=0.5\`)

**Example:**
\`\`\`
image {
    src {https://example.com/image.jpg}
    alt {Description of the image}
}
\`\`\`

---
**Accessibility**: Always provide descriptive \`alt\` text for screen readers.`;
    }

    private getVideoDocumentation(_video: VideoBox): string {
        return `### Video Box

**Embed videos** in your presentation.

**Required Attributes:**
- \`src\`: Video URL or file path (supports YouTube, local files)
- \`alt\`: Video description (for accessibility)

**Optional Attributes:**
- \`scale\`: Scale factor

**Example:**
\`\`\`
video {
    src {https://youtube.com/watch?v=...}
    alt {Tutorial on DSL development}
}
\`\`\`

---
Supports YouTube URLs and local video files (.mp4, .webm).`;
    }

    private getListDocumentation(_list: ListBox): string {
        return `### List Box

**Display ordered or unordered lists** in your slides.

**Types:**
- \`ordered\`: Numbered list (1, 2, 3...)
- \`unordered\`: Bullet points (default)

**Attributes:**
- \`spaceBetweenItems\`: Space between items in pixels (recommended: 10-30)

**Example:**
\`\`\`
list [spaceBetweenItems=20] {
    {First item}
    {Second item}
    {Third item}
}
\`\`\`

---
Lists must contain at least one non-empty item.`;
    }

    private getTextDocumentation(_text: TextBox): string {
        return `### Text Box

**Display formatted text** in your slides.

**Available Attributes:**
- \`bold\`: Make text bold
- \`italic\`: Make text italic
- \`underline\`: Underline text
- \`strikethrough\`: Strikethrough text
- \`highlight\`: Highlight text
- \`color\`: Text color
- \`font\`: Font family

**Fragment Styles:**
- \`*text*\`: Bold
- \`_text_\`: Italic
- \`~text~\`: Strikethrough

**Example:**
\`\`\`
text [bold, color=blue] {
    This is bold and blue text
}
\`\`\`

---
Text boxes support rich formatting with fragment styles and attributes.`;
    }

    private getContentBoxDocumentation(_box: ContentBox): string {
        return `### Content Box

**Container for other boxes** (layout component).

**Available Attributes:**
- \`column\`: Grid column span (1-12, standard grid system)
- \`height\`: Height percentage (0-100%)
- \`verticalAlignment\`: Vertical alignment (top, center, bottom)
- \`horizontalAlignment\`: Horizontal alignment (left, center, right)

**Example:**
\`\`\`
box [column=6, height=50%] {
    text {Left column}
}

box [column=6, height=50%] {
    text {Right column}
}
\`\`\`

---
Boxes use a 12-column grid system for responsive layouts.`;
    }

    private collectSlots(content: ComponentBox | undefined): string[] {
        const slots: string[] = [];
        if (!content) return slots;

        if (isComponentSlot(content)) {
            slots.push(content.name);
        } else if (isComponentContentBox(content)) {
            for (const box of content.boxes || []) {
                slots.push(...this.collectSlots(box));
            }
        }

        return slots;
    }
}
