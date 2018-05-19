import {FunCall} from "./function.js";
export {Instalization};

class Instalization extends FunCall {
    evaluate(context) {
        return this.call(context).variables;
    }   
}