grammar SlideDeckMl

entry Model:
    'presentation' name=ID
    (theme=Theme)?
    (header=Header)?
    (footer=Footer)?
    components+=Component*
    slides+=Slide*;


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
    'box' ('[' attributes+=ContentBoxAttribute (',' attributes+=ContentBoxAttribute)* ']')? '{'
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
    'box' ('[' attributes+=ContentBoxAttribute (',' attributes+=ContentBoxAttribute)* ']')? '{'
        boxes+=Box+
    '}';

TerminalBox: 
    ComponentBoxReference | TextBox | QuizBox | ListBox | ImageBox | VideoBox | LiveQuizBox; // Add new boxes here


/* Terminal boxes definitions */

ComponentBoxReference:
    reference=[Component:ID] ('[' attributes+=ComponentBoxAttribute (',' attributes+=ComponentBoxAttribute)* ']')? ('{'
        slots+=ComponentSlotReference*
    '}' | '{}');

ComponentSlotReference:
    name=SLOT_ID
    content=Box;


TextBox:
    'text' ('[' attributes+=TextBoxAttribute (',' attributes+=TextBoxAttribute)* ']')? content=TEXT;


ListBox:
    'list' ('[' attributes+=ListBoxAttribute (',' attributes+=ListBoxAttribute)* ']')? '{'
        items+=TEXT+
    '}';


ImageBox:
    'image' ('[' attributes+=MediaBoxAttribute (',' attributes+=MediaBoxAttribute)* ']')? '{'
        'src' src=IMAGE_URL
        'alt' alt=TEXT
    '}';

VideoBox:
    'video' ('[' attributes+=MediaBoxAttribute (',' attributes+=MediaBoxAttribute)* ']')? '{'
        'src' src=VIDEO_URL
        'alt' alt=TEXT
    '}';


QuizBox:
    'quiz' id=ID '{'
        question=TEXT
        type=QUIZ_TYPE
        options+=QuizOption*
        correctAnswer=TEXT?
        revealResultsOnDemand?='revealResultsOnDemand'?
    '}';

LiveQuizBox:
    'livequiz' id=ID '{'
        question=TEXT
        options+=QuizOption*
        correctAnswer=TEXT?
        revealResultsOnDemand?='revealResultsOnDemand'?
        sessionId=TEXT
    '}';

QuizOption:
    'option' id=ID content=TEXT;


/* Attributes */

ComponentBoxAttribute:
    ContentBoxAttribute | TextBoxAttribute | ListBoxAttribute | MediaBoxAttribute;

SlideAttribute:
    key='non-annotable';

ContentBoxAttribute:
    key='fragment' '=' value=FRAGMENT_STYLE |
    key='column' '=' value=INTEGER |
    key='height' '=' value=PERCENTAGE |
    key='width' '=' value=PERCENTAGE |
    key='alignment' '=' value=STRING;

TextBoxAttribute:
    key='fragment' '=' value=FRAGMENT_STYLE |
    key='bold' |
    key='italic' |
    key='underline' |
    key='strikethrough' |
    key='highlight' |
    key='color' '=' value=STRING |
    key='font' '=' value=STRING |
    key='text-size' '=' value=STRING;

ListBoxAttribute:
    key='fragment' '=' value=FRAGMENT_STYLE |
    key='type' '=' value=LIST_TYPE |
    key='spaceBetweenItems' '=' value=INTEGER;

MediaBoxAttribute:
    key='fragment' '=' value=FRAGMENT_STYLE |
    key='scale' '=' value=PERCENTAGE;

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


/*********/
/* Theme */
/*********/

Theme:
    'theme' ('font' fontName=STRING)? ('primary' primaryColor=STRING)? ('logo' logo=STRING)?;


/*************/
/* Terminals */
/*************/

hidden terminal WS: /\s+/;
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