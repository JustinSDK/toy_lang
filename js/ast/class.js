import {Variable, VariableAssign, StmtSequence} from './statement.js';
import {Instance} from './value.js';
import {Apply} from './function.js';

export {Instalization, Property, MethodCall};

class Instalization {
    constructor(fVariable, args) {
        this.apply = new Apply(fVariable, args);
        this.args = args;
    }

    instance(context) {
        return new Instance(this.apply.evaluate(context).variables);
    }

    evaluate(context) {
        let thisInstance = this.instance(context);

        if(thisInstance.hasProperty('init')) {
            let method = thisInstance.method(context, 'init', this.args);
            return method.evaluate(context.childContext()).variables.get('this');
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
                   .getProperty(this.property.propName);
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
        // For simplicity, the setProperty method modifies the state directly. 
        this.receiver(context)
            .setProperty(
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
        let instance = this.propertyGetter.receiver(context);
        let method = instance.method(context, this.propertyGetter.propName(), this.args);
        return method.evaluate(context.childContext()).returnedValue;
    }    
}