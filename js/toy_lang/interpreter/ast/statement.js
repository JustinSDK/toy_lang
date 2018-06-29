import {Thrown, Instance, Primitive} from './value.js';
import {VariableAssign} from './assignment.js';

export {ExprWrapper, While, If, Switch, StmtSequence, Return, Throw, Try, Break};

class ExprWrapper {
    constructor(expr) {
        this.expr = expr;
    }

    evaluate(context) {
        const maybeContext = this.expr.evaluate(context);
        return maybeContext.notThrown(_ => context);
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

class Switch {
    constructor(switchValue, cases, defaultStmt) {
        this.switchValue = switchValue;
        this.cases = cases;
        this.defaultStmt = defaultStmt;
    }

    evaluate(context) {
        const maybeContext = this.switchValue.evaluate(context);
        return maybeContext.notThrown(v => {
            const maybeCtx = compareCases(context, v, this.cases);
            if(maybeCtx) {
                return maybeCtx;
            }
            return this.defaultStmt.evaluate(context);
        });
    }   
}

function compareCases(context, switchValue, cases) {
    if(cases.length === 0) {
        return false;  // no matched case
    }
    const cazeValues = cases[0][0];
    const cazeStmt = cases[0][1];
    const maybeContext = compareCaseValues(context, switchValue, cazeValues, cazeStmt);
    return maybeContext ? maybeContext : compareCases(context, switchValue, cases.slice(1));
}

function compareCaseValues(context, switchValue, cazeValues, cazeStmt) {
    if(cazeValues.length === 0) {
        return false; // no matched value
    }
    const v = cazeValues[0].evaluate(context);
    if(v.value === switchValue.value) {
        return cazeStmt.evaluate(context);
    }
    return compareCaseValues(context, switchValue, cazeValues.slice(1), cazeStmt);
}

class StmtSequence {
    constructor(firstStmt, secondStmt, lineNumber) {
        this.firstStmt = firstStmt;
        this.secondStmt = secondStmt;
        this.lineNumber = lineNumber;
    }

    evaluate(context) {
        try {
            const fstStmtContext = this.firstStmt.evaluate(context);
            return addTraceOrSecondStmt(context, fstStmtContext, this.lineNumber, this.secondStmt);
        } catch(e) {
            if(this.lineNumber) {
                addStackTrace(context, e, {
                    fileName : context.fileName,
                    lineNumber : this.lineNumber,
                    statement : context.stmtMap.get(this.lineNumber)
                });
            }
            throw e;
        }
    }

    static assigns(variables, values) {
        if(variables.length === 0) {
            return StmtSequence.EMPTY;
        }
        return new StmtSequence(
                      new VariableAssign(variables[0], values[0]), 
                      StmtSequence.assigns(variables.slice(1), values.slice(1))
                );
    }        
}

function addTraceOrSecondStmt(context, fstStmtContext, lineNumber, secondStmt) {
    return fstStmtContext.either(
        leftContext => {
            if(leftContext.thrownNode.stackTraceElements.length === 0 || 
               context !== leftContext.thrownContext) {
                leftContext.thrownNode.addStackTraceElement({
                    fileName : context.fileName,
                    lineNumber : lineNumber,
                    statement : context.stmtMap.get(lineNumber)
                });
            }
            return leftContext;
        },
        rightContext =>  rightContext.notReturn(c => secondStmt.evaluate(c))
    );
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
        const tryContext = this.tryStmt.evaluate(context);
        if(tryContext.thrownNode) {
            const thrownValue = tryContext.thrownNode.value;
            if(thrownValue.hasOwnProperty && thrownValue.hasOwnProperty('stackTraceElements')) {
                pushStackTraceElements(context, tryContext, thrownValue);
            }
        
            return runCatch(tryContext, this, thrownValue).deleteVariable(this.exceptionVar.name);
        }
        return context;
    }   
}

function pushStackTraceElements(context, tryContext, thrownValue) {
    const stackTraceElements = thrownValue.getOwnProperty('stackTraceElements').nativeValue();
    tryContext.thrownNode
              .stackTraceElements
              .map(elem => {
                  return new Instance(
                      context.lookUpVariable('Object'),
                      new Map([
                          ['fileName', new Primitive(elem.fileName)],
                          ['lineNumber', new Primitive(elem.lineNumber)],
                          ['statement', new Primitive(elem.statement)]
                      ])
                  );
              })
              .forEach(elem => stackTraceElements.push(elem));
}

function runCatch(tryContext, tryNode, thrownValue) {
    return new StmtSequence(
        new VariableAssign(tryNode.exceptionVar, thrownValue),
        tryNode.catchStmt, 
        tryNode.catchStmt.lineNumber
    ).evaluate(tryContext.emptyThrown());
}

const Break = {
    evaluate(context) { 
        return context;
    }
};