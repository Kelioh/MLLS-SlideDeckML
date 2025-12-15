grammar SlideDeckMl

// TODO: Declare your grammar
// See doc : https://langium.org/docs/learn/workflow/write_grammar/

entry Model:
    'presentation' name=ID '{'
        slides+=Slide*
    '}';

Slide:
    TitleSlide | SimpleSlide;

TitleSlide:
    'title' title=STRING 'subtitle' subtitle=STRING;

SimpleSlide:
    'slide' title=STRING '{'
        content+=Content*
    '}';

Content:
    'text' text=STRING |
    'code' code=STRING;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal STRING: /"[^"]*"/;
