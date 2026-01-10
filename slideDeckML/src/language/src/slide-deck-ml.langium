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
    'slide' id=ID '{'
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
    ComponentBoxReference | TextBox | QuizBox | ListBox; // Add new boxes here


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


/* Attributes */

Attribute:
    key='column' '=' value=INTEGER |
    key='height' '=' value=PERCENTAGE |
    key='font' '=' value=STRING |
    key='type' '=' value=LIST_TYPE |
    key='spaceBetweenItems' '=' value=INTEGER;
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
terminal SLOT_ID: /@[_a-zA-Z][\w_]*/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal TEXT: /{[^{}]*}/;
terminal STRING: /"[^"]*"/;
terminal PERCENTAGE: /(100|[0-9]{1,2})%/;
terminal INTEGER: /[0-9]+/;