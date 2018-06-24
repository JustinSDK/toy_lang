import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {ToyParser} from './interpreter/toy_parser.js';

export {Toy};

class Toy {
    constructor(env, fileName, code) {
        this.env = env;
        this.fileName = fileName;
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
        toy.env.output(`${e}\n\tat ${e.code} (${toy.fileName}:${e.lineNumber})`);
        throw e;
    }
}

function parseThenEval(toy) {
    const ast = parse(toy);
    try {
        const ctx = ast.evaluate(Context.initialize(toy.env, toy.fileName));
        if(ctx.thrownNode !== null) {
            ctx.output(`Thrown: ${ctx.thrownNode.value}`);
            printStackTrace(toy, ctx.thrownNode.lineNumbers);
        }
    }
    catch(e) {
        toy.env.output(`\n${e}`);
        if(e.lineNumbers) {
            printStackTrace(toy, e.lineNumbers);         
        }
        throw e;
    }
}

function printStackTrace(toy, lineNumbers) {
    const tokenizableLines = toy.tokenizer.tokenizableLines();
    lineNumbers.map(lineNumber => tokenizableLines.find(tokenizableLine => tokenizableLine.lineNumber === lineNumber))
               .map(tokenizableLine => `at ${tokenizableLine.value} (${toy.fileName}:${tokenizableLine.lineNumber})`)
               .forEach(line => toy.env.output(`\n\t${line}`));  
}