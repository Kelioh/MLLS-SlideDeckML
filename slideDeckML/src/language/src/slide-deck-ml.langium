grammar SlideDeckMl

// TODO: Declare your grammar
// See doc : https://langium.org/docs/learn/workflow/write_grammar/

entry Model:
    'presentation' name=ID
    slides+=Slide*;

Slide:
    'slide' id=ID '{'
        ('header' header=Header)?
        'body' body=Body
        ('footer' footer=Footer)?
    '}';

Header:
    '{'
        box=Box
    '}';

Body:
    '{'
        box=Box
    '}';

Footer:
    '{'
        box=Box
    '}';

Box:
    content=(TextBox | ContentBox);

ContentBox:
    'box' '{'
        boxes+=Box+
    '}';

TextBox:
    'text' text=STRING;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"[^"]*"/;
