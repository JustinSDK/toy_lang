export {ExprWrapper, Variable, VariableAssign, PropertyAssign, While, If, StmtSequence};

class ExprWrapper {
    constructor(expr) {
        this.expr = expr;
    }

    evaluate(context) {
        const maybeContext = this.expr.evaluate(context);
        return maybeContext.notThrown(_ => context);
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
        const maybeContext = this.value.evaluate(context);
        return maybeContext.notThrown(value => {
             return context.assign(this.variable.name, value);
        });
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
        const maybeContext = this.boolean.evaluate(context);
        return maybeContext.notThrown(v => {
            if(v.value) {
                const ctx = this.stmt.evaluate(context);
                return this.evaluate(ctx);
            }
    
            return context;
        });
    }   
}

class If {
    constructor(boolean, trueStmt, falseStmt) {
        this.boolean = boolean;
        this.trueStmt = trueStmt;
        this.falseStmt = falseStmt;
    }

    evaluate(context) {
        const maybeContext = this.boolean.evaluate(context);
        return maybeContext.notThrown(v => {
            if(v.value) {
                return this.trueStmt.evaluate(context);
            }
            return this.falseStmt.evaluate(context);
        });
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
            return ctx.either(
                leftContext => {
                    if(leftContext.throwedValue.lineNumbers.length === 0) {
                        leftContext.throwedValue.lineNumbers.push(this.lineNumber);
                    }
                    else if(context !== leftContext.thrownContext) {
                        leftContext.throwedValue.lineNumbers.push(this.lineNumber);
                    }
                    return leftContext;
                },
                rightContext => {
                    return rightContext.selfOrCall(c => this.secondStmt.evaluate(c))
                }
            );
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
        const maybeContextInstance = this.target.evaluate(context);
        return maybeContextInstance.notThrown(instance => { 
            const maybeContextValue  = this.value.evaluate(context);
            return maybeContextValue.notThrown(value => {
                instance.setOwnProperty(this.propName, value);
                return context;
            });
        });
    }
}