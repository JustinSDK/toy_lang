export {Variable, Assign, Print, While, If, StmtSequence, Context};

function nope(value) {}

class Context {
    constructor(parent = null, output = nope, variables = new Map(), returnedValue = null) {
        this.parent = parent;
        this.output = output;
        this.variables = variables;
        this.returnedValue = returnedValue;
    }

    childContext() {
        return new Context(this, this.output)
    }

    output(value) {
        this.output(value);
        return this;
    }

    assign(variable, value) {
        return new Context(
            this.parent,
            this.output,
            new Map(Array.from(this.variables.entries()).concat([[variable, value]]))
        );
    }

    returned(value) {
        return new Context(
            this.parent,
            this.output,
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
        context.output(this.value.evaluate(context).value)
        return context;
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


