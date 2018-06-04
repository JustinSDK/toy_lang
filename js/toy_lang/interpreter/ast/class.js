import {Variable, VariableAssign, StmtSequence} from './statement.js';
import {Instance} from './value.js';
import {Apply} from './function.js';

export {Instalization, Property, MethodCall};

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

class Property {
    constructor(variable, propName) {
        this.variable = variable;
        this.propName = propName;
    }

    receiverName() {
        return this.variable.name;
    }

    receiver(context) {
        return this.variable.evaluate(context);
    } 

    getter() {
        return new PropertyGetter(this);
    }

    setter(value) {
        return new PropertySetter(this, value);
    }
}

class PropertyGetter {
    constructor(property) {
        this.property = property;
    }

    receiver(context) {
        return this.property.receiver(context);
    }

    propName() {
        return this.property.propName;
    }

    evaluate(context) {
        return this.receiver(context)
                   .getProperty(this.property.propName)
                   .evaluate(context);
    }    
}

class PropertySetter {
    constructor(property, value) {
        this.property = property;
        this.value = value;
    }

    receiver(context) {
        return this.property.receiver(context);
    }    

    evaluate(context) {
        // For simplicity, the setOwnProperty method modifies the state directly. 
        this.receiver(context)
            .setOwnProperty(
                this.property.propName, 
                this.value.evaluate(context)
            );
 
        return context;                                     
    }    
}

class MethodCall {
    constructor(propertyGetter, args) {
        this.propertyGetter = propertyGetter;
        this.args = args;
    } 

    evaluate(context) {
        const instance = this.propertyGetter.receiver(context);
        return evalMethod(context, instance, this.propertyGetter.propName(), this.args).returnedValue;
    }    
}