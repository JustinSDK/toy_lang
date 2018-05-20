import {Apply} from "./function.js";
export {Instalization};

class Instalization {
    constructor(fVariable, args) {
        this.apply = new Apply(fVariable, args);
    } 

    evaluate(context) {
        return this.apply.evaluate(context).variables;
    }   
}