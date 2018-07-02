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
        const stmtMap = new Map(toy.tokenizer.tokenizableLines()
                                 .map(tokenizableLine => [tokenizableLine.lineNumber, tokenizableLine.value]));

        const ctx = ast.evaluate(
            Context.initialize({
                env :toy.env, 
                fileName : toy.fileName, 
                stmtMap, 
                global : true
            })
        );
        
        const thrown = ctx.thrownNode;
        if(thrown !== null) {
            const clzOfLang = thrown.value.clzOfLang;
            if(clzOfLang && thrown.value.hasOwnProperty('name') && clzOfLang.internalNode.hasMethod(ctx, 'printStackTrace')) {
                ctx.output(`${thrown.value.getOwnProperty('name')}:`);
                printStackTrace(toy, thrown.stackTraceElements);
            }
            else {
                ctx.output(`Thrown: ${thrown.value}`);
                printStackTrace(toy, thrown.stackTraceElements);
            }
        }
    }
    catch(e) {
        toy.env.output(`\n${e}`);
        if(e.strackTraceElements) {
            printStackTrace(toy, e.strackTraceElements);         
        }
        throw e;
    }
}

function printStackTrace(toy, stackTraceElements) {
    stackTraceElements.map(elem => `at ${elem.statement} (${elem.fileName}:${elem.lineNumber})`)
                      .forEach(line => toy.env.output(`\n\t${line}`));  
}