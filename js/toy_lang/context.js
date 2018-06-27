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

function self(f) {
    return this;
}

function call(f) {
    return f(this);
}

function eitherRight(left, right) {
    return right(this);
}

function eitherLeft(left, right) {
    return left(this);
}

class Context { 
    constructor({fileName, stmtMap, output, parent, variables, returnedValue, notReturn, either, thrownContext, thrownNode, notThrown}) {
        this.fileName = fileName;
        this.stmtMap = stmtMap;
        this.output = output;
        this.parent = parent || null;
        this.variables = variables || new Map();
        this.returnedValue = returnedValue || null;
        this.notReturn = notReturn || call;
        this.either = either || eitherRight;
        this.thrownContext = thrownContext || null;
        this.thrownNode = thrownNode || null;
        this.notThrown = notThrown || call; 
    }

    static initialize(environment, fileName, stmtMap) {
        return new Context({
            fileName : fileName,
            stmtMap : stmtMap,
            output : environment.output,
            variables : new Map(BUILTINS)
        });
    }

    childContext() {
        return new Context({
            fileName : this.fileName,
            stmtMap : this.stmtMap,
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
            fileName : this.fileName,
            stmtMap : this.stmtMap,
            parent : this.parent,
            output : this.output,
            variables : this.variables,
            returnedValue : value,
            notReturn : self
        });
    }

    thrown(thrownNode) {
        return new Context({
            fileName : this.fileName,
            stmtMap : this.stmtMap,
            parent : this.parent,
            output : this.output,
            variables : this.variables,
            either : eitherLeft,
            thrownContext : this,
            thrownNode : thrownNode,
            notThrown : self
        });
    }

    emptyThrown() {
        return new Context({
            fileName : this.fileName,
            stmtMap : this.stmtMap,
            parent : this.parent,
            output : this.output,
            variables : this.variables,
            thrownContext : this
        });
    }

    deleteVariable(name) {
        this.variables.delete(name);
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
