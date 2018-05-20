import {Assign, StmtSequence} from './statement.js'
export {Func, Return, FunCall, FunCallWrapper};

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

class Return {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.returned(this.value.evaluate(context));
    }    
}

class Call {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
    }

    evaluate(context) {
        let f = this.fVariable.evaluate(context);
        let bodyStmt = f.bodyStmt(this.args.map(arg => arg.evaluate(context)));
        return bodyStmt.evaluate(context.childContext());
    }
}

class FunCall {
    constructor(fVariable, args) {
        this.call = new Call(fVariable, args);
    } 

    evaluate(context) {
        return this.call.evaluate(context).returnedValue;
    }    
}

class FunCallWrapper {
    constructor(funcall) {
        this.funcall = funcall;
    }

    evaluate(context) {
        this.funcall.evaluate(context);
        return context;
    }    
}

