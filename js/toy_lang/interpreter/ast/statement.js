export {ExprWrapper, Variable, VariableAssign, PropertyAssign, While, If, StmtSequence};

class ExprWrapper {
    constructor(expr) {
        this.expr = expr;
    }

    evaluate(context) {
        const ctxOrValue = this.expr.evaluate(context);

        if(ctxOrValue.throwedValue) {
            return ctxOrValue;
        }

        return context;
    }    
}

class Variable {
    constructor(name) {
        this.name = name;
    }

    evaluate(context) {
        return context.lookUpVariable(this.name);
    }

    send(context, instance) {
        return instance.getProperty(context, this.name).evaluate(context);
    }
}

class VariableAssign {
    constructor(variable, value) {
        this.variable = variable;
        this.value = value;
    }

    evaluate(context) {
        const ctxOrValue = this.value.evaluate(context);

        if(ctxOrValue.throwedValue) {
            return  ctxOrValue;
        }
        
        return context.assign(this.variable.name, ctxOrValue);;
    }

    static assigns(variables, values) {
        if(variables.length === 0) {
            return StmtSequence.EMPTY;
        }
        return new StmtSequence(
                      new VariableAssign(variables[0], values[0]), 
                      VariableAssign.assigns(variables.slice(1), values.slice(1))
                );
    }    
}

class While {
    constructor(boolean, stmt) {
        this.boolean = boolean;
        this.stmt = stmt;
    }

    evaluate(context) {
        const ctxOrValue = this.boolean.evaluate(context);
        if(ctxOrValue.throwedValue) {
            return  ctxOrValue;
        }

        if(ctxOrValue.value) {
            const ctx = this.stmt.evaluate(context);
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
        const ctxOrValue = this.boolean.evaluate(context);
        if(ctxOrValue.throwedValue) {
            return ctxOrValue;
        }

        if(ctxOrValue.value) {
            return this.trueStmt.evaluate(context);
        }

        return this.falseStmt.evaluate(context);
    }   
}

class StmtSequence {
    constructor(firstStmt, secondStmt, lineNumber) {
        this.firstStmt = firstStmt;
        this.secondStmt = secondStmt;
        this.lineNumber = lineNumber;
    }

    evaluate(context) {
        try {
            const ctx = this.firstStmt.evaluate(context);

            if(ctx.throwedValue) {
                if(context === ctx && ctx.throwedValue.lineNumbers.length === 0) {
                    ctx.throwedValue.lineNumbers.push(this.lineNumber);
                }
                else if(context !== ctx) {
                    ctx.throwedValue.lineNumbers.push(this.lineNumber);
                }
                return ctx;
            }

            return ctx.selfOrEval(this.secondStmt);
        } catch(e) {
            if(!e.lineNumbers) {
                e.lineNumbers = [this.lineNumber];
                e.context = context;
            }
            if(e.context !== context) {
                e.context = context;
                e.lineNumbers.push(this.lineNumber);
            }
            throw e;
        }
    }
}

StmtSequence.EMPTY = {
    evaluate(context) {
        return context;
    }
};

class PropertyAssign {
    constructor(target, propName, value) {
        this.target = target;
        this.propName = propName;
        this.value = value;
    }

    evaluate(context) {
        const instance = this.target.evaluate(context);
        const ctxOrValue  = this.value.evaluate(context);

        if(ctxOrValue.throwedValue) {
            return ctxOrValue; 
        }

        instance.setOwnProperty(this.propName, ctxOrValue);
        return context;
    }
}