import {Instance} from './value.js';
import {Apply} from './function.js';

export {Instalization};

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
            return thisInstance.evalMethod(context, 'init', this.args).variables.get('this');
        }
        
        return thisInstance;
    }   
}