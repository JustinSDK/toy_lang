export {FunCall};

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

