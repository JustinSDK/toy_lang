import {Void} from './value.js';

export {Return, Apply, FunCall};

class Return {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.returned(this.value.evaluate(context));
    }    
}

class Apply {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
    }

    evaluate(context) {
        const f = this.fVariable.evaluate(context).internalNode;
        const bodyStmt = f.bodyStmt(this.args.map(arg => arg.evaluate(context)));
        return bodyStmt.evaluate(
            f.parentContext ? 
                f.parentContext.childContext() : // closure context
                context.childContext()
        );
    }
}

class FunCall {
    constructor(fVariable, args) {
        this.apply = new Apply(fVariable, args);
    } 

    evaluate(context) {
        const returnedValue = this.apply.evaluate(context).returnedValue;
        return  returnedValue === null ? Void : returnedValue;
    }    
}
