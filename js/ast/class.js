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
    constructor(instance, propertyName) {
        this.instance = instance;
        this.propertyName = propertyName;
    }

    evaluate(context) {
        return this.instance.evaluate(context).value.get(this.propertyName);
    }    
}