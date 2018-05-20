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
    constructor(receiver, propertyName) {
        this.receiver = receiver;
        this.propertyName = propertyName;
    }

    evaluate(context) {
        return this.receiver.evaluate(context).value.get(this.propertyName);
    }    
}