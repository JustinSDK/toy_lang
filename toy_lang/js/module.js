
import {LINE_PARSER} from './interpreter/line_parser.js';
import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {Instance} from './interpreter/ast/value.js';

export {Module, ModuleImporter};

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
                context.variables.set(this.sourceModule.moduleName, moduleInstance);
                break;
        }
    }
}


let environment;

class Module {
    constructor(fileName, moduleName, notImports, importers = []) {
        this.fileName = fileName;
        this.moduleName = moduleName;
        this.notImports = notImports;
        this.importers = importers;
    }
    
    static initialize(env) {
        environment = env;
        const builtinToy = 'toy_lang/lib/builtin.toy';
        return env.read(builtinToy)
                  .then(pathCode => new Module(pathCode[0], 'builtin', tokenizer(pathCode[1]).tokenizableLines()))
                  .then(module => module.moduleInstance())
                  .then(moduleInstance => {
                      Array.from(moduleInstance.properties.entries())
                           .forEach(entry => Context.addToBuiltins(entry[0], entry[1]));
                      return moduleInstance;
                  })
                  .catch(err => environment.output(`${err.message}\n`)); 
    }

    static main(code) {
        const lines = tokenizer(code).tokenizableLines();
        const notImports = notImportTokenizableLines(lines);
        const imports = importTokenizableLines(lines);

        if(imports.length !== 0) {
            const importPromises = imports.map(tokenizableLine => tokenizableLine.tryTokenables('import'))
                                          .map(tokenables => readModuleFile(`${tokenables[0].value}.toy`));
        
            Promise.all(importPromises)
                   .then(pathCodes => {
                        const importers = pathCodes.map(pathCode => {
                            const path = pathCode[0];
                            const code = pathCode[1];
                            const moduleName = path.replace('.toy', '').split('/').slice(-1)[0];
                            return new ModuleImporter(
                                new Module(path, moduleName, tokenizer(code).tokenizableLines())
                            );
                        });

                        new Module('main.toy', 'main', notImports, importers).play();
                   })
                   .catch(err => {
                        environment.output(`${err.message}\n`);
                   });
        }
        else {
            new Module('main.toy', 'main', notImports).play();
        }        
    }

    parse() {
        try {
            return LINE_PARSER.parse(this.notImports);
        } catch(e) {
            environment.output(`${e}\n\tat ${e.code} (${this.fileName}:${e.lineNumber})`);
            throw e;
        }
    }

    lines() {
        return new Map(
            this.notImports
                .map(tokenizableLine => [tokenizableLine.lineNumber, tokenizableLine.value])
        );
    }

    moduleInstance() {
        const moduleContext = this.play();
        const exportsValue = moduleContext.variables.get('exports');
        const exports = new Set(exportsValue ? exportsValue.nativeValue().map(p => p.value) : []);
        const exportVariables = new Map(
            Array.from(moduleContext.variables.keys())
                 .filter(key => exports.has(key))
                 .map(key => [key, moduleContext.variables.get(key)])
        );

        return new Instance(moduleContext.lookUpVariable('Module'), exportVariables, this);
    }     

    play() {
        const context = Context.initialize({
            env : environment, 
            fileName : this.fileName, 
            moduleName : this.moduleName,
            lines : this.lines()
        });
        this.importers.forEach(importer => importer.importTo(context));

        return this.eval(context, this.parse());
    }

    eval(context, ast) {
        try {
            const ctx = ast.evaluate(context);
            const thrown = ctx.thrownNode;
            if(thrown !== null) {
                const clzOfLang = thrown.value.clzOfLang;
                if(clzOfLang && thrown.value.hasOwnProperty('name') && clzOfLang.internalNode.hasMethod(ctx, 'printStackTrace')) {
                    ctx.output(`${thrown.value.getOwnProperty('name')}:`);
                }
                else {
                    ctx.output(`Thrown: ${thrown.value}`);
                }
                printStackTrace(thrown.stackTraceElements);
            }
            return ctx;
        }
        catch(e) {
            environment.output(`\n${e}`);
            if(e.strackTraceElements) {
                printStackTrace(e.strackTraceElements);         
            }
            throw e;
        }
    }
}

function readModuleFile(fileName) {
    return environment.read(
        fileName.startsWith('/') ? 
            `${environment.TOY_MODUEL_PATH}${fileName}` : fileName
    );
}

function tokenizer(code) {
    try {
        return new Tokenizer(code);
    } catch(e) {
        environment.output(`${e}\n\tat ${e.code} (line:${e.lineNumber})`);
        throw e;
    }
}

function notImportTokenizableLines(tokenizableLines) {
    if(tokenizableLines.length === 0) {
        return [];
    }
    if(tokenizableLines[0].value.startsWith('import')) {
        return notImportTokenizableLines(tokenizableLines.slice(1));
    }
    return tokenizableLines;
}

function importTokenizableLines(tokenizableLines) {
    if(tokenizableLines.length === 0 || !tokenizableLines[0].value.startsWith('import')) {
        return [];
    }
    return [tokenizableLines[0]].concat(importTokenizableLines(tokenizableLines.slice(1)));
}

function printStackTrace(stackTraceElements) {
    stackTraceElements.map(elem => `at ${elem.statement} (${elem.fileName}:${elem.lineNumber})`)
                      .forEach(line => environment.output(`\n\t${line}`));  
}