import {Func, Class, Instance} from './value.js';

export {Variable, VariableAssign, PropertyAssign, While, If, StmtSequence};

function nope(value) {}

class Variable {
    constructor(name) {
        this.name = name;
    }

    evaluate(context) {
        return lookUpVariable(context, this.name);
    }
}

class VariableAssign {
    constructor(variable, value) {
        this.variable = variable;
        this.value = value;
    }

    evaluate(context) {
        return context.assign(this.variable.name, this.value.evaluate(context));;
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

function lookUpVariable(context, name) {
    const value = context.variables.get(name);
    return value === undefined ? lookUpVariable(context.parent, name) : value;
}

class While {
    constructor(boolean, stmt) {
        this.boolean = boolean;
        this.stmt = stmt;
    }

    evaluate(context) {
        if(this.boolean.evaluate(context).value) {
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
        if(this.boolean.evaluate(context).value) {
            return this.trueStmt.evaluate(context);
        }

        return this.falseStmt.evaluate(context);
    }   
}

function isFuncStmt(stmt) {
    return stmt instanceof VariableAssign && stmt.value instanceof Func;
}

function assignFunctionInstance(context, stmt) {
    const f = stmt.value;
    const fclz = lookUpVariable(context, f.nodeName());
    const instance = new Instance(fclz, fclz.internalNode.methods, f.withParentContext(context));
    return context.assign(stmt.variable.name, instance);
}

class StmtSequence {
    constructor(firstStmt, secondStmt) {
        this.firstStmt = firstStmt;
        this.secondStmt = secondStmt;
    }

    evaluate(context) {
        const evaluatedCtx = this.firstStmt.evaluate(context);
        const ctx = isFuncStmt(this.firstStmt) ? assignFunctionInstance(evaluatedCtx, this.firstStmt) : evaluatedCtx;

        // not return stmt
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

class PropertyAssign {
    constructor(property, value) {
        this.property = property.setter(value);
    }

    evaluate(context) {
        return this.property.evaluate(context);
    }
}