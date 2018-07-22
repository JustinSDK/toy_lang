import {Primitive, Null, Func, StmtSequence} from '../imports.js';

import {PARAM1, PARAM2} from '../bases/func_bases.js';
import {func0, func1, func2} from '../bases/func_bases.js';
import {self, selfInternalNode} from '../bases/class_bases.js';

export {FunctionClass};

class FunctionClass {
    static name() {
        return func1('name', {
            evaluate(context) {
                const name = PARAM1.evaluate(context);
                const fNode = selfInternalNode(context);
                if(name !== Null) {
                    fNode.name = name.value;
                }
                return context.returned(new Primitive(fNode.name));
            }    
        });
    }

    static toString() {
        return func0('toString', {
            evaluate(context) {
                const clzNode = self(context).clzNodeOfLang();
                const fNode = selfInternalNode(context);
                return context.returned(new Primitive(`<${clzNode.name} ${fNode.name}>`));
            }    
        });
    }
}

FunctionClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const name = PARAM1.evaluate(context);
            self(context).internalNode = new Func( // nope function
                [], StmtSequence.EMPTY, name === Null ? "''" : name.value, context
            );
            return context;
        }    
    })], 
    ['name', FunctionClass.name()],    
    ['toString', FunctionClass.toString()],
    ['apply', func2('apply', {
        evaluate(context) {
            const funcInstance = self(context);            
            const targetObject = PARAM1.evaluate(context); 
            const args = PARAM2.evaluate(context);         // List instance
            const jsArray = args === Null ? [] : args.nativeValue();
            const bodyStmt = funcInstance.internalNode
                                         .bodyStmt(context, jsArray.map(arg => arg.evaluate(context)));

            return bodyStmt.evaluate(context.assign('this', targetObject));
        }    
    })]
]);