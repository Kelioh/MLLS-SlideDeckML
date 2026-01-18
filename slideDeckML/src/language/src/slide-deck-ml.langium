grammar SlideDeckMl

entry Model:
    'presentation' name=ID
    (theme=Theme)?
    (header=Header)?
    (footer=Footer)?
    components+=Component*
    slides+=Slide*;


/*********/
/* Theme */
/*********/

Theme:
    'theme' ('font' fontName=STRING)? ('primary' primaryColor=STRING)? ('logo' logo=STRING)?;


/*******************/
/* Header & Footer */
/*******************/

Header:
    'header' ('bg' background=STRING)? ('color' color=STRING)? ('size' fontSize=STRING)? '{'
        content=Box
    '}';

Footer:
    'footer' ('bg' background=STRING)? ('color' color=STRING)? ('size' fontSize=STRING)? '{'
        content=Box
    '}';


/**************************/
/* Component declarations */
/**************************/

Component:
    'component' name=ID '{'
        content=ComponentBox
    '}';


/* Composite pattern for component boxes */

ComponentBox:
    ComponentContentBox | ComponentSlot | TerminalBox;

ComponentContentBox:
    'box' ('[' attributes+=(CommonAttribute | ContentAttribute) (',' attributes+=(CommonAttribute | ContentAttribute))* ']')? '{'
        boxes+=ComponentBox+
    '}';

ComponentSlot:
    'slot' name=SLOT_ID ('{'
        content=Box
    '}' | '{}');


/**********/
/* Slides */
/**********/

Slide:
    'slide' id=ID ('[' attributes+=SlideAttribute (',' attributes+=SlideAttribute)* ']')? '{'
        (header=Header)?
        (footer=Footer)?
        content=Box
    '}';


/* Composite pattern for boxes */

Box:
    ContentBox | TerminalBox;

ContentBox:
    'box' ('[' attributes+=(CommonAttribute | ContentAttribute) (',' attributes+=(CommonAttribute | ContentAttribute))* ']')? '{'
        boxes+=Box+
    '}';

TerminalBox: 
    ComponentBoxReference | TextBox | QuizBox | ListBox | ImageBox | VideoBox | LiveQuizBox | CodeBox | MathematicalBox; // Add new boxes here


/* Terminal boxes definitions */

ComponentBoxReference:
    reference=[Component:ID] ('[' attributes+=ComponentReferenceAttribute (',' attributes+=ComponentReferenceAttribute)* ']')? ('{'
        slots+=ComponentSlotReference*
    '}' | '{}');

ComponentSlotReference:
    name=SLOT_ID
    content=Box;


TextBox:
    'text' ('[' attributes+=(CommonAttribute | TextAttribute) (',' attributes+=(CommonAttribute | TextAttribute))* ']')? content=TEXT;


ListBox:
    'list' ('[' attributes+=(CommonAttribute | ListAttribute) (',' attributes+=(CommonAttribute | ListAttribute))* ']')? '{'
        items+=TEXT+
    '}';


ImageBox:
    'image' ('[' attributes+=(CommonAttribute | MediaAttribute) (',' attributes+=(CommonAttribute | MediaAttribute))* ']')? '{'
        'src' src=IMAGE_URL
        'alt' alt=TEXT
    '}';

VideoBox:
    'video' ('[' attributes+=(CommonAttribute | MediaAttribute) (',' attributes+=(CommonAttribute | MediaAttribute))* ']')? '{'
        'src' src=VIDEO_URL
        'alt' alt=TEXT
    '}';


QuizBox:
    'quiz' ('[' attributes+=(CommonAttribute) (',' attributes+=(CommonAttribute))* ']')? id=ID '{'
        question=TEXT
        type=QUIZ_TYPE
        options+=QuizOption*
        correctAnswer=TEXT?
        revealResultsOnDemand?='revealResultsOnDemand'?
    '}';

LiveQuizBox:
    'livequiz' ('[' attributes+=(CommonAttribute) (',' attributes+=(CommonAttribute))* ']')? id=ID '{'
        question=TEXT
        options+=QuizOption*
        correctAnswer=TEXT?
        revealResultsOnDemand?='revealResultsOnDemand'?
        sessionId=TEXT
    '}';

QuizOption:
    'option' id=ID content=TEXT;


CodeBox:
    'code' ('[' attributes+=(CommonAttribute | TextAttribute) (',' attributes+=(CommonAttribute | TextAttribute))* ']')? '{'
        language=STRING
        code=CODE
        lines+=CodeLineBox*
    '}';

CodeLineBox:
    'line' '{'
        start=INTEGER ('..' end=INTEGER)?
        image=ImageBox
    '}';


MathematicalBox:
    'mathematics' ('[' attributes+=(CommonAttribute | TextAttribute) (',' attributes+=(CommonAttribute | TextAttribute))* ']')? content=MATH_EXPR;


/**************/
/* Attributes */
/**************/

SlideAttribute:
    key='non-annotable';


ComponentReferenceAttribute:
    CommonAttribute | ContentAttribute | TextAttribute | ListAttribute | MediaAttribute;


CommonAttribute:
    key='fragment' '=' value=FRAGMENT_STYLE |
    key='height' '=' value=PERCENTAGE |
    key='alignment' '=' value=STRING |
    key='width' '=' value=PERCENTAGE;


ContentAttribute:
    key='column' '=' value=INTEGER;


TextAttribute:
    key='bold' |
    key='italic' |
    key='underline' |
    key='strikethrough' |
    key='highlight' |
    key='color' '=' value=STRING |
    key='font' '=' value=STRING |
    key='text-size' '=' value=STRING;


ListAttribute:
    key='type' '=' value=LIST_TYPE |
    key='spaceBetweenItems' '=' value=INTEGER;


MediaAttribute:
    key='scale' '=' value=PERCENTAGE;


/*************/
/* Terminals */
/*************/

hidden terminal WS: /\s+/;
terminal MATH_EXPR: /\$\$[\s\S]*?\$\$/;
terminal FRAGMENT_STYLE: /(fade-in|fade-up|fade-down|fade-left|fade-right|fade-in-then-out|fade-in-then-semi-out|grow|shrink|strike|highlight-red|highlight-green|highlight-blue|current-visible|semi-fade-out)/;
terminal LIST_TYPE: /(ordered|unordered)/;
terminal QUIZ_TYPE: /(mcq|short)/;
terminal BOOLEAN: /true|false/;
terminal SLOT_ID: /@[_a-zA-Z][\w_]*/;
terminal VIDEO_URL: /\{([^{}]+\.(mp4|webm|ogg|mov|m4v)(\?[^}]*)?|https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^{}]*)\}/;
terminal IMAGE_URL: /\{[^{}]*\.(jpg|jpeg|png|gif|webp|svg|bmp)\}/;
terminal STRING: /"[^"]*"/;
terminal PERCENTAGE: /(100|[0-9]{1,2})%/;
terminal INTEGER: /[0-9]+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal TEXT: /{[^{}]*}/;
terminal CODE: /```[^]*?```/;