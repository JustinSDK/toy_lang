import {PROGRAM_PARSER} from './program_parser.js';

export {ToyParser};

class ToyParser {
    constructor(environment) {  
        this.environment = environment;  
    }

    parse(tokenizer) {
        try {
            return new Interceptor(PROGRAM_PARSER).parse(tokenizer.tokenizableLines());
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

    parse(tokenizableLines) {
        try {
            return this.parser.parse(tokenizableLines);
        } 
        catch(ex) {
            if(ex instanceof SyntaxError) {
                throw ex;
            }
            
            throw new SyntaxError(`\n\t${tokenizableLines[0].toString()}`);
        }
    }
}

