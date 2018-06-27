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
        return new MethodCall(instance, methodName, this.argsList).evaluate(context);
    }
}

function callChain(context, f, argsList) {
    const args = argsList[0];
    return f.call(context, args).notThrown(c => {
        const returnedValue = c.returnedValue;
        if(argsList.length > 1) {
            return callChain(context, returnedValue.internalNode, argsList.slice(1));
        }
        return returnedValue === null ? Void : returnedValue;
    });
}

class MethodCall {
    constructor(instance, methodName, argsList = []) {
        this.instance = instance;
        this.methodName = methodName;
        this.argsList = argsList;
    }

    evaluate(context) {
        return methodBodyStmt(context, this.instance, this.methodName, this.argsList[0])
                        .evaluate(methodContextFrom(context, this.instance, this.methodName))
                        .notThrown(c => {
                            if(this.argsList.length > 1) {
                                return callChain(context, c.returnedValue.internalNode, this.argsList.slice(1));
                            }
                            return c.returnedValue === null ? Void : c.returnedValue; 
                        });
    }
}

function methodBodyStmt(context, instance, methodName, args = []) {
    const f = instance.hasOwnProperty(methodName) ? instance.getOwnProperty(methodName).internalNode : instance.clzNodeOfLang().getMethod(context, methodName);
    const bodyStmt = f.bodyStmt(context, args.map(arg => arg.evaluate(context)));
    return new StmtSequence(
        new VariableAssign(Variable.of('this'), instance),  
        bodyStmt,
        bodyStmt.lineNumber
    );
}

function methodContextFrom(context, instance, methodName) {
    const fClz = instance.getOwnProperty(methodName);
    const parentContext = instance.clzNodeOfLang().parentContext || 
                          (fClz && fClz.internalNode.parentContext); // In this case, instance is just a namespace.
    return parentContext ? parentContext.childContext() : // closure context
                           context.childContext()
}