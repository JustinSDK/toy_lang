import {PROGRAM_PARSER} from './program_parser.js';

export {Parser};

class Parser {
    constructor(environment) {  
        this.environment = environment;  
    }

    parse(tokenizer) {
        try {
            return PROGRAM_PARSER.parse(tokenizer.tokenizableLines());
        }
        catch(ex) {
            this.environment.output(ex);
            throw ex;
        }
    }
}


