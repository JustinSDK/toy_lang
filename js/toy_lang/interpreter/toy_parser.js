import {LINE_PARSER} from './line_parser.js';

export {ToyParser};

class ToyParser {
    constructor(environment) {  
        this.environment = environment;  
    }

    parse(tokenizer) {
        return new Interceptor(LINE_PARSER).parse(tokenizer.tokenizableLines());
    }
}

class Interceptor {
    constructor(parser) {
        this.parser = parser;
    }

    parse(tokenableLines) {
        try {
            return this.parser.parse(tokenableLines);
        } 
        catch(ex) {
            if(ex instanceof SyntaxError) {
                throw ex;
            }
            tokenableLines[0].syntaxErr('illegal start of expression');
        }
    }
}

