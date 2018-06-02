import {Value, Primitive, Class, Instance, Void, Func} from '../interpreter/ast/value.js';
import {Variable, StmtSequence, VariableAssign} from '../interpreter/ast/statement.js';

import {PARAM1, PARAM2, PARAM_LT0, PARAM_LT1, PARAM_LT2, PARAM_LT3} from './func_bases.js';
import {func, func0, func1, func2} from './func_bases.js';

export {BUILTIN_CLASSES};

class NativeObject extends Value {
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

function classBodyStmt(assigns) {
    if(assigns.length === 0) {
        return StmtSequence.EMPTY;
    }
    const [name, value] = assigns[0];
    return new StmtSequence(
        new VariableAssign(new Variable(name), value),
        classBodyStmt(assigns.slice(1))
    );
}

function delegate(context, clz, methodName, params) {
    return clz.prototype[methodName].apply(
        selfInternalValue(context), 
        params.map(param => param.evaluate(context).value)
    );
}

function methodPrimitive(clz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            return context.returned(
                new Primitive(
                    delegate(context, clz, methodName, params)
                )
            );
        }
    }, params);
}

function methodVoid(clz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            delegate(context, clz, methodName, params);
            return context.returned(Void);
            
        }    
    }, params);
}

function methodSelf(clz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            const value = delegate(context, clz, methodName, params);
            const instance = self(context);
            instance.internalNode = new NativeObject(value);
            return context.returned(instance);
        }
    }, params);
}

function methodNewSameType(clz, methodName, params = PARAM_LT0) {
    return func(methodName, {
        evaluate(context) {
            const value = delegate(context, clz, methodName, params);
            const origin = self(context);
            const instance = new Instance(origin.clz, new Map(origin.properties));
            instance.internalNode = new NativeObject(value);
            return context.returned(instance);
        }
    }, params);
}

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

StringClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const instance = self(context);
            instance.internalNode = PARAM1.evaluate(context);
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
}

ListClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const value = PARAM1.evaluate(context).value;
            const nativeObj = new NativeObject(new Array(value ? value : 0));
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
            return context.returned(Void);
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
    })]
]);

class FunctionClass {}

FunctionClass.methods = new Map([
    ['toString', func0('toString', {
        evaluate(context) {
            const fNode = self(context).internalNode;
            return context.returned(new Primitive(`[Function ${fNode.name}]`));
        }    
    })]
]);

class ClassClass {}

ClassClass.methods = new Map([
    ['toString', func0('toString', {
        evaluate(context) {
            const clzNode = self(context).internalNode;
            return context.returned(new Primitive(`[Class ${clzNode.name}]`));
        }    
    })]
]);

function classInstance(clz, internalNode) {
    return new Instance(clz, ClassClass.methods, internalNode);
}

const CLZ = new Instance(null, ClassClass.methods, clzNode('Class', ClassClass.methods));
// 'Class' of is an instance of 'Class'
CLZ.setProperty('class', CLZ);

const BUILTIN_CLASSES = new Map([
    ['String', classInstance(CLZ, clzNode('String', StringClass.methods))],
    ['List', classInstance(CLZ, clzNode('List', ListClass.methods))],
    ['Function', classInstance(CLZ, clzNode('Function', FunctionClass.methods))],
    ['Class', CLZ]
]); 

