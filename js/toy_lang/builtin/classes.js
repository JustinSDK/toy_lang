import {Primitive, Instance, Void, Null} from '../interpreter/ast/value.js';
import {Variable, StmtSequence, VariableAssign} from '../interpreter/ast/statement.js';

import {PARAM1, PARAM2, PARAM_LT1, PARAM_LT2, PARAM_LT3} from './func_bases.js';
import {func0, func1, func2} from './func_bases.js';
import {Native, clzNode, methodPrimitive, methodVoid, methodSelf, methodNewSameType, self, selfInternalValue} from './class_bases.js';

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
                                 .map(entry => ListClass.listInstance([new Primitive(entry[0]), entry[1]]));
            return context.returned(ListClass.listInstance(entries));
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
            const clzNode = self(context).clzOfLang.internalNode;
            return context.returned(new Primitive(`[${clzNode.name} object]`));
        }    
    })],
    ['class', ObjectClass.getClass()]
]);

class FunctionClass {
    static name(methodName = 'name') {
        return func0(methodName, {
            evaluate(context) {
                const fNode = self(context).internalNode;
                return context.returned(new Primitive(fNode.name));
            }    
        });
    }

    static toString(methodName = 'toString') {
        return func0(methodName, {
            evaluate(context) {
                const instance = self(context);
                const clzNode = instance.clzOfLang.internalNode;
                const fNode = instance.internalNode;
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

            return new StmtSequence(
                new VariableAssign(new Variable('this'), targetObject),  
                funcInstance.internalNode.bodyStmt(jsArray.map(arg => arg.evaluate(context)))
            ).evaluate(context);
        }    
    })]
]);

class ClassClass {
    static classInstance(clzOfLang, internalNode) {
        return new Instance(clzOfLang, new Map(), internalNode);
    }

    static classEntry(clzOfLang, name, methods) {
        return [name, ClassClass.classInstance(clzOfLang, clzNode(name, methods))];
    }
}

ClassClass.methods = new Map([
    ['name', FunctionClass.name()], 
    ['toString', FunctionClass.toString()],
    ['addOwnMethod', func2('addOwnMethod', {
        evaluate(context) {
            const clzInstance = self(context);
            const name = PARAM1.evaluate(context).value;
            clzInstance.internalNode.addOwnMethod(name, PARAM2.evaluate(context));
            return context.returned(clzInstance);
        }    
    })],
    ['deleteOwnMethod', func1('deleteOwnMethod', {
        evaluate(context) {
            const clzInstance = self(context);
            clzInstance.internalNode.deleteOwnMethod(PARAM1.evaluate(context).value);
            return context.returned(clzInstance);
        }    
    })],    
    ['hasOwnMethod', func1('hasOwnMethod', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(self(context).internalNode.hasOwnMethod(PARAM1.evaluate(context).value))
            );
        }    
    })],    
    ['hasMethod', func1('hasMethod', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(self(context).internalNode.hasMethod(context, PARAM1.evaluate(context).value))
            );
        }    
    })],
    ['ownMethod', func1('ownMethod', {
        evaluate(context) {
            const methodName = PARAM1.evaluate(context).value;
            return context.returned(
                self(context).internalNode.getOwnMethod(methodName).evaluate(context)
            );
        }    
    })],
    ['method', func1('method', {
        evaluate(context) {
            const methodName = PARAM1.evaluate(context).value;
            return context.returned(
                self(context).internalNode.getMethod(context, methodName).evaluate(context)
            );
        }    
    })],
    ['ownMethods', func0('ownMethods', {
        evaluate(context) {
            const fNodes = Array.from(self(context).internalNode.methods.values());
            return context.returned(
                ListClass.listInstance(fNodes.map(fNode => fNode.evaluate(context)))
            );
        }    
    })],
    ['mixin', func1('mixin', {
        evaluate(context) {
            const clzInstance = self(context);
            Array.from(PARAM1.evaluate(context).internalNode.methods.values())
                 .forEach(f => clzInstance.internalNode.addOwnMethod(f.name, f.evaluate(context)));
            return context.returned(clzInstance);
        }    
    })],
    ['parents', func0('parents', {
        evaluate(context) {
            const parentClzNames = self(context).internalNode.parentClzNames;
            return context.returned(
                ListClass.listInstance(
                    parentClzNames.map(parentClzName => context.lookUpVariable(parentClzName))
                )
            );
        }    
    })],
    ['setParents', func1('setParents', {
        evaluate(context) {
            const clzInstance = self(context);
            const parentClzNames = PARAM1.evaluate(context).internalNode.value
                                         .map(clzInstance => clzInstance.internalNode.name);
            clzInstance.internalNode.parentClzNames = parentClzNames;
            return context.returned(clzInstance);
        }    
    })]
]);

const CLZ = ClassClass.classInstance(null, clzNode('Class', ClassClass.methods));
// 'Class' of is an instance of 'Class'
CLZ.clzOfLang = CLZ;

class StringClass {
    static method0Primitive(methodName) {
        return methodPrimitive(String, methodName);
    }

    static method1Primitive(methodName) {
        return methodPrimitive(String, methodName, PARAM_LT1);
    }    

    static method2Primitive(methodName) {
        return methodPrimitive(String, methodName, PARAM_LT2);
    }       
}

StringClass.EMPTY_STRING = new Primitive('');

StringClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            let text = PARAM1.evaluate(context);
            self(context).internalNode = text === Null ? StringClass.EMPTY_STRING : text;
            return context;
        }
    })],
    ['toUpperCase', StringClass.method0Primitive('toUpperCase')],   
    ['toLowerCase', StringClass.method0Primitive('toLowerCase')],
    ['toString', StringClass.method0Primitive('toString')],     
    ['trim', StringClass.method0Primitive('trim')],     
    ['charAt', StringClass.method1Primitive('charAt')],
    ['charCodeAt', StringClass.method1Primitive('charCodeAt')],
    ['codePointAt', StringClass.method1Primitive('codePointAt')],
    ['endsWith', StringClass.method2Primitive('endsWith')],
    ['startsWith', StringClass.method2Primitive('startsWith')],
    ['includes', StringClass.method2Primitive('includes')],
    ['indexOf', StringClass.method2Primitive('indexOf')],
    ['lastIndexOf', StringClass.method2Primitive('lastIndexOf')],
    ['substring', StringClass.method2Primitive('substring')],
    ['slice', StringClass.method2Primitive('slice')],
    ['split', func2('split', {
        evaluate(context) {
            const arr = delegate(context, String, 'split', PARAM_LT2);
            const instance = ListClass.listInstance(arr.map(elem => new Primitive(elem)));
            return context.returned(instance);
        }
    })],
    ['length', func0('length', {
        evaluate(context) {
            const value = selfInternalValue(context);
            return context.returned(new Primitive(value.length));
        }    
    })]
]);

class ListClass {
    static method0Primitive(methodName) {
        return methodPrimitive(Array, methodName);
    }

    static method1Void(methodName) {
        return methodVoid(Array, methodName, PARAM_LT1);
    }         
    
    static method1Primitive(methodName) {
        return methodPrimitive(Array, methodName, PARAM_LT1);
    }  

    static method2NewList(methodName) {
        return methodNewSameType(Array, methodName, PARAM_LT2);
    }     
    
    static method3Self(methodName) {
        return methodSelf(Array, methodName, PARAM_LT3);
    }  
    
    static listInstance(jsArray) {
        return new Instance(
            BUILTIN_CLASSES.get('List'), 
            new Map(), 
            new Native(jsArray)
        );
    }
}

ListClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const value = PARAM1.evaluate(context).value;
            const nativeObj = new Native(new Array(value ? value : 0));
            self(context).internalNode = nativeObj;
            return context;
        }
    })],
    ['toString', ListClass.method0Primitive('toString')],
    ['indexOf', ListClass.method1Primitive('indexOf')],
    ['slice', ListClass.method2NewList('slice')],
    ['join', ListClass.method1Primitive('join')],
    ['fill', ListClass.method3Self('fill')],
    ['add', func1('add', {
        evaluate(context) {
            const arg = PARAM1.evaluate(context);
            selfInternalValue(context).push(arg);
            return context.returned(self(context));
        }    
    })],
    ['get', func1('get', {
        evaluate(context) {
            const idx = PARAM1.evaluate(context).value;
            return context.returned(selfInternalValue(context)[idx]);
        }    
    })],
    ['set', func2('set', {
        evaluate(context) {
            const idx = PARAM1.evaluate(context).value;
            const elem = PARAM2.evaluate(context);
            selfInternalValue(context)[idx] = elem;
            return context.returned(Void);
        }    
    })],
    ['length', func0('length', {
        evaluate(context) {
            return context.returned(new Primitive(selfInternalValue(context).length));
        }    
    })],    
    ['isEmpty', func0('isEmpty', {
        evaluate(context) {
            return context.returned(Primitive.boolNode(selfInternalValue(context).length === 0));
        }    
    })],
    ['filter', func1('filter', {
        evaluate(context) {
            const arr = self(context).internalNode.value;
            const fNode = PARAM1.evaluate(context).internalNode;
            const filtered = arr.filter(elem => {
                const bool = fNode.call(context, [elem]).returnedValue;
                return bool.value;
            });
            
            return context.returned(ListClass.listInstance(filtered));
        }    
    })],
    ['map', func1('map', {
        evaluate(context) {
            const arr = self(context).internalNode.value;
            const fNode = PARAM1.evaluate(context).internalNode;
            const mapped = arr.map(elem => fNode.call(context, [elem]).returnedValue);
            return context.returned(ListClass.listInstance(mapped));
        }    
    })],
    ['forEach', func1('forEach', {
        evaluate(context) {
            const arr = self(context).internalNode.value;
            const fNode = PARAM1.evaluate(context).internalNode;
            arr.forEach(elem => fNode.call(context, [elem]));
            return context.returned(Void);
        }    
    })],    
    ['toString', func0('toString', {
        evaluate(context) {
            const arr = self(context).internalNode.value;
            return context.returned(new Primitive(arr.map(elem => elem.toString(context)).join()));
        }    
    })]
]);

const BUILTIN_CLASSES = new Map([
    ClassClass.classEntry(CLZ, 'Object', ObjectClass.methods),
    ClassClass.classEntry(CLZ, 'Function', FunctionClass.methods),
    ['Class', CLZ],
    ClassClass.classEntry(CLZ, 'String', StringClass.methods),
    ClassClass.classEntry(CLZ, 'List', ListClass.methods)
]); 

