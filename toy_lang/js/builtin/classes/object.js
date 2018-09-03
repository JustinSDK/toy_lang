import {Primitive, Null, ClassError} from '../imports.js';

import {PARAM1, PARAM2, PARAM3} from '../bases/func_bases.js';
import {func0, func1, func2, func3} from '../bases/func_bases.js';
import {self} from '../bases/class_bases.js';
import {ListClass} from './list.js';

export {ObjectClass};

class ObjectClass {}

ObjectClass.methods = new Map([ 
    ['init', func1('init', {
        evaluate(context) {
            const list = PARAM1.evaluate(context);
            if(list !== Null) {
                const instance = self(context);
                list.nativeValue().forEach(prop => {
                    const plt = prop.nativeValue();
                    instance.setOwnProperty(plt[0].value, plt[1]);
                });
            }
            return context;
        }    
    })], 
    ['ownProperties', func0('ownProperties', {
        evaluate(context) {
            const entries = Array.from(self(context).properties.entries())
                                 .map(entry => ListClass.newInstance(context, [new Primitive(entry[0]), entry[1]]));
            return context.returned(ListClass.newInstance(context, entries));
        }    
    })],
    ['hasOwnProperty', func1('hasOwnProperty', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(self(context).hasOwnProperty(PARAM1.evaluate(context).value))
            );
        }    
    })],    
    ['getOwnProperty', func1('getOwnProperty', {
        evaluate(context) {
            return context.returned(
                self(context).getOwnProperty(PARAM1.evaluate(context).value)
            );
        }    
    })],    
    ['setOwnProperty', func2('setOwnProperty', {
        evaluate(context) {
            const instance = self(context);
            instance.setOwnProperty(PARAM1.evaluate(context).value, PARAM2.evaluate(context))
            return context.returned(instance);
        }    
    })],    
    ['deleteOwnProperty', func1('deleteOwnProperty', {
        evaluate(context) {
            self(context).deleteOwnProperty(PARAM1.evaluate(context).value);           
            return context;
        }    
    })],    
    ['toString', func0('toString', {
        evaluate(context) {
            const clzNode = self(context).clzNodeOfLang();
            return context.returned(new Primitive(`<${clzNode.name} object>`));
        }    
    })],
    ['class', func0('class', {
        evaluate(context) {
            return context.returned(self(context).clzOfLang);
        }    
    })],
    ['super', func3('super', {
        evaluate(context) {
            const parentClzNode = PARAM1.evaluate(context).internalNode;
            const name = PARAM2.evaluate(context).value;
            const args = PARAM3.evaluate(context);
            
            const instance = self(context);
            const clzNode = instance.clzNodeOfLang();

            if(isSubType(context, clzNode, parentClzNode)) {
                const func = parentClzNode.getOwnMethod(name);           
                return func.bodyStmt(context, args === Null ? [] : args.nativeValue())
                           .evaluate(context.assign('this', instance));
            }

            throw new ClassError('obj.super(parent): the type of obj must be a subtype of parent');
        }    
    })]
]);

function isSubType(context, clzNode, parentClzNode) {
    if(clzNode.name === 'Object') {
        return false;
    }

    const parentClzNames = clzNode.parentClzNames;
    if(parentClzNames.some(name => name === parentClzNode.name)) {
        return true;
    }
    const parentClzNodes = parentClzNames.map(name => context.lookUpVariable(name).internalNode);
    return parentClzNodes.some(clzNode => isSubType(context, clzNode, parentClzNode));
}
