import {Native, Primitive, Void, Null, newInstance} from '../imports.js';

import {PARAM1, PARAM2, PARAM3, PARAM_LT1, PARAM_LT2, PARAM_LT3} from '../bases/func_bases.js';
import {func0, func1, func2, func3, valueToString} from '../bases/func_bases.js';
import {methodPrimitive, methodVoid, methodSelf, methodNewSameType, self} from '../bases/class_bases.js';

export {ListClass};

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
    
    static newInstance(context, jsArray) {
        return newInstance(context, 'List', Native, jsArray);
    }

    static arrayCall(context, methodName, rightCallback, wrap) {
        const arr = self(context).nativeValue();
        const fNode = PARAM1.evaluate(context).internalNode;
        try {
            return context.returned(
                wrap(
                    Array.prototype[methodName].call(arr, 
                        elem => fNode.call(context, [elem]).either(
                            leftContext => {
                                throw leftContext;
                            }, 
                            rightContext => rightCallback(rightContext)
                        )
                    )
                )
            );
        }
        catch(leftContext) {
            return leftContext;
        }
    }
}

ListClass.methods = new Map([
    ['init', func0('init', {
        evaluate(context) {
            const nativeObj = context.lookUpVariable('arguments').internalNode;
            self(context).internalNode = nativeObj;
            return context;
        }
    })],
    ['toString', ListClass.method0Primitive('toString')],
    ['slice', ListClass.method2NewList('slice')],
    ['join', ListClass.method1Primitive('join')],
    ['reverse', ListClass.method0Self('reverse')],   
    ['remove', func1('remove', {
        evaluate(context) {
            const instance = self(context);
            const jsArray = instance.nativeValue();
            const v = PARAM1.evaluate(context).value;
            const idx = jsArray.findIndex(elem => elem.value === v);
            if (idx != -1) {
                jsArray.splice(idx, 1);
            }
            return context.returned(instance);
        }    
    })],        
    ['fill', func3('fill', {
        evaluate(context) {
            const instance = self(context);
            const jsArray = instance.nativeValue();

            const v = PARAM1.evaluate(context).value;
            
            const start = PARAM2.evaluate(context);
            const st = start === Null ? 0 : start.value;
            
            const end = PARAM3.evaluate(context);
            const ed = end === Null ? jsArray.length : end.value;
            
            jsArray.fill(new Primitive(v), st, ed);

            return context.returned(instance);
        }    
    })],
    ['concat', func1('concat', {
        evaluate(context) {
            const instance = self(context);
            const arg = PARAM1.evaluate(context);
            const jsArray = instance.nativeValue().concat(arg.nativeValue());
            return context.returned(ListClass.newInstance(context, jsArray));
        }    
    })],    
    ['add', func1('add', {
        evaluate(context) {
            const instance = self(context);
            const arg = PARAM1.evaluate(context);
            instance.nativeValue().push(arg);
            return context.returned(instance);
        }    
    })],
    ['get', func1('get', {
        evaluate(context) {
            const idx = PARAM1.evaluate(context).value;
            return context.returned(self(context).nativeValue()[idx]);
        }    
    })],
    ['set', func2('set', {
        evaluate(context) {
            const idx = PARAM1.evaluate(context).value;
            const elem = PARAM2.evaluate(context);
            self(context).nativeValue()[idx] = elem;
            return context.returned(Void);
        }    
    })],
    ['swap', func2('swap', {
        evaluate(context) {
            const idx1 = PARAM1.evaluate(context).value;
            const idx2 = PARAM2.evaluate(context).value;
            const instance = self(context);
            const arr = instance.nativeValue();
            const tmp = arr[idx1];
            arr[idx1] = arr[idx2];
            arr[idx2] = tmp;
            return context.returned(instance);
        }    
    })],    
    ['length', func0('length', {
        evaluate(context) {
            return context.returned(
                new Primitive(
                    self(context).nativeValue().length
                )
            );
        }    
    })],    
    ['isEmpty', func0('isEmpty', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(
                    self(context).nativeValue().length === 0
                )
            );
        }    
    })],
    ['filter', func1('filter', {
        evaluate(context) {           
            return ListClass.arrayCall(context, 'filter', 
                rightContext => rightContext.returnedValue.value, 
                arr => ListClass.newInstance(context, arr)
            );
        }    
    })],
    ['map', func1('map', {
        evaluate(context) {
            return ListClass.arrayCall(context, 'map', 
                rightContext => rightContext.returnedValue, 
                arr => ListClass.newInstance(context, arr)
            );
        }    
    })],
    ['reduce', func2('reduce', {
        evaluate(context) {
            const arr = self(context).nativeValue();
            const fNode = PARAM1.evaluate(context).internalNode;
            const init = PARAM2.evaluate(context);
            try {
                return context.returned(
                    Array.prototype['reduce'].call(arr, 
                        (acc, elem) => fNode.call(context, [acc, elem]).either(
                            leftContext => {
                                throw leftContext;
                            }, 
                            rightContext => rightContext.returnedValue
                        ),
                        init
                    )
                );
            }
            catch(leftContext) {
                return leftContext;
            }
        }    
    })],
    ['forEach', func1('forEach', {
        evaluate(context) {
            return ListClass.arrayCall(context, 'forEach', 
                rightContext => rightContext.returnedValue, 
                _ => Void
            );
        }    
    })],    
    ['all', func1('all', {
        evaluate(context) {
            return ListClass.arrayCall(context, 'every', 
                rightContext => rightContext.returnedValue.value, 
                bool => Primitive.boolNode(bool)
            );
        }    
    })],
    ['any', func1('any', {
        evaluate(context) {
            return ListClass.arrayCall(context, 'some', 
                rightContext => rightContext.returnedValue.value, 
                bool => Primitive.boolNode(bool)
            );            
        }    
    })],    
    ['find', func1('find', {
        evaluate(context) {
            return ListClass.arrayCall(context, 'find', 
                rightContext => rightContext.returnedValue.value, 
                elem => elem || Null
            );     
        }    
    })],  
    ['includes', func1('includes', {
        evaluate(context) {
            const arr = self(context).nativeValue();
            const target = PARAM1.evaluate(context);
            return context.returned(
                Primitive.boolNode(
                    arr.some(elem => elem.value === target.value)
                )
            );
        }    
    })],  
    ['indexOf', func1('indexOf', {
        evaluate(context) {
            const arr = self(context).nativeValue();
            const target = PARAM1.evaluate(context);
            return context.returned(
                new Primitive(
                    arr.map(elem => elem.value).indexOf(target.value)
                )
            );
        }    
    })],  
    ['lastIndexOf', func1('lastIndexOf', {
        evaluate(context) {
            const arr = self(context).nativeValue();
            const target = PARAM1.evaluate(context);
            return context.returned(
                new Primitive(
                    arr.map(elem => elem.value).lastIndexOf(target.value)
                )
            );
        }    
    })],      
    ['findIndex', func1('findIndex', {
        evaluate(context) {
            return ListClass.arrayCall(context, 'findIndex', 
                rightContext => rightContext.returnedValue.value, 
                idx => new Primitive(idx)
            );   
        }    
    })],  
    ['sort', func1('sort', {
        evaluate(context) {
            const instance = self(context);
            const arr = instance.nativeValue();

            if(arr.length !== 0) {                
                return sort(context, arr, instance);
            }
            return context.returned(instance);
        }    
    })],   
    ['toString', func0('toString', {
        evaluate(context) {
            const arr = self(context).nativeValue();
            const toStr = arr.map(elem => valueToString(context, elem)).join();
            return context.returned(new Primitive(`[${toStr}]`));
        }    
    })]
]);

function sort(context, arr, instance) {
    const comparator = PARAM1.evaluate(context);
    if(comparator === Null) {
        arr.sort(typeof (arr[0].value) === 'number' ? (n1, n2) => n1.value - n2.value : undefined);
    }
    else {
        try {
            sortBy(context, arr, comparator);
        } catch(leftContext) {
            return leftContext;
        }
    }
    return context.returned(instance);
}

function sortBy(context, arr, comparator) {
    const fNode = comparator.internalNode;
    arr.sort((elem1, elem2) => {
        return fNode.call(context, [elem1, elem2]).either(
            leftContext => {
                throw leftContext;
            }, 
            rightContext => rightContext.returnedValue.value
        );
    });
}