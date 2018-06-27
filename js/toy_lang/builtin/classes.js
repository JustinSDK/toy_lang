import {Primitive, Instance, Null, Thrown} from '../interpreter/ast/value.js';
import {Variable, StmtSequence, VariableAssign} from '../interpreter/ast/statement.js';

import {PARAM1, PARAM2} from './func_bases.js';
import {func0, func1, func2} from './func_bases.js';
import {clzNode, self, selfInternalNode} from './class_bases.js';
import {StringClass, ListClass} from './delegates.js';

export {BUILTIN_CLASSES};

class ObjectClass {
    static getClass() {
        return  func0('class', {
            evaluate(context) {
                const instance = self(context);
                return context.returned(instance.clzOfLang);
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
            const args = context.lookUpVariable('arguments').internalNode.value;
            const parentClz = args[0].internalNode;
            const parentClzNames = instance.clzNodeOfLang().parentClzNames;
            if(parentClzNames.every(parentClzName => parentClzName !== parentClz.name)) {
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
        return func0(methodName, {
            evaluate(context) {
                const fNode = selfInternalNode(context);
                return context.returned(new Primitive(fNode.name));
            }    
        });
    }

    static toString(methodName = 'toString') {
        return func0(methodName, {
            evaluate(context) {
                const clzNode = self(context).clzNodeOfLang();
                const fNode = selfInternalNode(context);
                return context.returned(new Primitive(`[${clzNode.name} ${fNode.name}]`));
            }    
        });
    }
}

FunctionClass.methods = new Map([
    ['name', FunctionClass.name()],    
    ['toString', FunctionClass.toString()],
    ['apply', func2('apply', {
        evaluate(context) {
            const funcInstance = self(context);            
            const targetObject = PARAM1.evaluate(context); 
            const args = PARAM2.evaluate(context);         // List instance
            const jsArray = args === Null ? [] : args.internalNode.value;
            const bodyStmt = funcInstance.internalNode.bodyStmt(context, jsArray.map(arg => arg.evaluate(context)));

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
            Array.from(PARAM1.evaluate(context).internalNode.methods.values())
                 .forEach(f => selfInternalNode(context).addOwnMethod(f.name, f.evaluate(context)));
            return context.returned(self(context));
        }    
    })],
    ['parents', func0('parents', {
        evaluate(context) {
            const parentClzNames = selfInternalNode(context).parentClzNames;
            return context.returned(
                ListClass.newInstance(
                    context,
                    parentClzNames.map(parentClzName => context.lookUpVariable(parentClzName))
                )
            );
        }    
    })],
    ['setParents', func1('setParents', {
        evaluate(context) {
            const parentClzNames = PARAM1.evaluate(context).internalNode.value
                                         .map(clzInstance => clzInstance.internalNode.name);
            selfInternalNode(context).parentClzNames = parentClzNames;
            return context.returned(self(context));
        }    
    })]
]);

const CLZ = ClassClass.classInstance(null, clzNode({name : 'Class', methods : ClassClass.methods}));
// 'Class' of is an instance of 'Class'
CLZ.clzOfLang = CLZ;

const BUILTIN_CLASSES = new Map([
    ClassClass.classEntry(CLZ, 'Object', ObjectClass.methods),
    ClassClass.classEntry(CLZ, 'Function', FunctionClass.methods),
    ['Class', CLZ],
    ClassClass.classEntry(CLZ, 'String', StringClass.methods),
    ClassClass.classEntry(CLZ, 'List', ListClass.methods)
]); 

