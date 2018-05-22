import {Primitive, Func} from './ast/value.js';
import {Variable} from './ast/statement.js';

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

class Len {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.returned(new Primitive(this.value.evaluate(context).value.length));
    }    
}

const ONE_PARAM = new Variable('v');

const BUILTINS = new Map([
    ['print', new Func([ONE_PARAM], new Print(ONE_PARAM))],
    ['len', new Func([ONE_PARAM], new Len(ONE_PARAM))]
]);