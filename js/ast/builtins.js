import {Null, Primitive, Func, Class, Instance} from './value.js';
import {Variable, StmtSequence, VariableAssign} from './statement.js';

export {BUILTINS};

const PARAM1 = new Variable('p1');
const PARAM2 = new Variable('p2');

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

function methodType(clz, rtype, methodName, params = []) {
    return func(methodName, {
        evaluate(context) {
            let instance = self(context);
            let value = instance.getProperty('value').value;
            return context.returned(
                new rtype(
                    clz.prototype[methodName].apply(
                        value, 
                        params.map(param => param.evaluate(context).value)
                    )
                )
            );
        }
    }, params);
}

function methodVoid(clz, methodName, params = []) {
    return func(methodName, {
        evaluate(context) {
            let instance = self(context);
            let value = instance.getProperty('value').value;
            return context.returned(Void);
        }    
    }, params);
}


class StringClass {
    static method0Primitive(methodName) {
        return methodType(String, Primitive, methodName);
    }

    static method1Primitive(methodName) {
        return methodType(String, Primitive, methodName, [PARAM1]);
    }    

    static method2Primitive(methodName) {
        return methodType(String, Primitive, methodName, [PARAM1, PARAM2]);
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

const BUILTINS = new Map([
    ['print', Print],
    ['println', Println],
    ['hasValue', HasValue],
    ['noValue', NoValue],
    ['String', clz('String', StringClass.members)]
]);