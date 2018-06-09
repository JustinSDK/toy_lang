import {Value, Primitive, Class, Instance, Void, Func, Null} from '../interpreter/ast/value.js';
import {Variable, StmtSequence, VariableAssign} from '../interpreter/ast/statement.js';

import {PARAM1, PARAM2, PARAM_LT0, PARAM_LT1, PARAM_LT2, PARAM_LT3} from './func_bases.js';
import {func, func0, func1, func2} from './func_bases.js';

export {BUILTIN_CLASSES};

class Native extends Value {
    constructor(value) {
        super();
        this.value = value;
    }

    toString() {
        return `${this.value}`;
    }
}

function clzNode(name, methods) {
    return new Class(PARAM_LT0, StmtSequence.EMPTY, methods, name);
}

function self(context) {
    return context.variables.get('this');
}

function selfInternalValue(context) {
    return self(context).internalNode.value;
}

function delegate(context, nativeClz, methodName, params) {
    return nativeClz.prototype[methodName].apply(
        selfInternalValue(context), 
        params.map(param => param.evaluate(context).value)
    );
}

function methodPrimitive(nativeClz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            return context.returned(
                new Primitive(
                    delegate(context, nativeClz, methodName, params)
                )
            );
        }
    }, params);
}

function methodVoid(nativeClz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            delegate(context, nativeClz, methodName, params);
            return context.returned(Void);
            
        }    
    }, params);
}

function methodSelf(nativeClz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            const value = delegate(context, nativeClz, methodName, params);
            const instance = self(context);
            instance.internalNode = new Native(value);
            return context.returned(instance);
        }
    }, params);
}

function methodNewSameType(nativeClz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            const value = delegate(context, nativeClz, methodName, params);
            const origin = self(context);
            return context.returned(
                new Instance(
                    origin.clzOfLang, 
                    new Map(origin.properties), 
                    new Native(value)
                )
            );
        }
    }, params);
}

class ObjectClass {
    static getClass() {
        return  func0('getClass', {
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
            const instance = self(context);
            const entries = Array.from(instance.properties.entries())
                                 .map(entry => new Instance(
                                        BUILTIN_CLASSES.get('List'), 
                                        new Map(), 
                                        new Native([new Primitive(entry[0]), entry[1]])
                                    )
                                );
                                 
            return context.returned(new Instance(
                BUILTIN_CLASSES.get('List'), 
                new Map(), 
                new Native(entries)
            ));
        }    
    })],
    ['hasOwnProperty', func1('hasOwnProperty', {
        evaluate(context) {
            const instance = self(context);    
            return context.returned(
                instance.hasOwnProperty(PARAM1.evaluate(context).value) ? 
                    Primitive.BoolTrue : 
                    Primitive.BoolFalse
            );
        }    
    })],    
    ['deleteOwnProperty', func1('deleteOwnProperty', {
        evaluate(context) {
            const instance = self(context);
            instance.deleteOwnProperty(PARAM1.evaluate(context).value);           
            return context;
        }    
    })],    
    ['toString', func0('toString', {
        evaluate(context) {
            const instance = self(context);
            const clzNode = instance.clzOfLang.internalNode;
            return context.returned(new Primitive(`[${clzNode.name} object]`));
        }    
    })],
    ['getClass', ObjectClass.getClass()]
]);

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
            const instance = self(context);
            let text = PARAM1.evaluate(context);
            instance.internalNode = text === Null ? StringClass.EMPTY_STRING : text;
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
            const instance = new Instance(
                BUILTIN_CLASSES.get('List'), 
                ListClass.methods, 
                new Native(arr.map(elem => new Primitive(elem)))
            );
            return context.returned(instance);
        }
    })],
    ['length', func0('length', {
        evaluate(context) {
            const value = selfInternalValue(context);
            return context.returned(new Primitive(value.length));
        }    
    })],
    ['getClass', ObjectClass.getClass()]
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
}

ListClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const value = PARAM1.evaluate(context).value;
            const nativeObj = new Native(new Array(value ? value : 0));
            const instance = self(context);
            instance.internalNode = nativeObj;
            return context;
        }
    })],
    ['toString', ListClass.method0Primitive('toString')],
    ['indexOf', ListClass.method1Primitive('indexOf')],
    ['slice', ListClass.method2NewList('slice')],
    ['join', ListClass.method1Primitive('join')],
    ['fill', ListClass.method3Self('fill')],
    ['append', func1('append', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const arg = PARAM1.evaluate(context);
            arr.push(arg);
            return context.returned(self(context));
        }    
    })],
    ['get', func1('get', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const idx = PARAM1.evaluate(context).value;
            return context.returned(arr[idx]);
        }    
    })],
    ['set', func2('set', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const idx = PARAM1.evaluate(context).value;
            const elem = PARAM2.evaluate(context);
            arr[idx] = elem;
            return context.returned(Void);
        }    
    })],
    ['length', func0('length', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            return context.returned(new Primitive(arr.length));
        }    
    })],    
    ['isEmpty', func0('isEmpty', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            return context.returned(new Primitive(arr.length === 0));
        }    
    })],
    ['filter', func1('filter', {
        evaluate(context) {
            const origin = self(context);
            const arr = origin.internalNode.value;
            const fNode = PARAM1.evaluate(context).internalNode;
            const filtered = arr.filter(elem => {
                const bool = fNode.call(context, [elem]).returnedValue;
                return bool.value;
            });

            return context.returned(new Instance(
                origin.clzOfLang, 
                new Map(origin.properties), 
                new Native(filtered)
            ));
        }    
    })],
    ['getClass', ObjectClass.getClass()]
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
                const fNode = self(context).internalNode;
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
    })],
    ['getClass', ObjectClass.getClass()]
]);

class ClassClass {}

ClassClass.methods = new Map([
    ['name', FunctionClass.name()],     
    ['toString', FunctionClass.toString()],
    ['getMethod', func1('getMethod', {
        evaluate(context) {
            const clzInstance = self(context);
            const methodName = PARAM1.evaluate(context).value;
            return context.returned(
                clzInstance.internalNode.getMethod(methodName)
            );
        }    
    })],
    ['getClass', ObjectClass.getClass()]
]);

function classInstance(clzOfLang, internalNode) {
    return new Instance(clzOfLang, new Map(), internalNode);
}

function classEntry(clzOfLang, name, methods) {
    return [name, classInstance(clzOfLang, clzNode(name, methods))];
}

const CLZ = classInstance(null, clzNode('Class', ClassClass.methods));
// 'Class' of is an instance of 'Class'
CLZ.clzOfLang = CLZ;

const BUILTIN_CLASSES = new Map([
    classEntry(CLZ, 'Object', ObjectClass.methods),
    classEntry(CLZ, 'String', StringClass.methods),
    classEntry(CLZ, 'List', ListClass.methods),
    classEntry(CLZ, 'Function', FunctionClass.methods),
    ['Class', CLZ]
]); 

