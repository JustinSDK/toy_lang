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
        return f.call(context, this.args);
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

    send(context, instance) {
        const methodName = this.apply.fVariable.name;
        const args = this.apply.args;
        return instance.evalMethod(context, methodName, args).returnedValue;
    }
}
