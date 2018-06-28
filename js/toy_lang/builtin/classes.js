import {ClassError} from '../interpreter/commons/errors.js';
import {Primitive, Instance, Null, Void, Func, Class} from '../interpreter/ast/value.js';
import {Variable, StmtSequence, VariableAssign} from '../interpreter/ast/statement.js';

import {PARAM1, PARAM2, PARAM3} from './func_bases.js';
import {func0, func1, func2, func3} from './func_bases.js';
import {clzNode, self, selfInternalNode} from './class_bases.js';
import {StringClass, ListClass} from './delegates.js';

export {BUILTIN_CLASSES};

class ObjectClass {}

ObjectClass.methods = new Map([ 
    ['init', func1('init', {
        evaluate(context) {
            const list = PARAM1.evaluate(context);
            if(list !== Null) {
                const instance = self(context);
                list.nativeValue().forEach(prop => {
                    const plt = prop.nativeValue();
                    instance.setOwnProperty(plt[0].value, plt[1]);
                });
            }
            return context;
        }    
    })], 
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
    ['getOwnProperty', func1('geteOwnProperty', {
        evaluate(context) {
            return context.returned(
                self(context).getOwnProperty(PARAM1.evaluate(context).value)
            );
        }    
    })],    
    ['setOwnProperty', func2('geteOwnProperty', {
        evaluate(context) {
            const instance = self(context);
            instance.setOwnProperty(PARAM1.evaluate(context).value, PARAM2.evaluate(context))
            return context.returned(instance);
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
    ['class', func0('class', {
        evaluate(context) {
            return context.returned(self(context).clzOfLang);
        }    
    })],
    ['super', func3('super', {
        evaluate(context) {
            const parentClz = PARAM1.evaluate(context).internalNode;
            const name = PARAM2.evaluate(context).value;
            const args = PARAM3.evaluate(context);
            
            const instance = self(context);
            const parentClzNames = instance.clzNodeOfLang().parentClzNames;
            if(parentClzNames.every(name => name !== parentClz.name)) {
                throw new ClassError('obj.super(parent): the type of obj must be the direct subtype of parent');
            }
 
            const func = parentClz.getOwnMethod(name);           
            return new StmtSequence(
                new VariableAssign(Variable.of('this'), instance),  
                func.bodyStmt(context, args === Null ? [] : args.nativeValue())
            ).evaluate(context);
        }    
    })]
]);

class FunctionClass {
    static name() {
        return func1('name', {
            evaluate(context) {
                const name = PARAM1.evaluate(context);
                const fNode = selfInternalNode(context);
                if(name !== Null) {
                    fNode.name = name.value;
                }
                return context.returned(new Primitive(fNode.name));
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
    ['init', func1('init', {
        evaluate(context) {
            const name = PARAM1.evaluate(context);
            self(context).internalNode = new Func( // nope function
                [], StmtSequence.EMPTY, name === Null ? "''" : name.value, context
            );
            return context;
        }    
    })], 
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
}

ClassClass.methods = new Map([
    ['init', func3('init', {
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
    })], 
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
            const parents = PARAM1.evaluate(context);
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

            instance.getOwnProperty('stackTraceElements')
                    .nativeValue()
                    .map(elem => `at ${elem.getOwnProperty('statement')} (${elem.getOwnProperty('fileName')}:${elem.getOwnProperty('lineNumber')})`)
                    .forEach(line => context.output(`\n\t${line}`));  
            
            context.output('\n');

            return context.returned(Void);
        }
    })],    
    ['toString', func0('toString', {
        evaluate(context) {
            const instance = self(context);
            return context.returned(
                new Primitive(
                    `${instance.getOwnProperty('name')}: ${instance.getOwnProperty('message')}`
                )
            );
        }    
    })]
]);

const BUILTIN_CLASSES = new Map([
    ClassClass.classEntry(CLZ, 'Object', ObjectClass.methods),
    ClassClass.classEntry(CLZ, 'Function', FunctionClass.methods),
    ['Class', CLZ],
    ClassClass.classEntry(CLZ, 'String', StringClass.methods),
    ClassClass.classEntry(CLZ, 'List', ListClass.methods),
    ClassClass.classEntry(CLZ, 'Traceable', TraceableClass.methods)
]); 

