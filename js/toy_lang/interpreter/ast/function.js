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
    constructor(fVariable, argsList) {
        this.fVariable = fVariable;
        this.argsList = argsList;
    } 

    evaluate(context) {
        return callChain(context, this.fVariable.evaluate(context).internalNode, this.argsList);
    }    

    send(context, instance) {
        const methodName = this.fVariable.name;
        const args = this.argsList[0];
        const returnedValue = instance.evalMethod(context, methodName, args).returnedValue;

        if(this.argsList.length > 1) {
            return callChain(context, returnedValue.internalNode, this.argsList.slice(1));
        }
        return returnedValue; 
    }
}

function callChain(context, f, argsList) {
    const args = argsList[0];
    const returnedValue = f.call(context, args).returnedValue;
    if(argsList.length > 1) {
        return callChain(context, returnedValue.internalNode, argsList.slice(1));
    }
    return returnedValue === null ? Void : returnedValue;
}
