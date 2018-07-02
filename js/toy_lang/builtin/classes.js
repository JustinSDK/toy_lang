import {clzNode} from './bases/class_bases.js';

import {ObjectClass} from './classes/object.js';
import {FunctionClass} from './classes/func.js';
import {ClassClass} from './classes/clz.js';

import {StringClass} from './classes/string.js';
import {ListClass} from './classes/list.js';
import {NumberClass} from './classes/number.js';

import {TraceableClass} from './classes/traceable.js';

export {BUILTIN_CLASSES};

const CLZ = ClassClass.classInstance(null, clzNode({name : 'Class', methods : ClassClass.methods}));
// 'Class' of is an instance of 'Class'
CLZ.clzOfLang = CLZ;

const BUILTIN_CLASSES = new Map([
    ClassClass.classEntry(CLZ, 'Object', ObjectClass.methods),
    ClassClass.classEntry(CLZ, 'Function', FunctionClass.methods),
    ['Class', CLZ],
    ClassClass.classEntry(CLZ, 'String', StringClass.methods),
    ClassClass.classEntry(CLZ, 'List', ListClass.methods),
    ClassClass.classEntry(CLZ, 'Number', NumberClass.methods, NumberClass.constants),
    ClassClass.classEntry(CLZ, 'Traceable', TraceableClass.methods)
]); 

