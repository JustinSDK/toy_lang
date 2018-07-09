import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {ToyParser} from './interpreter/toy_parser.js';
import {Instance} from './interpreter/ast/value.js';

export {Toy, ModuleLoader};

class ModuleLoader {
    constructor(toy, importAll = false) {
        this.toy = toy;
        this.importAll = importAll;
    }

    exportVariables(context) {
        this.toy.parse().evaluate(context);

        const exportsValue = context.variables.get('exports');
        const exports = new Set(exportsValue ? exportsValue.nativeValue().map(p => p.value) : []);
    
        return new Map(Array.from(context.variables.keys())
                            .filter(key => exports.has(key))
                            .map(key => [key, context.variables.get(key)]));
    }    

    loadTo(context) {
        const moduleContext = Context.initialize({
            env : this.toy.env, 
            fileName : this.toy.fileName, 
            moduleName : this.toy.moduleName,
            stmtMap : this.toy.stmtMap()
        });
        const exportVariables = this.exportVariables(moduleContext);

        context.variables.set(
            this.toy.moduleName, 
            new Instance(context.lookUpVariable('Module'), exportVariables, moduleContext)
        );

        if(this.importAll) {
            Array.from(exportVariables.entries())
                 .forEach(entry => context.variables.set(entry[0], entry[1]));
            context.deleteVariable(this.toy.moduleName);
        }
    }
}

class Toy {
    constructor(env, moduleName, code) {
        this.env = env;
        this.fileName = moduleName + '.toy';
        this.moduleName = moduleName;
        this.code = code;
        this.tokenizer = tokenizer(this);
    }

    parse() {
        try {
            return new ToyParser(this.env).parse(this.tokenizer);
        } catch(e) {
            this.env.output(`${e}\n\tat ${e.code} (${this.fileName}:${e.lineNumber})`);
            throw e;
        }
    }

    stmtMap() {
        return new Map(this.tokenizer.tokenizableLines()
                                     .map(tokenizableLine => [tokenizableLine.lineNumber, tokenizableLine.value]));
    }

    eval(ast, moduleLoaders = []) {
        try {
            const initContext = Context.initialize({
                env : this.env, 
                fileName : this.fileName, 
                moduleName : this.moduleName,
                stmtMap : this.stmtMap()
            });
            moduleLoaders.forEach(loader => loader.loadTo(initContext));
            
            const ctx = ast.evaluate(initContext);
            
            const thrown = ctx.thrownNode;
            if(thrown !== null) {
                const clzOfLang = thrown.value.clzOfLang;
                if(clzOfLang && thrown.value.hasOwnProperty('name') && clzOfLang.internalNode.hasMethod(ctx, 'printStackTrace')) {
                    ctx.output(`${thrown.value.getOwnProperty('name')}:`);
                    printStackTrace(this, thrown.stackTraceElements);
                }
                else {
                    ctx.output(`Thrown: ${thrown.value}`);
                    printStackTrace(this, thrown.stackTraceElements);
                }
            }
        }
        catch(e) {
            this.env.output(`\n${e}`);
            if(e.strackTraceElements) {
                printStackTrace(this, e.strackTraceElements);         
            }
            throw e;
        }
    }

    playWith(moduleLoaders) {
        const ast = this.parse();
        this.eval(ast, moduleLoaders);
    }

    play() {
        this.playWith([]);
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

function printStackTrace(toy, stackTraceElements) {
    stackTraceElements.map(elem => `at ${elem.statement} (${elem.fileName}:${elem.lineNumber})`)
                      .forEach(line => toy.env.output(`\n\t${line}`));  
}