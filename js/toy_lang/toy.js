import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {ToyParser} from './interpreter/toy_parser.js';

export {Toy};

class Toy {
    constructor(env, code) {
        this.env = env;
        this.tokenizer = new Tokenizer(code);
    }

    play() {
        try {
            new ToyParser(this.env)
                   .parse(this.tokenizer)
                   .evaluate(Context.initialize(this.env));
        }
        catch(e) {
            this.env.output(`\n${e}`);
            if(e.lineNumbers) {
                const tokenizableLines = this.tokenizer.tokenizableLines();
                e.lineNumbers.map(lineNumber => tokenizableLines.find(tokenizableLine => tokenizableLine.lineNumber === lineNumber))
                             .map(tokenizableLine => `at ${tokenizableLine.value} (main.toy:${tokenizableLine.lineNumber})`)
                             .forEach(line => this.env.output(`\n\t${line}`));                              
            }
            throw e;
        }
    }
}