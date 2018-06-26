import {Void} from './value.js';
import {VariableAssign, Variable, StmtSequence} from './statement.js';

export {FunCall, MethodCall};

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

        const ctx = new MethodCall(instance, methodName, args).evaluate(context);
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

class MethodCall {
    constructor(instance, methodName, args = []) {
        this.instance = instance;
        this.methodName = methodName;
        this.args = args;
    }

    methodBodyStmt(context) {
        const instance = this.instance;
        const f = instance.hasOwnProperty(this.methodName) ? instance.getOwnProperty(this.methodName).internalNode : instance.clzOfLang.internalNode.getMethod(context, this.methodName);
        const bodyStmt = f.bodyStmt(context, this.args.map(arg => arg.evaluate(context)));
        return new StmtSequence(
            new VariableAssign(Variable.of('this'), instance),  
            bodyStmt,
            bodyStmt.lineNumber
        );
    }
    
    evaluate(context) {
        const instance = this.instance;
        const fClz = instance.getOwnProperty(this.methodName);
        const clzNode = instance.clzOfLang.internalNode;
        const parentContext = clzNode.parentContext || 
                              (fClz && fClz.internalNode.parentContext); // In this case, instance is just a namespace.
    
        return this.methodBodyStmt(context).evaluate(
            parentContext ?
                parentContext.childContext() : // closure context
                context.childContext()
        );
    }
}