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

        let init = new StmtSequence(
            // here is 'this' ... XD
            new VariableAssign(new Variable('this'), thisInstance),  
            thisInstance.getProperty('init')
                        .bodyStmt(this.args.map(arg => arg.evaluate(context)))
        );
        
        return init.evaluate(context.childContext()).variables.get('this');  
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

    evaluate(context) {
        return this.property.receiver(context)
                            .getProperty(this.property.propName);
    }    
}

class PropertySetter {
    constructor(property, value) {
        this.property = property;
        this.value = value;
    }

    evaluate(context) {
        // For simplicity, the setProperty method modifies the state directly. 
        this.property.receiver(context)
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
        let receiver = this.propertyGetter.property.receiver(context);
        let f = this.propertyGetter.evaluate(context);

        let method = new StmtSequence(
            new VariableAssign(new Variable('this'), receiver),  
            f.bodyStmt(this.args.map(arg => arg.evaluate(context)))
        );

        return method.evaluate(context).returnedValue;
    }    
}