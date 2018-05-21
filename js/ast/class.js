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
    constructor(receiver, name) {
        this.receiver = receiver;
        this.name = name;
    }

    evaluateReceiver(context) {
        return this.receiver.evaluate(context);
    } 

    getter() {
        return new PropertyGetter(this);
    }

    setter() {
        return new PropertySetter(this);
    }
}

class PropertyGetter {
    constructor(property) {
        this.property = property;
    }

    evaluate(context) {
        return this.property.evaluateReceiver(context).getProperty(this.property.name);
    }    
}

class PropertySetter {
    constructor(property) {
        this.property = property;
    }

    evaluate(context) {
        let instance = this.property.evaluateReceiver(context)
                                    .setProperty(this.name, this.value.evaluate(context));
 
         return context.assign(this.variable.name, instance);;                                     
    }    
}