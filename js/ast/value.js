import {Assign, StmtSequence} from './statement.js'
export {Primitive, Func, Void};

class Value {
    evaluate(context) {
        return this;
    }      
}

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
        return new StmtSequence(Assign.assigns(this.params, args), this.stmt);
    }
}

const Void = new Value();