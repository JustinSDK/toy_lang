import {Primitive, Instance, Void, Null} from '../interpreter/ast/value.js';
import {PARAM1, PARAM2, PARAM_LT1, PARAM_LT2, PARAM_LT3} from './func_bases.js';
import {func0, func1, func2} from './func_bases.js';
import {Native, methodPrimitive, methodVoid, methodSelf, methodNewSameType, self, selfInternalValue} from './class_bases.js';

export {StringClass, ListClass};

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
            let text = PARAM1.evaluate(context);
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
            const instance = ListClass.listInstance(context, arr.map(elem => new Primitive(elem)));
            return context.returned(instance);
        }
    })],
    ['length', func0('length', {
        evaluate(context) {
            const value = selfInternalValue(context);
            return context.returned(new Primitive(value.length));
        }    
    })]
]);

class ListClass {
    static method0Primitive(methodName) {
        return methodPrimitive(Array, methodName);
    }

    static method0Self(methodName) {
        return methodSelf(Array, methodName);
    }          

    static method1Void(methodName) {
        return methodVoid(Array, methodName, PARAM_LT1);
    }         
    
    static method1Primitive(methodName) {
        return methodPrimitive(Array, methodName, PARAM_LT1);
    }  

    static method2NewList(methodName) {
        return methodNewSameType(Array, methodName, PARAM_LT2);
    }     

    static method3Self(methodName) {
        return methodSelf(Array, methodName, PARAM_LT3);
    }  
    
    static listInstance(context, jsArray) {
        return new Instance(
            context.lookUpVariable('List'),
            new Map(), 
            new Native(jsArray)
        );
    }

    static predictableMethod(context, fName) {
        const arr = selfInternalValue(context);
        const fNode = PARAM1.evaluate(context).internalNode;
        return arr[fName](elem => {
            const bool = fNode.call(context, [elem]).returnedValue;
            return bool.value;
        });
    }  
}

ListClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const value = PARAM1.evaluate(context).value;
            const nativeObj = new Native(new Array(value ? value : 0));
            self(context).internalNode = nativeObj;
            return context;
        }
    })],
    ['toString', ListClass.method0Primitive('toString')],
    ['slice', ListClass.method2NewList('slice')],
    ['join', ListClass.method1Primitive('join')],
    ['reverse', ListClass.method0Self('reverse')],       
    ['fill', ListClass.method3Self('fill')],
    ['add', func1('add', {
        evaluate(context) {
            const arg = PARAM1.evaluate(context);
            selfInternalValue(context).push(arg);
            return context.returned(self(context));
        }    
    })],
    ['get', func1('get', {
        evaluate(context) {
            const idx = PARAM1.evaluate(context).value;
            return context.returned(selfInternalValue(context)[idx]);
        }    
    })],
    ['set', func2('set', {
        evaluate(context) {
            const idx = PARAM1.evaluate(context).value;
            const elem = PARAM2.evaluate(context);
            selfInternalValue(context)[idx] = elem;
            return context.returned(Void);
        }    
    })],
    ['length', func0('length', {
        evaluate(context) {
            return context.returned(new Primitive(selfInternalValue(context).length));
        }    
    })],    
    ['isEmpty', func0('isEmpty', {
        evaluate(context) {
            return context.returned(Primitive.boolNode(selfInternalValue(context).length === 0));
        }    
    })],
    ['filter', func1('filter', {
        evaluate(context) {           
            return context.returned(
                ListClass.listInstance(
                    context,
                    ListClass.predictableMethod(context, 'filter')
                )
            );
        }    
    })],
    ['map', func1('map', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const fNode = PARAM1.evaluate(context).internalNode;
            const mapped = arr.map(elem => fNode.call(context, [elem]).returnedValue);
            return context.returned(ListClass.listInstance(context, mapped));
        }    
    })],
    ['forEach', func1('forEach', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const fNode = PARAM1.evaluate(context).internalNode;
            arr.forEach(elem => fNode.call(context, [elem]));
            return context.returned(Void);
        }    
    })],    
    ['all', func1('all', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(ListClass.predictableMethod(context, 'every'))
            );
        }    
    })],
    ['any', func1('any', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(ListClass.predictableMethod(context, 'some'))
            );
        }    
    })],    
    ['find', func1('find', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const fNode = PARAM1.evaluate(context).internalNode;
            const r = arr.find(elem => {
                const bool = fNode.call(context, [elem]).returnedValue;
                return bool.value;
            });
            return context.returned(r || Null);
        }    
    })],  
    ['includes', func1('includes', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const target = PARAM1.evaluate(context);
            return context.returned(
                Primitive.boolNode(arr.some(elem => elem.value === target.value))
            );
        }    
    })],  
    ['indexOf', func1('indexOf', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const target = PARAM1.evaluate(context);
            return context.returned(
                new Primitive(arr.findIndex(elem => elem.value === target.value))
            );
        }    
    })],  
    ['findIndex', func1('findIndex', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            const fNode = PARAM1.evaluate(context).internalNode;
            const idx = arr.findIndex(elem => {
                const bool = fNode.call(context, [elem]).returnedValue;
                return bool.value;
            });
            return context.returned(new Primitive(idx));
        }    
    })],  
    ['sort', func1('sort', {
        evaluate(context) {
            const arr = selfInternalValue(context);

            if(arr.length !== 0) {                
                const comparator = PARAM1.evaluate(context);
                if(comparator === Null) {
                    arr.sort(typeof (arr[0].value) === 'number' ? (n1, n2) => n1.value - n2.value : undefined);
                }
                else {
                    const fNode = comparator.internalNode;
                    arr.sort((elem1, elem2) => fNode.call(context, [elem1, elem2]).returnedValue.value);
                }
            }
           
            return context.returned(self(context));
        }    
    })],   
    ['toString', func0('toString', {
        evaluate(context) {
            const arr = selfInternalValue(context);
            return context.returned(
                new Primitive(arr.map(elem => elem.toString(context)).join())
            );
        }    
    })]
]);
