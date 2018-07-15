import {Primitive} from '../export.js';

import {func0} from '../bases/func_bases.js';
import {self, selfInternalNode} from '../bases/class_bases.js';

export {ModuleClass};

class ModuleClass {}

ModuleClass.methods = new Map([
    ['name', func0('name', {
        evaluate(context) {
            const ctxNode = selfInternalNode(context);
            return context.returned(new Primitive(ctxNode.moduleName));
        }    
    })],
    ['toString', func0('toString', {
        evaluate(context) {
            const clzNode = self(context).clzNodeOfLang();
            const ctxNode = selfInternalNode(context);
            return context.returned(new Primitive(`<${clzNode.name} ${ctxNode.moduleName}>`));
        }    
    })]
]);