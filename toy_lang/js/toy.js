import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {ToyParser} from './interpreter/toy_parser.js';
import {Instance} from './interpreter/ast/value.js';

export {Toy, ModuleImporter};

class ModuleImporter {
    constructor(sourceModule, type = 'default') {
        this.sourceModule = sourceModule;
        this.type = type;
    }

    importTo(context) {
        const moduleInstance = this.sourceModule.moduleInstance();
        switch(this.type) {
            case 'all': // from '...' import *
                Array.from(moduleInstance.properties.entries())
                     .forEach(entry => context.variables.set(entry[0], entry[1]));
                break;
            default:   // import '....'
                context.variables.set(this.sourceModule.toy.moduleName, moduleInstance);
                break;
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

    moduleInstance() {
        const moduleContext = this.play();

        const exportsValue = moduleContext.variables.get('exports');
        const exports = new Set(exportsValue ? exportsValue.nativeValue().map(p => p.value) : []);
    
        const exportVariables = new Map(Array.from(moduleContext.variables.keys())
                                             .filter(key => exports.has(key))
                                             .map(key => [key, moduleContext.variables.get(key)]));

        return new Instance(moduleContext.lookUpVariable('Module'), exportVariables, moduleContext);
    }     

    eval(ast, importers = []) {
        const initContext = Context.initialize({
            env : this.env, 
            fileName : this.fileName, 
            moduleName : this.moduleName,
            stmtMap : this.stmtMap()
        });
        importers.forEach(importer => importer.importTo(initContext));

        try {
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
            return ctx;
        }
        catch(e) {
            this.env.output(`\n${e}`);
            if(e.strackTraceElements) {
                printStackTrace(this, e.strackTraceElements);         
            }
            throw e;
        }
    }

    playWith(importers) {
        const ast = this.parse();
        return this.eval(ast, importers);
    }

    play() {
        return this.playWith([]);
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