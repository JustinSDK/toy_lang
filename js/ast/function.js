import {Assign, StmtSequence} from './statement.js'
export {Func, Return, FunCall, FunCallWrapper};

class Func {
    constructor(params, stmt) {
        this.params = params;
        this.stmt = stmt;
    }

    bodyStmt(args) {
        return new StmtSequence(assigns(this.params, args), this.stmt);
    }

    evaluate(context) {
        return this;
    }
}

function assigns(params, args) {
    if(params.length === 0) {
        return StmtSequence.EMPTY;
    }
    return new StmtSequence(
                  new Assign(params[0], args[0]), 
                  assigns(params.slice(1), args.slice(1))
            );
}

class Return {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.returned(this.value.evaluate(context));
    }    
}

class FunCall {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
    }

    call(context) {
        let f = this.fVariable.evaluate(context);
        let bodyStmt = f.bodyStmt(this.args.map(arg => arg.evaluate(context)));
        return bodyStmt.evaluate(context.childContext());
    }    

    evaluate(context) {
        return this.call(context).returnedValue;
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

