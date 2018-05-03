export {Variable, Assign, Print, While, If, StmtSequence, Func, Return, FunCall, Context};

class Context {
    constructor(parent = null, outputs = [], variables = new Map(), returnedValue = null) {
        this.parent = parent;
        this.outputs = outputs;
        this.variables = variables;
        this.returnedValue = returnedValue;
    }

    output(value) {
        return new Context(
            this.parent,
            this.outputs.concat([value]),
            this.variables
        );
    }

    assign(variable, value) {
        return new Context(
            this.parent,
            this.outputs,
            new Map(Array.from(this.variables.entries()).concat([[variable, value]]))
        );
    }

    returned(value) {
        return new Context(
            this.parent,
            this.outputs,
            this.variables,
            value
        );
    }
}

class Variable {
    constructor(name) {
        this.name = name;
    }

    evaluate(context) {
        if(this.name.charAt(0) === '-') {
            return new Num(lookUpVariable(context, this.name.slice(1)).value * -1) ;
        }
        return lookUpVariable(context, this.name);
    }
}

class Assign {
    constructor(variable, value) {
        this.variable = variable;
        this.value = value;
    }

    evaluate(context) {
        return context.assign(this.variable.name, this.value.evaluate(context));
    }
}

function lookUpVariable(context, name) {
    let value = context.variables.get(name);
    return value === undefined ? lookUpVariable(context.parent, name) : value;
}

class Print {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.output(this.value.evaluate(context).value);
    }
}


class While {
    constructor(boolean, stmt) {
        this.boolean = boolean;
        this.stmt = stmt;
    }

    evaluate(context) {
        if(this.boolean.evaluate(context).value) {
            let ctx = this.stmt.evaluate(context);
            return this.evaluate(ctx);
        }

        return context;
    }   
}

class If {
    constructor(boolean, trueStmt, falseStmt) {
        this.boolean = boolean;
        this.trueStmt = trueStmt;
        this.falseStmt = falseStmt;
    }

    evaluate(context) {
        if(this.boolean.evaluate(context).value) {
            return this.trueStmt.evaluate(context);
        }

        return this.falseStmt.evaluate(context);
    }   
}

class StmtSequence {
    constructor(firstStmt, secondStmt) {
        this.firstStmt = firstStmt;
        this.secondStmt = secondStmt;
    }

    evaluate(context) {
        let ctx = this.firstStmt.evaluate(context);
        if(ctx.returnedValue === null) {
            return this.secondStmt.evaluate(ctx);
        }
        return ctx;
    }
}

StmtSequence.EMPTY = {
    evaluate(context) {
        return context;
    }
};

class Return {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.returned(this.value.evaluate(context));
    }    
}

class Func {
    constructor(params, stmt) {
        this.params = params;
        this.stmt = stmt;
    }

    call(args) {
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
                  new Assign(new Variable(params[0]), args[0]), 
                  assigns(params.slice(1), args.slice(1))
            );
}

class FunCall {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
    }

    evaluate(context) {
        let f = this.fVariable.evaluate(context);
        let stmt = f.call(this.args.map(arg => arg.evaluate(context)));
        let ctx = stmt.evaluate(new Context(context, context.outputs));
        if(ctx.returnedValue !== null) {
            // we can get returned value now
            console.log(ctx.returnedValue.value);
        }
        return new Context(context.parent, ctx.outputs, context.variables);
    }    
}