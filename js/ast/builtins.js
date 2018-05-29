import {Null, Primitive, Func, Class, Instance, Void} from './value.js';
import {Variable, StmtSequence, VariableAssign} from './statement.js';

export {BUILTINS};

const PARAM1 = new Variable('p1');
const PARAM2 = new Variable('p2');
const PARAM3 = new Variable('p3');

// built-in functions

function func(name, node, params = []) {
    return new Func(params, node, name);
}

function invokeToString(context, instance) {
    if(instance.hasProperty('toString')) {
        let method = instance.method(context, 'toString');
        return method.evaluate(context.childContext()).returnedValue.value;
    }
    
    return instance.toString();
}

function print(context, v) {
    context.output(v instanceof Instance ? invokeToString(context, v) : v.toString());
}

const Print = func('print', {
    evaluate(context) {
        print(context, PARAM1.evaluate(context));
        return context;
    }
}, [PARAM1]);
 
const Println = func('println', {
    evaluate(context) {
        let argument = PARAM1.evaluate(context);
        if(argument !== Null) {
            print(context, argument);
        }

        context.output('\n');
        return context;
    }
}, [PARAM1]);

const HasValue = func('hasValue',{
    evaluate(context) {
        let bool = PARAM1.evaluate(context) === Null ? Primitive.BoolFalse : Primitive.BoolTrue;
        return context.returned(bool);
    }
}, [PARAM1]);

const NoValue = func('noValue', {
    evaluate(context) {
        let bool = PARAM1.evaluate(context) === Null ? Primitive.BoolTrue : Primitive.BoolFalse;
        return context.returned(bool);
    }
}, [PARAM1]);
 
// built-in classes

function clz(name, members) {
    return new Class([], classBodyStmt(Array.from(members.entries())), name);
}

function self(context) {
    return context.variables.get('this');
}

function selfValue(context) {
    return self(context).getProperty('value').value;
}

function classBodyStmt(assigns) {
    if(assigns.length === 0) {
        return StmtSequence.EMPTY;
    }
    let [name, value] = assigns[0];
    return new StmtSequence(
        new VariableAssign(new Variable(name), value),
        classBodyStmt(assigns.slice(1))
    );
}

function delegate(context, clz, methodName, params) {
    return clz.prototype[methodName].apply(
        selfValue(context), 
        params.map(param => param.evaluate(context).value)
    );
}

function methodPrimitive(clz, methodName, params = []) {
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

function methodVoid(clz, methodName, params = []) {
    return func(methodName, {
        evaluate(context) {
            delegate(context, clz, methodName, params);
            return context.returned(Void);
            
        }    
    }, params);
}

function methodInstance(clz, methodName, params = []) {
    return func(methodName, {
        evaluate(context) {
            let value = delegate(context, clz, methodName, params);
            let instance = self(context);
            instance.setProperty('value', new Primitive(value));
            return context.returned(instance);
        }
    }, params);
}

function methodNewInstance(clz, methodName, params = []) {
    return func(methodName, {
        evaluate(context) {
            let value = delegate(context, clz, methodName, params);
            let instance = new Instance(new Map(self(context).properties));
            instance.setProperty('value', new Primitive(value));
            return context.returned(instance);
        }
    }, params);
}

class StringClass {
    static method0Primitive(methodName) {
        return methodPrimitive(String, methodName);
    }

    static method1Primitive(methodName) {
        return methodPrimitive(String, methodName, [PARAM1]);
    }    

    static method2Primitive(methodName) {
        return methodPrimitive(String, methodName, [PARAM1, PARAM2]);
    }       
}

StringClass.members = new Map([
    ['init', func('init', {
        evaluate(context) {
            let instance = self(context);
            instance.setProperty('value', PARAM1.evaluate(context));
            instance.setProperty('length', new Primitive(PARAM1.evaluate(context).value.length));
            return context;
        }
    }, [PARAM1])],
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
    ['substring', StringClass.method2Primitive('substring')] 
]);

class ListClass {
    static method0Primitive(methodName) {
        return methodPrimitive(Array, methodName);
    }

    static method1Void(methodName) {
        return methodVoid(Array, methodName, [PARAM1]);
    }         
    
    static method1Primitive(methodName) {
        return methodPrimitive(Array, methodName, [PARAM1]);
    }  

    static method2NewInstance(methodName) {
        return methodNewInstance(Array, methodName, [PARAM1, PARAM2]);
    }     
    
    static method3Instance(methodName) {
        return methodInstance(Array, methodName, [PARAM1, PARAM2, PARAM3]);
    }    
}

ListClass.members = new Map([
    ['init', func('init', {
        evaluate(context) {
            let value = PARAM1.evaluate(context).value;
            let p = new Primitive(new Array(value ? value : 0));
            let instance = self(context);
            instance.setProperty('value', p);
            instance.setProperty('length', new Primitive(p.value.length));
            return context;
        }
    }, [PARAM1])],
    ['toString', ListClass.method0Primitive('toString')],
    ['append', ListClass.method1Void('push')],
    ['indexOf', ListClass.method1Primitive('indexOf')],
    ['slice', ListClass.method2NewInstance('slice')],
    ['join', ListClass.method1Primitive('join')],
    ['fill', ListClass.method3Instance('fill')],
    ['get', func('get', {
        evaluate(context) {
            let value = selfValue(context);
            let arg = PARAM1.evaluate(context).value;
            return context.returned(new Primitive(value[arg]));
        }    
    }, [PARAM1])],
    ['set', func('set', {
        evaluate(context) {
            let value = selfValue(context);
            let idx = PARAM1.evaluate(context).value;
            let elem = PARAM2.evaluate(context).value;
            value[idx] = elem;
            return context.returned(Void);
        }    
    }, [PARAM1, PARAM2])],    
    ['isEmpty', func('isEmpty', {
        evaluate(context) {
            let value = selfValue(context);
            return context.returned(new Primitive(value.length === 0));
        }    
    }, [])]
]);

const BUILTINS = new Map([
    ['print', Print],
    ['println', Println],
    ['hasValue', HasValue],
    ['noValue', NoValue],
    ['String', clz('String', StringClass.members)],
    ['List', clz('List', ListClass.members)]
]);