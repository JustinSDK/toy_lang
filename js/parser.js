import {LINE_PARSERS} from './line_parsers.js';

export {Parser};

class Parser {
    constructor(environment) {  
        this.environment = environment;  
    }

    parse(tokenizer) {
        try {
            return LINE_PARSERS.get('sequence').parse(tokenizer.tokenizableLines());
        }
        catch(ex) {
            this.environment.output(ex);
            throw ex;
        }
    }
}


