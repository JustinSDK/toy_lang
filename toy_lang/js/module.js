
import {LINE_PARSER} from './interpreter/line_parser.js';
import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {Instance} from './interpreter/ast/value.js';

export {Module, ModuleImporter};

class ModuleImporter {
    constructor(sourceModule, type = 'default', name) {
        this.sourceModule = sourceModule;
        this.type = type;
        this.name = name;
    }

    importTo(context) {
        const moduleInstance = this.sourceModule.moduleInstance();
        switch(this.type) {
            case 'variableName':   // from '...' import foo
                context.variables.set(this.name, moduleInstance.properties.get(this.name));
                break;
            case 'all':            // from '...' import *
                Array.from(moduleInstance.properties.entries())
                     .forEach(entry => context.variables.set(entry[0], entry[1]));
                break;
            case 'moduleName':     // import '...' as name
                context.variables.set(this.name, moduleInstance);
                break;
            default:               // import '....'
                context.variables.set(this.sourceModule.moduleName, moduleInstance);
                break;
        }
    }
}

const modules = new Map();

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
                  .then(([path, code]) => new Module(path, 'builtin', tokenizer(code).tokenizableLines()))
                  .then(module => module.moduleInstance())
                  .then(moduleInstance => {
                      Array.from(moduleInstance.properties.entries())
                           .forEach(entry => Context.addToBuiltins(entry[0], entry[1]));
                      return moduleInstance;
                  })
                  .catch(err => environment.output(`${err.message}\n`)); 
    }

    static run(fileName, code) {
        const lines = tokenizer(code).tokenizableLines();
        const notImports = notImportTokenizableLines(lines);
        const imports = importTokenizableLines(lines)
                           .reduce((acc, line) => 
                               acc.some(ln => ln.value === line.value) ? acc : acc.concat([line]), []
                            );

        if(imports.length !== 0) {
            runWith(fileName, notImports, imports);
        }
        else {
            new Module(fileName, moduleNameFrom(fileName), notImports).play();
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
        return this.instance ? this.instance : this.play();
    }     

    play() {
        const context = Context.initialize(environment, this);
        this.importers.forEach(importer => importer.importTo(context));

        // run module itself
        const moduleContext = this.eval(context, this.parse());
        const exportsValue = moduleContext.variables.get('exports');
        const exports = new Set(exportsValue ? exportsValue.nativeValue().map(p => p.value) : []);
        const exportVariables = new Map(
            Array.from(moduleContext.variables.keys())
                 .filter(key => exports.has(key))
                 .map(key => [key, moduleContext.variables.get(key)])
        );

        // exports
        const instance = moduleContext.variables.get(this.moduleName);
        instance.properties = exportVariables;

        this.instance = instance;
        return this.instance;
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
                return context;
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

function runWith(fileName, notImports, imports) {
    const importerPromises = 
         imports.map(tokenizableLine => {
                    const tokenables = tokenizableLine.tryTokenables('importAs');
                    if(tokenables.length !== 0) {
                        return tokenables;
                    }
                    return tokenizableLine.tryTokenables('fromImport');
                })
                .map(tokenables => {
                    const start = tokenables[0].value;
                    const importedModuleFile = moduleFilePath(fileName, `${tokenables[1].value}.toy`);

                    if(modules.has(importedModuleFile)) {
                        const module = modules.get(importedModuleFile);
                        return new Promise(
                            resolve => resolve(createModuleImporter(start, module, tokenables[2].value))
                        );  
                    }

                    return environment.read(importedModuleFile).then(([path, code]) => {
                        const moduleName = moduleNameFrom(path);
                        const module = new Module(path, moduleName, tokenizer(code).tokenizableLines());
                        modules.set(path, module);
                        return createModuleImporter(start, module, tokenables[2].value);                                                                                         
                    });
                });
        
    Promise.all(importerPromises)
           .then(importers => new Module(fileName, moduleNameFrom(fileName), notImports, importers).play())
           .catch(err => environment.output(`${err.message}\n`));
}

function moduleNameFrom(path) {
    return path.replace('.toy', '').split('/').slice(-1)[0];
}

function createModuleImporter(start, module, name) {
    if(start === 'import') {
        return name ? new ModuleImporter(module, 'moduleName', name) :
                      new ModuleImporter(module);
    }
    return name === '*' ? new ModuleImporter(module, 'all') :
                          new ModuleImporter(module, 'variableName', name);      
}

function moduleFilePath(src, target) {
    return target.startsWith('/') ? 
               `${environment.TOY_MODUEL_PATH}${target}` : `${dir(src)}${target}`;
}

function dir(fileName) {
    return fileName.slice(0, fileName.lastIndexOf('/') + 1);
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
    if(tokenizableLines[0].value.includes('import')) {
        return notImportTokenizableLines(tokenizableLines.slice(1));
    }
    return tokenizableLines;
}

function importTokenizableLines(tokenizableLines) {
    if(tokenizableLines.length === 0 || !tokenizableLines[0].value.includes('import')) {
        return [];
    }
    return [tokenizableLines[0]].concat(importTokenizableLines(tokenizableLines.slice(1)));
}

function printStackTrace(stackTraceElements) {
    stackTraceElements.map(elem => `at ${elem.statement} (${elem.fileName}:${elem.lineNumber})`)
                      .forEach(line => environment.output(`\n\t${line}`));  
}