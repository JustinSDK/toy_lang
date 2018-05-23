import {Primitive, Func, Class, Instance} from './ast/value.js';
import {Variable, StmtSequence, VariableAssign} from './ast/statement.js';

export {BUILTINS};

const ONE_PARAM = new Variable('p');

// built-in functions

const Print = {
    evaluate(context) {
        context.output(ONE_PARAM.evaluate(context).value);
        return context;
    }
}

const HasValue = {
    evaluate(context) {
        let bool = ONE_PARAM.evaluate(context).value ? Primitive.BoolTrue : Primitive.BoolFalse;
        return context.returned(bool);
    }
}

// built-in classes

function classBodyStmt(initFunc) {
    return new StmtSequence(
        new VariableAssign(new Variable('init'), initFunc),
        StmtSequence.EMPTY
    );
}

const StringMethods = new Map([
    ['init', new Func([ONE_PARAM], {
        evaluate(context) {
            let properties = new Map([
                ['value', ONE_PARAM.evaluate(context)],
                ['length', new Primitive(ONE_PARAM.evaluate(context).value.length)]
            ].concat(Array.from(StringMethods.entries())));
            return context.assign('this', new Instance(properties));
        }
    })],
    ['charAt', new Func([ONE_PARAM], {
        evaluate(context) {
            let instance = context.variables.get('this');
            let text = instance.properties.get('value').value;
            return context.returned(
                new Primitive(text.charAt(ONE_PARAM.evaluate(context).value))
            );
        }    
    })],
    ['toUpperCase', new Func([], {
        evaluate(context) {
            let instance = context.variables.get('this');
            let text = instance.properties.get('value').value;
            return context.returned(
                new Primitive(text.toUpperCase())
            );
        }    
    })],   
    ['toLowerCase', new Func([], {
        evaluate(context) {
            let instance = context.variables.get('this');
            let text = instance.properties.get('value').value;
            return context.returned(
                new Primitive(text.toLowerCase())
            );
        }    
    })], 
]);

const BUILTINS = new Map([
    ['print', new Func([ONE_PARAM], Print)],
    ['hasValue', new Func([ONE_PARAM], HasValue)],
    ['String', new Class([], classBodyStmt(StringMethods.get('init')))]
]);