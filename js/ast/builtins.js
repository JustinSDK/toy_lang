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
    let toString = instance.getProperty('toString');
    if(toString) {
        let method = new StmtSequence(
            new VariableAssign(new Variable('this'), instance),  
            toString.bodyStmt([])
        );

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

class StringClass {
    static method(methodName, params = []) {
        return func(methodName, {
            evaluate(context) {
                let instance = self(context);
                let text = instance.getProperty('value').value;
                return context.returned(
                    new Primitive(
                        String.prototype[methodName].apply(
                            text, 
                            params.map(param => param.evaluate(context).value)
                        )
                    )
                );
            }    
        }, params);
    }

    static method0(methodName) {
        return StringClass.method(methodName);
    }

    static method1(methodName) {
        return StringClass.method(methodName, [PARAM1]);
    }    

    static method2(methodName) {
        return StringClass.method(methodName, [PARAM1, PARAM2]);
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
    ['toUpperCase', StringClass.method0('toUpperCase')],   
    ['toLowerCase', StringClass.method0('toLowerCase')],     
    ['trim', StringClass.method0('trim')],     
    ['charAt', StringClass.method1('charAt')],
    ['charCodeAt', StringClass.method1('charCodeAt')],
    ['codePointAt', StringClass.method1('codePointAt')],
    ['endsWith', StringClass.method2('endsWith')],
    ['startsWith', StringClass.method2('startsWith')],
    ['includes', StringClass.method2('includes')],
    ['indexOf', StringClass.method2('indexOf')],
    ['lastIndexOf', StringClass.method2('lastIndexOf')],
    ['substring', StringClass.method2('substring')] 
]);

const BUILTINS = new Map([
    ['print', Print],
    ['println', Println],
    ['hasValue', HasValue],
    ['noValue', NoValue],
    ['String', clz('String', StringClass.members)]
]);