import {Primitive, Func} from './ast/value.js';
import {Variable} from './ast/statement.js';

export {Context};

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

class Context {
    constructor(parent = null, output = nope, variables = new Map(), returnedValue = null) {
        this.parent = parent;
        this.output = output;
        this.variables = variables;
        this.returnedValue = returnedValue;
    }

    static initialize(environment) {
        return new Context(null, environment.output, BUILTINS);
    }

    childContext() {
        return new Context(this, this.output)
    }

    output(value) {
        this.output(value);
        return this;
    }

    assign(variable, value) {
        return new Context(
            this.parent,
            this.output,
            new Map(Array.from(this.variables.entries()).concat([[variable, value]]))
        );
    }

    returned(value) {
        return new Context(
            this.parent,
            this.output,
            this.variables,
            value
        );
    }
}

