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
        evaluate(this, parse(this));
    }
}

function parse(toy) {
    try {
        return new ToyParser(toy.env).parse(toy.tokenizer);
    } catch(e) {
        toy.env.output(`${e}\n\tat ${e.code} (line:${e.lineNumber})`);
        throw e;
    }
}

function evaluate(toy, ast) {
    try {
        ast.evaluate(Context.initialize(toy.env));
    }
    catch(e) {
        toy.env.output(`\n${e}`);
        if(e.lineNumbers) {
            const tokenizableLines = toy.tokenizer.tokenizableLines();
            e.lineNumbers.map(lineNumber => tokenizableLines.find(tokenizableLine => tokenizableLine.lineNumber === lineNumber))
                         .map(tokenizableLine => `at ${tokenizableLine.value} (line:${tokenizableLine.lineNumber})`)
                         .forEach(line => toy.env.output(`\n\t${line}`));                              
        }
        throw e;
    }
}