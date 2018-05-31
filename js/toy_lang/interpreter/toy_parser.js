import {LINE_PARSER} from './line_parser.js';

export {ToyParser};

class ToyParser {
    constructor(environment) {  
        this.environment = environment;  
    }

    parse(tokenizer) {
        try {
            return new Interceptor(LINE_PARSER).parse(tokenizer.tokenizableLines());
        }
        catch(ex) {
            this.environment.output(ex);
            throw ex;
        }
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
            
            throw new SyntaxError(`\n\t${tokenableLines[0].toString()}`);
        }
    }
}

