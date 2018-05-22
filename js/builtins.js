import {Primitive, Func, Class, Instance} from './ast/value.js';
import {Variable, StmtSequence, VariableAssign} from './ast/statement.js';

export {BUILTINS};

class Print {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        context.output(this.value.evaluate(context).value);
        return context;
    }
}

const ONE_PARAM = new Variable('v');

function classBodyStmt(initFunc) {
    return new StmtSequence(
        new VariableAssign(new Variable('init'), initFunc),
        StmtSequence.EMPTY
    );
}

const Str = new Map([
    ['init', new Func([ONE_PARAM], {
        evaluate(context) {
            let properties = new Map([
                ['value', ONE_PARAM.evaluate(context)],
                ['length', new Primitive(ONE_PARAM.evaluate(context).value.length)]
            ].concat(Array.from(Str.entries())));
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
    ['print', new Func([ONE_PARAM], new Print(ONE_PARAM))],
    ['String', new Class([], classBodyStmt(Str.get('init')))]
]);