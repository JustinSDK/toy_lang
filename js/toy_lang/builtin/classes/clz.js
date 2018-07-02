import {Primitive, Instance, Null, Class} from './ast_export.js';
import {StmtSequence} from './ast_export.js';

import {PARAM1, PARAM2, PARAM3} from '../bases/func_bases.js';
import {func0, func1, func2, func3} from '../bases/func_bases.js';
import {clzNode, self, selfInternalNode} from '../bases/class_bases.js';

import {FunctionClass} from './func.js';

export {ClassClass};

class ClassClass {
    static classInstance(clzOfLang, internalNode, constants = new Map()) {
        return new Instance(clzOfLang, constants, internalNode);
    }

    static classEntry(clzOfLang, name, methods, constants) {
        return [name, ClassClass.classInstance(clzOfLang, clzNode({name, methods}), constants)];
    }
}

ClassClass.methods = new Map([
    ['init', func3('init', {
        evaluate(context) {  
            const name = PARAM1.evaluate(context);
            const parents = PARAM2.evaluate(context);
            const methods = PARAM3.evaluate(context); 

            self(context).internalNode = new Class({
                notMethodStmt : StmtSequence.EMPTY,
                methods : new Map(methods === Null ? [] : methods.nativeValue().map(method => [method.internalNode.name, method.internalNode])),
                name : name === Null ? "''" : name.value,
                parentClzNames : parents === Null ? ['Object'] : parents.nativeValue().map(parent => parent.internalNode.name), 
                parentContext : context
            });
            return context;
        }    
    })], 
    ['name', FunctionClass.name()], 
    ['toString', FunctionClass.toString()],
    ['addOwnMethod', func2('addOwnMethod', {
        evaluate(context) {
            const name = PARAM1.evaluate(context).value;
            selfInternalNode(context).addOwnMethod(name, PARAM2.evaluate(context));
            return context.returned(self(context));
        }    
    })],
    ['deleteOwnMethod', func1('deleteOwnMethod', {
        evaluate(context) {
            selfInternalNode(context).deleteOwnMethod(PARAM1.evaluate(context).value);
            return context.returned(self(context));
        }    
    })],    
    ['hasOwnMethod', func1('hasOwnMethod', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(
                    selfInternalNode(context).hasOwnMethod(PARAM1.evaluate(context).value)
                )
            );
        }    
    })],    
    ['hasMethod', func1('hasMethod', {
        evaluate(context) {
            return context.returned(
                Primitive.boolNode(
                    selfInternalNode(context).hasMethod(context, PARAM1.evaluate(context).value)
                )
            );
        }    
    })],
    ['ownMethod', func1('ownMethod', {
        evaluate(context) {
            const methodName = PARAM1.evaluate(context).value;
            return context.returned(
                selfInternalNode(context).getOwnMethod(methodName).evaluate(context)
            );
        }    
    })],
    ['method', func1('method', {
        evaluate(context) {
            const methodName = PARAM1.evaluate(context).value;
            return context.returned(
                selfInternalNode(context).getMethod(context, methodName).evaluate(context)
            );
        }    
    })],
    ['ownMethods', func0('ownMethods', {
        evaluate(context) {
            const fNodes = Array.from(selfInternalNode(context).methods.values());
            return context.returned(
                
                ListClass.newInstance(context, fNodes.map(fNode => fNode.evaluate(context)))
            );
        }    
    })],
    ['mixin', func1('mixin', {
        evaluate(context) {
            Array.from(PARAM1.evaluate(context).internalNode.methodArray())
                 .forEach(f => selfInternalNode(context).addOwnMethod(f.name, f.evaluate(context)));
            return context.returned(self(context));
        }    
    })],
    ['parents', func1('parents', {
        evaluate(context) {
            const parents = PARAM1.evaluate(context);
            if(parents === Null) {
                return getParents(context);
            }
            return setParents(context, parents);
        }    
    })]
]);

function getParents(context) {
    const parentClzNames = selfInternalNode(context).parentClzNames;
    return context.returned(
        ListClass.newInstance(
            context,
            parentClzNames.map(parentClzName => context.lookUpVariable(parentClzName))
        )
    );
}

function setParents(context, parents) {
    const parentClzNames = parents.nativeValue()
                                  .map(clzInstance => clzInstance.internalNode.name);
    selfInternalNode(context).parentClzNames = parentClzNames;
    return context.returned(self(context));
}