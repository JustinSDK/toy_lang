import {Instance} from "./value.js";
import {Apply} from "./function.js";
export {Instalization, Property};

class Instalization {
    constructor(fVariable, args) {
        this.apply = new Apply(fVariable, args);
    } 

    evaluate(context) {
        return new Instance(this.apply.evaluate(context).variables);
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
        let instance = this.property.receiver(context)
                                    .setProperty(
                                        this.property.propName, 
                                        this.value.evaluate(context)
                                    );
 
        return context.assign(
            this.property.receiverName(), 
            instance
        );                                     
    }    
}