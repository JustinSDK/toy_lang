import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {ToyParser} from './interpreter/toy_parser.js';

export {Toy};

class Toy {
    constructor(env, code) {
        this.env = env;
        this.code = code;
        this.tokenizer = tokenizer(this);
    }

    play() {
        parseThenEval(this);
    }
}

function tokenizer(toy) {
    try {
        return new Tokenizer(toy.code);
    } catch(e) {
        toy.env.output(`${e}\n\tat ${e.code} (line:${e.lineNumber})`);
        throw e;
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

function parseThenEval(toy) {
    try {
        parse(toy).evaluate(Context.initialize(toy.env));
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