import {VariableAssign, StmtSequence} from './statement.js'
export {Primitive, Func, Void, Instance};

class Value {
    evaluate(context) {
        return this;
    }      
}

// number, text, boolean
class Primitive extends Value {
    constructor(value) {
        super();
        this.value = value;
    }
}

class Func extends Value {
    constructor(params, stmt) {
        super();
        this.params = params;
        this.stmt = stmt;
    }

    bodyStmt(args) {
        return new StmtSequence(VariableAssign.assigns(this.params, args), this.stmt);
    }
}

const Void = new Value();

class Instance extends Value {
    constructor(variables) {
        super();
        this.variables = variables;
    }
}
