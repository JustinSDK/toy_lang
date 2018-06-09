import {Void} from './value.js';

export {Return, FunCall};

class Return {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.returned(this.value.evaluate(context));
    }    
}

class FunCall {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
    } 

    evaluate(context) {
        const f = this.fVariable.evaluate(context).internalNode;
        const returnedValue = f.call(context, this.args).returnedValue;
        return  returnedValue === null ? Void : returnedValue;
    }    

    send(context, instance) {
        const methodName = this.fVariable.name;
        const args = this.args;
        return instance.evalMethod(context, methodName, args).returnedValue;
    }
}
