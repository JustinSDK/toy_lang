import {Instance} from './value.js';

export {Instalization};

class Instalization {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
    }

    instance(context) {
        const clzOfLang = this.fVariable.evaluate(context);
        return new Instance(
            clzOfLang,
            clzOfLang.internalNode.call(context, this.args).variables
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