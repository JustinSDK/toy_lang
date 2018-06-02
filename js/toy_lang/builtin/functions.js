import {Null, Primitive, Instance} from '../interpreter/ast/value.js';
import {PARAM1, func1} from './func_bases.js';
import {BUILTIN_CLASSES} from './classes.js';

export {BUILTIN_FUNCTIONS};

function invokeToString(context, instance) {
    if(instance.hasProperty('toString')) {
        const methodBodyStmt = instance.methodBodyStmt(context, 'toString');
        return methodBodyStmt.evaluate(context.childContext()).returnedValue.value;
    }
    
    return instance.toString();
}

function print(context, v) {
    context.output(v instanceof Instance ? invokeToString(context, v) : v.toString());
}

const Print = func1('print', {
    evaluate(context) {
        print(context, PARAM1.evaluate(context));
        return context;
    }
});
 
const Println = func1('println', {
    evaluate(context) {
        const argument = PARAM1.evaluate(context);
        if(argument !== Null) {
            print(context, argument);
        }

        context.output('\n');
        return context;
    }
});

const HasValue = func1('hasValue',{
    evaluate(context) {
        const bool = PARAM1.evaluate(context) === Null ? Primitive.BoolFalse : Primitive.BoolTrue;
        return context.returned(bool);
    }
});

const NoValue = func1('noValue', {
    evaluate(context) {
        const bool = PARAM1.evaluate(context) === Null ? Primitive.BoolTrue : Primitive.BoolFalse;
        return context.returned(bool);
    }
});

const FUNC_CLZ = BUILTIN_CLASSES.get('Function');

function funcEntry(clz, name, internalNode) {
    return [name, new Instance(clz, clz.internalNode.methods, internalNode)];
}

const BUILTIN_FUNCTIONS = new Map([
    funcEntry(FUNC_CLZ, 'print', Print),
    funcEntry(FUNC_CLZ, 'println', Println),
    funcEntry(FUNC_CLZ, 'hasValue', HasValue),
    funcEntry(FUNC_CLZ, 'noValue', NoValue)
]); 