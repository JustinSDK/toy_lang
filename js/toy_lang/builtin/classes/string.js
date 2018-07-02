
import {Primitive, Null} from '../ast_export.js';
import {PARAM1, PARAM_LT1, PARAM_LT2} from '../bases/func_bases.js';
import {func0, func1, func2, format} from '../bases/func_bases.js';
import {methodPrimitive, self, delegate} from '../bases/class_bases.js';

import {ListClass} from './list.js';

export {StringClass};

class StringClass {
    static method0Primitive(methodName) {
        return methodPrimitive(String, methodName);
    }

    static method1Primitive(methodName) {
        return methodPrimitive(String, methodName, PARAM_LT1);
    }    

    static method2Primitive(methodName) {
        return methodPrimitive(String, methodName, PARAM_LT2);
    }     
}

StringClass.EMPTY_STRING = new Primitive('');

StringClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const text = PARAM1.evaluate(context);
            self(context).internalNode = text === Null ? StringClass.EMPTY_STRING : text;
            return context;
        }
    })],
    ['toUpperCase', StringClass.method0Primitive('toUpperCase')],   
    ['toLowerCase', StringClass.method0Primitive('toLowerCase')],
    ['toString', StringClass.method0Primitive('toString')],     
    ['trim', StringClass.method0Primitive('trim')],     
    ['charAt', StringClass.method1Primitive('charAt')],
    ['charCodeAt', StringClass.method1Primitive('charCodeAt')],
    ['codePointAt', StringClass.method1Primitive('codePointAt')],
    ['endsWith', StringClass.method2Primitive('endsWith')],
    ['startsWith', StringClass.method2Primitive('startsWith')],
    ['includes', StringClass.method2Primitive('includes')],
    ['indexOf', StringClass.method2Primitive('indexOf')],
    ['lastIndexOf', StringClass.method2Primitive('lastIndexOf')],
    ['substring', StringClass.method2Primitive('substring')],
    ['slice', StringClass.method2Primitive('slice')],
    ['split', func2('split', {
        evaluate(context) {
            const arr = delegate(context, String, 'split', PARAM_LT2);
            const instance = ListClass.newInstance(context, arr.map(elem => new Primitive(elem)));
            return context.returned(instance);
        }
    })],
    ['length', func0('length', {
        evaluate(context) {
            const value = self(context).nativeValue();
            return context.returned(new Primitive(value.length));
        }    
    })],
    ['format', func0('format', {
        evaluate(context) {
            const value = self(context).nativeValue();
            const args = context.lookUpVariable('arguments').nativeValue();
            const str = format.apply(undefined, [value].concat(args.map(arg => arg.value)));
            return context.returned(new Primitive(str));
        }    
    })]
]);