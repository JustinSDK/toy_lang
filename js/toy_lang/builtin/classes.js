import {Primitive, Instance, Null, Thrown, Void, Func, Class} from '../interpreter/ast/value.js';
import {Variable, StmtSequence, VariableAssign} from '../interpreter/ast/statement.js';

import {PARAM1, PARAM2, PARAM3} from './func_bases.js';
import {func0, func1, func2, func3} from './func_bases.js';
import {clzNode, self, selfInternalNode} from './class_bases.js';
import {StringClass, ListClass} from './delegates.js';

export {BUILTIN_CLASSES};

class ObjectClass {
    static getClass() {
        return  func0('class', {
            evaluate(context) {
                return context.returned(self(context).clzOfLang);
            }    
        });
    }
}

ObjectClass.methods = new Map([ 
    ['ownProperties', func0('ownProperties', {
        evaluate(context) {
            const entries = Array.from(self(context).properties.entries())
                                 .map(entry => ListClass.newInstance(context, [new Primitive(entry[0]), entry[1]]));
            return context.returned(ListClass.newInstance(context, entries));
        }    
    })],
    ['hasOwnProperty', func1('hasOwnProperty', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(self(context).hasOwnProperty(PARAM1.evaluate(context).value))
            );
        }    
    })],    
    ['deleteOwnProperty', func1('deleteOwnProperty', {
        evaluate(context) {
            self(context).deleteOwnProperty(PARAM1.evaluate(context).value);           
            return context;
        }    
    })],    
    ['toString', func0('toString', {
        evaluate(context) {
            const clzNode = self(context).clzNodeOfLang();
            return context.returned(new Primitive(`[${clzNode.name} object]`));
        }    
    })],
    ['class', ObjectClass.getClass()],
    ['super', func0('super', {
        evaluate(context) {
            const instance = self(context);
            const args = context.lookUpVariable('arguments').nativeValue();
            const parentClz = args[0].internalNode;
            const parentClzNames = instance.clzNodeOfLang().parentClzNames;
            if(parentClzNames.every(name => name !== parentClz.name)) {
                // currently a text is thrown. I'll design an exception type later.
                return context.thrown(
                    new Thrown('obj.super(parent): the type of obj must be the direct subtype of parent')
                );
            }
 
            const name = args[1].value;
            const func = parentClz.getOwnMethod(name);           
            return new StmtSequence(
                new VariableAssign(Variable.of('this'), instance),  
                func.bodyStmt(context, args.slice(2))
            ).evaluate(context);
        }    
    })]
]);

class FunctionClass {
    static name(methodName = 'name') {
        return func1(methodName, {
            evaluate(context) {
                let name = PARAM1.evaluate(context);
                const fNode = selfInternalNode(context);
                if(name !== Null) {
                    fNode.name = name.value;
                }
                return context.returned(new Primitive(fNode.name));
            }    
        });
    }

    static init() {
        return func1('init', {
            evaluate(context) {
                let name = PARAM1.evaluate(context);
                self(context).internalNode = new Func( // nope function
                    [], StmtSequence.EMPTY, name === Null ? "''" : name.value, context
                );
                return context;
            }    
        });
    }

    static toString() {
        return func0('toString', {
            evaluate(context) {
                const clzNode = self(context).clzNodeOfLang();
                const fNode = selfInternalNode(context);
                return context.returned(new Primitive(`[${clzNode.name} ${fNode.name}]`));
            }    
        });
    }
}

FunctionClass.methods = new Map([
    ['init', FunctionClass.init()], 
    ['name', FunctionClass.name()],    
    ['toString', FunctionClass.toString()],
    ['apply', func2('apply', {
        evaluate(context) {
            const funcInstance = self(context);            
            const targetObject = PARAM1.evaluate(context); 
            const args = PARAM2.evaluate(context);         // List instance
            const jsArray = args === Null ? [] : args.nativeValue();
            const bodyStmt = funcInstance.internalNode
                                         .bodyStmt(context, jsArray.map(arg => arg.evaluate(context)));

            return new StmtSequence(
                new VariableAssign(Variable.of('this'), targetObject),  
                bodyStmt,
                bodyStmt.lineNumber
            ).evaluate(context);
        }    
    })]
]);

class ClassClass {
    static classInstance(clzOfLang, internalNode) {
        return new Instance(clzOfLang, new Map(), internalNode);
    }

    static classEntry(clzOfLang, name, methods) {
        return [name, ClassClass.classInstance(clzOfLang, clzNode({name, methods}))];
    }

    static init() {
        return func3('init', {
            evaluate(context) {  
                const name = PARAM1.evaluate(context);
                const parents = PARAM2.evaluate(context);
                const methods = PARAM3.evaluate(context); 

                self(context).internalNode = new Class({
                    notMethodStmt : StmtSequence.EMPTY,
                    methods : new Map(methods === Null ? [] : methods.nativeValue().map(method => [method.internalNode.name, method.internalNode])),
                    name : name === Null ? "''" : name.value,
                    parentClzNames : parents === Null ? ['Object'] : parents.nativeValue().map(parent => parent.internalNode.name), 
                    parentContext : context
                });
                return context;
            }    
        });
    }    
}

