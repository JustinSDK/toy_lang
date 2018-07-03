import {Thrown, Instance, Primitive} from './value.js';

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
        let ctx = context;
        while(true) {
            const maybeContext = this.boolean.evaluate(ctx);
            if(maybeContext.thrownNode) {
                return maybeContext;
            }

            if(maybeContext.value) {
                ctx = this.stmt.evaluate(ctx);
                if(ctx.thrownNode || ctx.returnedValue) {
                    return ctx;
                }
                if(ctx.isBroken()) {
                    return ctx.fixBroken();
                }
            } else { break; }
        }
        return ctx;

        /*
            To avoid 'Maximum call stack size exceeded', the above code is the only place which uses 'while'.
            The corresponding code with the functional style is shown below.
         */

        // const maybeContext = this.boolean.evaluate(context);
        // return maybeContext.notThrown(v => {
        //     if(v.value) {
        //         const ctx = this.stmt.evaluate(context);
        //         return ctx.either(
        //             leftContext => leftContext, 
        //             rightContext => rightContext.notReturn(
        //                 c => c.isBroken() ? c.fixBroken() : this.evaluate(c)        
        //             )
        //         );
        //     }    
        //     return context;
        // });
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
        return maybeContext.notThrown(
            v => v.value ? this.trueStmt.evaluate(context) : this.falseStmt.evaluate(context)
        );
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
        return maybeContext.notThrown(
            v => compareCases(context, v, this.cases) || this.defaultStmt.evaluate(context)
        );
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
            return addTraceOrStmt(context, fstStmtContext, this.lineNumber, this.secondStmt);
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
}

function addTraceOrStmt(context, preStmtContext, lineNumber, stmt) {
    return preStmtContext.either(
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
        rightContext => rightContext.notReturn(
            ctx => ctx.notBroken(c => stmt.evaluate(c))  
        )
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
        return maybeCtx.notThrown(v => context.thrown(new Thrown(v)));
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
    return tryNode.catchStmt.evaluate(
        tryContext.emptyThrown().assign(tryNode.exceptionVar.name, thrownValue)
    );
}

const Break = {
    evaluate(context) {
        return context.broken();
    }
};