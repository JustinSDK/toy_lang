import {Func} from './ast/function.js';
import {Variable} from './ast/statement.js';

export {Context};

class Print {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        context.output(this.value.evaluate(context).value)
        return context;
    }
}

const BUILTINS = new Map([
    ['print', new Func([new Variable('v')], new Print(new Variable('v')))]
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

