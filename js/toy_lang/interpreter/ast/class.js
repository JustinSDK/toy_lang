import {Variable, VariableAssign, StmtSequence} from './statement.js';
import {Instance} from './value.js';
import {Apply} from './function.js';

export {Instalization, Properties, MethodCall};

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

class Properties {
    constructor(variable, propNames) {
        this.variable = variable;
        this.propNames = propNames;
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

    variable() {
        return this.property.variable;
    }

    propName() {
        return this.property.propNames[0];
    }

    evaluate(context) {
        return targetProp(context, this.variable().evaluate(context), this.property.propNames);
    }    
}

function targetProp(context, instance, propNames) {
    if(propNames.length === 0) {
        return instance;
    }

    return targetProp(
        context,
        instance.getProperty(propNames[0]).evaluate(context),
        propNames.slice(1)
    );
}

class PropertySetter {
    constructor(property, value) {
        this.property = property;
        this.value = value;
    }

    variable() {
        return this.property.variable;
    }    

    evaluate(context) {
        // For simplicity, the setOwnProperty method modifies the state directly.
        let instance = targetProp(
            context, 
            this.variable().evaluate(context), 
            this.property.propNames.slice(0, -1)
        ); 
        instance.setOwnProperty(
                this.property.propNames[this.property.propNames.length - 1], 
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
        const instance = this.propertyGetter.variable().evaluate(context);
        return evalMethod(context, instance, this.propertyGetter.propName(), this.args).returnedValue;
    }    
}