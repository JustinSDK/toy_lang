import {Void} from './value.js';

export {Return, Throw, FunCall};

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
        return maybeCtx.notThrown(ex => {
            ex.lineNumbers = [];
            return context.thrown(ex);
        });
    }    
}

class FunCall {
    constructor(func, argsList) {
        this.func = func;
        this.argsList = argsList;
    } 

    evaluate(context) {
        return callChain(context, this.func.evaluate(context).internalNode, this.argsList);
    }    

    send(context, instance) {
        const methodName = this.func.name;
        const args = this.argsList[0];

        const ctx = instance.evalMethod(context, methodName, args);
        return ctx.notThrown(c => {
            const returnedValue = c.returnedValue;
            if(this.argsList.length > 1) {
                return callChain(context, returnedValue.internalNode, this.argsList.slice(1));
            }
            return returnedValue === null ? Void : returnedValue; 
        });
    }
}

function callChain(context, f, argsList) {
    const args = argsList[0];
    const ctx = f.call(context, args);
    return ctx.notThrown(c => {
        const returnedValue = c.returnedValue;
        if(argsList.length > 1) {
            return callChain(context, returnedValue.internalNode, argsList.slice(1));
        }
        return returnedValue === null ? Void : returnedValue;
    });
}
