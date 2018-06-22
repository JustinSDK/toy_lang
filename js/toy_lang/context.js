import {BUILTIN_FUNCTIONS} from './builtin/functions.js';
import {BUILTIN_CLASSES} from './builtin/classes.js';

export {Context};

const BUILTINS = new Map(
    Array.from(BUILTIN_FUNCTIONS.entries()).concat(
        Array.from(BUILTIN_CLASSES.entries())
    )
); 

const RUNTIME_CHECKER = {
    refErrIfNoValue(v, name) {
        if(!v) {
            throw new ReferenceError(`${name} is not defined`);
        }
    },

    evalErrIfNoValue(v, message) {
        if(!v) {
            throw new EvalError(message);
        }
    }
};

function self(stmt) {
    return this;
}

function call(f) {
    return f();
}

class Context {
    constructor({output, parent, variables, returnedValue, throwedValue, selfOrCall}) {
        this.output = output;
        this.parent = parent || null;
        this.variables = variables || new Map();
        this.returnedValue = returnedValue || null;
        this.throwedValue = throwedValue || null;
        this.selfOrCall = selfOrCall || call;
    }

    static initialize(environment) {
        return new Context({
            output : environment.output,
            variables : new Map(BUILTINS)
        });
    }

    childContext() {
        return new Context({
            parent : this,
            output : this.output
        });
    }

    output(value) {
        this.output(value);
        return this;
    }

    // For simple support for closure, the 'assign' method changes the state directly.
    assign(variable, value) {
        this.variables.set(variable, value);
        return this;
    }

    returned(value) {
        return new Context({
            parent : this.parent,
            output : this.output,
            variables : this.variables,
            returnedValue : value,
            selfOrCall : self
        });
    }

    thrown(value) {
        this.throwedValue = value;
        this.selfOrCall = self;
        return this;
    }

    lookUpVariable(name) {
        const value = this.variables.get(name);
        if(value !== undefined) {
            return value;
        }
        
        RUNTIME_CHECKER.refErrIfNoValue(this.parent, name);
        return this.parent.lookUpVariable(name);
    }   
    
    get RUNTIME_CHECKER() {
        return RUNTIME_CHECKER;
    }
}
