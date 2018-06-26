import {Thrown} from './value.js';

export {ExprWrapper, Variable, VariableAssign, PropertyAssign, While, If, StmtSequence, Return, Throw, Try};

class ExprWrapper {
    constructor(expr) {
        this.expr = expr;
    }

    evaluate(context) {
        const maybeContext = this.expr.evaluate(context);
        return maybeContext.notThrown(_ => context);
    }    
}

const variables = new Map();

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

    static of(name) {
        if(variables.has(name)) {
            return variables.get(name);
        }
        const variable = new Variable(name);
        variables.set(name, variable);
        return variable;
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
                    if(leftContext.thrownNode.stackTraceElements.length === 0 || 
                       context !== leftContext.thrownContext) {
                        leftContext.thrownNode.addStackTraceElement({
                            fileName : context.fileName,
                            lineNumber : this.lineNumber,
                            statement : context.stmtMap.get(this.lineNumber)
                        });
                    }
                    return leftContext;
                },
                rightContext =>  rightContext.notReturn(c => this.secondStmt.evaluate(c))
            );
        } catch(e) {
            addStackTrace(context, e, {
                fileName : context.fileName,
                lineNumber : this.lineNumber,
                statement : context.stmtMap.get(this.lineNumber)
            });
            throw e;
        }
    }
}

function addStackTrace(context, e, strackTraceElement) {
    if(!e.strackTraceElements) {
        e.strackTraceElements = [strackTraceElement];
        e.context = context;
    }
    if(e.context !== context) {
        e.context = context;
        e.strackTraceElements.push(strackTraceElement);
    }
}

StmtSequence.EMPTY = {
    // We don't care about emtpy statements so the lineNumber 0 is enough.
    lineNumber : 0, 
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


class Return {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        const maybeCtx = this.value.evaluate(context);
        return maybeCtx.notThrown(value => context.returned(value));
    }    
}

class Throw {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        const maybeCtx = this.value.evaluate(context);
        return maybeCtx.notThrown(v => {
            return context.thrown(new Thrown(v));
        });
    }    
}

class Try {
    constructor(tryStmt, exceptionVar, catchStmt) {
        this.tryStmt = tryStmt;
        this.exceptionVar = exceptionVar;
        this.catchStmt = catchStmt;
    }

    evaluate(context) {
        const maybeContext = this.tryStmt.evaluate(context);
        if(maybeContext.thrownNode) {
            const ctx = new StmtSequence(
                new VariableAssign(this.exceptionVar, maybeContext.thrownNode.value),
                this.catchStmt, 
                this.catchStmt.lineNumber
            ).evaluate(context);
        
            return ctx.deleteVariable(this.exceptionVar.name);
        }
        return context;
    }   
}