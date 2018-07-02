import {Primitive, Null, Variable, VariableAssign, StmtSequence} from './ast_export.js';

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
    ['getOwnProperty', func1('geteOwnProperty', {
        evaluate(context) {
            return context.returned(
                self(context).getOwnProperty(PARAM1.evaluate(context).value)
            );
        }    
    })],    
    ['setOwnProperty', func2('geteOwnProperty', {
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
            return context.returned(new Primitive(`[${clzNode.name} object]`));
        }    
    })],
    ['class', func0('class', {
        evaluate(context) {
            return context.returned(self(context).clzOfLang);
        }    
    })],
    ['super', func3('super', {
        evaluate(context) {
            const parentClz = PARAM1.evaluate(context).internalNode;
            const name = PARAM2.evaluate(context).value;
            const args = PARAM3.evaluate(context);
            
            const instance = self(context);
            const parentClzNames = instance.clzNodeOfLang().parentClzNames;
            if(parentClzNames.every(name => name !== parentClz.name)) {
                throw new ClassError('obj.super(parent): the type of obj must be the direct subtype of parent');
            }
 
            const func = parentClz.getOwnMethod(name);           
            return new StmtSequence(
                new VariableAssign(Variable.of('this'), instance),  
                func.bodyStmt(context, args === Null ? [] : args.nativeValue())
            ).evaluate(context);
        }    
    })]
]);