ClassClass.methods = new Map([
    ['init', ClassClass.init()], 
    ['name', FunctionClass.name()], 
    ['toString', FunctionClass.toString()],
    ['addOwnMethod', func2('addOwnMethod', {
        evaluate(context) {
            const name = PARAM1.evaluate(context).value;
            selfInternalNode(context).addOwnMethod(name, PARAM2.evaluate(context));
            return context.returned(self(context));
        }    
    })],
    ['deleteOwnMethod', func1('deleteOwnMethod', {
        evaluate(context) {
            selfInternalNode(context).deleteOwnMethod(PARAM1.evaluate(context).value);
            return context.returned(self(context));
        }    
    })],    
    ['hasOwnMethod', func1('hasOwnMethod', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(
                    selfInternalNode(context).hasOwnMethod(PARAM1.evaluate(context).value)
                )
            );
        }    
    })],    
    ['hasMethod', func1('hasMethod', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(
                    selfInternalNode(context).hasMethod(context, PARAM1.evaluate(context).value)
                )
            );
        }    
    })],
    ['ownMethod', func1('ownMethod', {
        evaluate(context) {
            const methodName = PARAM1.evaluate(context).value;
            return context.returned(
                selfInternalNode(context).getOwnMethod(methodName).evaluate(context)
            );
        }    
    })],
    ['method', func1('method', {
        evaluate(context) {
            const methodName = PARAM1.evaluate(context).value;
            return context.returned(
                selfInternalNode(context).getMethod(context, methodName).evaluate(context)
            );
        }    
    })],
    ['ownMethods', func0('ownMethods', {
        evaluate(context) {
            const fNodes = Array.from(selfInternalNode(context).methods.values());
            return context.returned(
                
                ListClass.newInstance(context, fNodes.map(fNode => fNode.evaluate(context)))
            );
        }    
    })],
    ['mixin', func1('mixin', {
        evaluate(context) {
            Array.from(PARAM1.evaluate(context).internalNode.methodArray())
                 .forEach(f => selfInternalNode(context).addOwnMethod(f.name, f.evaluate(context)));
            return context.returned(self(context));
        }    
    })],
    ['parents', func1('parents', {
        evaluate(context) {
            let parents = PARAM1.evaluate(context);
            if(parents === Null) {
                return getParents(context);
            }
            return setParents(context, parents);
        }    
    })]
]);

function getParents(context) {
    const parentClzNames = selfInternalNode(context).parentClzNames;
    return context.returned(
        ListClass.newInstance(
            context,
            parentClzNames.map(parentClzName => context.lookUpVariable(parentClzName))
        )
    );
}

function setParents(context, parents) {
    const parentClzNames = parents.nativeValue()
                                  .map(clzInstance => clzInstance.internalNode.name);
    selfInternalNode(context).parentClzNames = parentClzNames;
    return context.returned(self(context));
}

const CLZ = ClassClass.classInstance(null, clzNode({name : 'Class', methods : ClassClass.methods}));
// 'Class' of is an instance of 'Class'
CLZ.clzOfLang = CLZ;

class TraceableClass {
    static toString(methodName = 'toString') {
        return func0(methodName, {
            evaluate(context) {
                const instance = self(context);
                return context.returned(
                    new Primitive(
                        `${instance.getOwnProperty('name')}: ${instance.getOwnProperty('message')}`
                    )
                );
            }    
        });
    }

    static printStackTrace(output, stackTraceElements) {
        stackTraceElements.map(elem => `at ${elem.getOwnProperty('statement')} (${elem.getOwnProperty('fileName')}:${elem.getOwnProperty('lineNumber')})`)
                          .forEach(line => output(`\n\t${line}`));  
    }
}

TraceableClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const instance = self(context);
            instance.setOwnProperty('name', new Primitive(instance.clzNodeOfLang().name));
            instance.setOwnProperty('message', PARAM1.evaluate(context));
            instance.setOwnProperty('stackTraceElements', ListClass.newInstance(context, []));
            return context;
        }
    })],
    ['printStackTrace', func0('printStackTrace', {
        evaluate(context) {
            const instance = self(context);
            context.output(`${instance.getOwnProperty('name')}: ${instance.getOwnProperty('message')}`);
            TraceableClass.printStackTrace(
                context.output, 
                instance.getOwnProperty('stackTraceElements').nativeValue()
            );
            return context.returned(Void);
        }
    })],    
    ['toString', TraceableClass.toString()]
]);

const BUILTIN_CLASSES = new Map([
    ClassClass.classEntry(CLZ, 'Object', ObjectClass.methods),
    ClassClass.classEntry(CLZ, 'Function', FunctionClass.methods),
    ['Class', CLZ],
    ClassClass.classEntry(CLZ, 'String', StringClass.methods),
    ClassClass.classEntry(CLZ, 'List', ListClass.methods),
    ClassClass.classEntry(CLZ, 'Traceable', TraceableClass.methods)
]); 

