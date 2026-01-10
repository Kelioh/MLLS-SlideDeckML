grammar SlideDeckMl

entry Model:
    'presentation' name=ID
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
    'box' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
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
    'slide' id=ID ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
        content=Box
    '}';


/* Composite pattern for boxes */

Box:
    ContentBox | TerminalBox;

ContentBox:
    'box' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
        boxes+=Box+
    '}';

TerminalBox: 
    ComponentBoxReference | TextBox | QuizBox | ListBox | ImageBox | VideoBox; // Add new boxes here


/* Terminal boxes definitions */

ComponentBoxReference:
    reference=[Component:ID] ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? ('{'
        slots+=ComponentSlotReference*
    '}' | '{}');

ComponentSlotReference:
    name=SLOT_ID
    content=Box;


TextBox:
    'text' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? content=TEXT;

ImageBox:
    'image' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
        'src' src=IMAGE_URL
        'alt' alt=TEXT
    '}';

VideoBox:
    'video' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
        'src' src=VIDEO_URL
        'alt' alt=TEXT
    '}';

/* Attributes */

Attribute:
    key='column' '=' value=INTEGER |
    key='height' '=' value=PERCENTAGE |
    key='font' '=' value=STRING |
    key='type' '=' value=LIST_TYPE |
    key='spaceBetweenItems' '=' value=INTEGER |
    key='annotable' '=' value=BOOLEAN;
    // Add new attributes here

QuizBox:
    'quiz' id=ID '{'
        question=TEXT
        type=QUIZ_TYPE
        options+=QuizOption*
        correctAnswer=TEXT?
        revealResultsOnDemand?='revealResultsOnDemand'?
    '}';

ListBox:
    'list' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
        items+=TEXT+
    '}';

terminal LIST_TYPE: /(ordered|unordered)/;

terminal QUIZ_TYPE: /(mcq|short)/;

QuizOption:
    'option' id=ID content=TEXT;


/*************/
/* Terminals */
/*************/

hidden terminal WS: /\s+/;
terminal BOOLEAN: /true|false/;
terminal SLOT_ID: /@[_a-zA-Z][\w_]*/;
terminal VIDEO_URL: /\{([^{}]+\.(mp4|webm|ogg|mov|m4v)(\?[^}]*)?|https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^{}]*)\}/;
terminal IMAGE_URL: /\{[^{}]*\.(jpg|jpeg|png|gif|webp|svg|bmp)\}/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal TEXT: /{[^{}]*}/;
terminal STRING: /"[^"]*"/;
terminal PERCENTAGE: /(100|[0-9]{1,2})%/;
terminal INTEGER: /[0-9]+/;