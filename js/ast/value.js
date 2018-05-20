import {Assign, StmtSequence} from './statement.js'
export {Primitive, Func, Void};

class Primitive {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}

class Func {
    constructor(params, stmt) {
        this.params = params;
        this.stmt = stmt;
    }

    bodyStmt(args) {
        return new StmtSequence(Assign.assigns(this.params, args), this.stmt);
    }

    evaluate(context) {
        return this;
    }
}

const Void = {
    evaluate(context) {
        return this;
    }    
};