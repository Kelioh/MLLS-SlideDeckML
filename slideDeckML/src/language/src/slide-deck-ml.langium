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
    content=(ComponentContentBox | ComponentSlot | TerminalBox);

ComponentContentBox:
    'box' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
        boxes+=ComponentBox+
    '}';

ComponentSlot:
    'slot' name=SLOT_ID;


/**********/
/* Slides */
/**********/

Slide:
    'slide' id=ID '{'
        content=Box
    '}';


/* Composite pattern for boxes */

Box:
    content=(ContentBox | TerminalBox);

ContentBox:
    'box' ('[' attributes+=Attribute (',' attributes+=Attribute)* ']')? '{'
        boxes+=Box+
    '}';

TerminalBox: 
    ComponentBoxReference | TextBox; // Add new boxes here


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
    key='font' '=' value=STRING;
    // Add new attributes here


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