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
    'box' '{'
        boxes+=(ComponentBox)+
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
    'box' '{'
        boxes+=Box+
    '}';

TerminalBox: 
    ComponentBoxReference | TextBox; // Add new boxes here


/* Terminal boxes definitions */

ComponentBoxReference:
    reference=[Component:ID] ('{'
        slots+=ComponentSlotReference*
    '}' | '{}');

ComponentSlotReference:
    name=SLOT_ID
    content=Box;


TextBox:
    'text' content=TEXT;


/*************/
/* Terminals */
/*************/

hidden terminal WS: /\s+/;
terminal SLOT_ID: /@[_a-zA-Z][\w_]*/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal TEXT: /{[^{}]*}/;