import {Instance} from "./value.js";
import {Apply} from "./function.js";
export {Instalization, PropertyGetter};

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

    evaluate(context) {
        return this.receiver.evaluate(context);
    }    
}

class PropertyGetter extends Property {
    constructor(receiver, name) {
        super(receiver, name);
    }

    evaluate(context) {
        return super.evaluate(context).getProperty(this.name);
    }    
}