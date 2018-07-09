import {LINE_PARSER} from './line_parser.js';

export {ToyParser};

class ToyParser {
    constructor(environment) {  
        this.environment = environment;  
    }

    parse(tokenizer) {
        return LINE_PARSER.parse(tokenizer.tokenizableLines());
    }
}

