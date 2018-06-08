import {Instance} from './value.js';
import {Apply} from './function.js';

export {Instalization};

function evalMethod(context, instance, methodName, args) {
    const methodBodyStmt = instance.methodBodyStmt(context, methodName, args);
    const fClz = instance.getOwnProperty(methodName);
    const clzNode = instance.clzOfLang.internalNode;
    const parentContext = clzNode.parentContext || 
                          (fClz && fClz.internalNode.parentContext); // In this case, instance is just a namespace.

    return methodBodyStmt.evaluate(
        parentContext ?
            parentContext.childContext() : // closure context
            context.childContext()
    );
}

class Instalization {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
        this.apply = new Apply(fVariable, args);
    }

    instance(context) {
        const clzOfLang = this.fVariable.evaluate(context);
        return new Instance(
            clzOfLang,
            this.apply.evaluate(context).variables
        );
    }

    evaluate(context) {
        const thisInstance = this.instance(context);

        if(thisInstance.hasProperty('init')) {
            return evalMethod(context, thisInstance, 'init', this.args).variables.get('this');
        }
        
        return thisInstance;
    }   
}