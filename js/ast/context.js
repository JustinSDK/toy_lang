import {BUILTINS} from './builtins.js';

export {Context};

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
            new Map(Array.from(this.variables.entries()).concat([[variable, value]])),
            this.returnedValue
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

