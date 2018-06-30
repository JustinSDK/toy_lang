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

const defaultFlowConrtoller = {
    either : eitherRight,
    returnedValue : null,
    notReturn : call,
    thrownContext : null,
    thrownNode : null,
    notThrown : call
};

function createFlowController({either, returnedValue, notReturn, thrownContext, thrownNode, notThrown}) {
    return {
        either : either || defaultFlowConrtoller.either,
        returnedValue : returnedValue || defaultFlowConrtoller.either,
        notReturn : notReturn || defaultFlowConrtoller.notReturn,
        thrownContext : thrownContext || defaultFlowConrtoller.thrownContext,
        thrownNode : thrownNode || defaultFlowConrtoller.thrownNode,
        notThrown : notThrown || defaultFlowConrtoller.notThrown
    };
}

class Context { 
    constructor({fileName, stmtMap, output, parent, variables, flowController}) {
        this.fileName = fileName;
        this.stmtMap = stmtMap;
        this.output = output;
        this.parent = parent || null;
        this.variables = variables || new Map();
        this.flowController = flowController || defaultFlowConrtoller;
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
            flowController : createFlowController({returnedValue : value, notReturn : self})
        });
    }

    thrown(thrownNode) {
        return new Context({
            fileName : this.fileName,
            stmtMap : this.stmtMap,
            parent : this.parent,
            output : this.output,
            variables : this.variables,
            flowController : createFlowController({
                either : eitherLeft,
                thrownContext : this,
                thrownNode : thrownNode,
                notThrown : self
            })
        });
    }

    emptyThrown() {
        return new Context({
            fileName : this.fileName,
            stmtMap : this.stmtMap,
            parent : this.parent,
            output : this.output,
            variables : this.variables,
            flowController : createFlowController({thrownContext : this})
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

    get either() {
        return this.flowController.either;
    }

    get returnedValue() {
        return this.flowController.returnedValue;
    }

    get notReturn() {
        return this.flowController.notReturn;
    }

    get thrownContext() {
        return this.flowController.thrownContext;
    }

    get thrownNode() {
        return this.flowController.thrownNode;
    }

    get notThrown() {
        return this.flowController.notThrown;
    }
}
