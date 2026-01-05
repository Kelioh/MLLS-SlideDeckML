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
        (header=Header)?
        (footer=Footer)?
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
    ComponentBoxReference | TextBox | QuizBox; // Add new boxes here


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

QuizBox:
    'quiz' id=ID '{'
        question=TEXT
        type=QUIZ_TYPE
        options+=QuizOption*
        correctAnswer=TEXT?
        revealResultsOnDemand?='revealResultsOnDemand'?
    '}';

terminal QUIZ_TYPE: /(mcq|short)/;

QuizOption:
    'option' id=ID content=TEXT;


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

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
hidden terminal WS: /\s+/;

terminal STRING: /"[^"]*"|'[^']*'/;
terminal SLOT_ID: /@[_a-zA-Z][\w_]*/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal TEXT: /{[^{}]*}/;