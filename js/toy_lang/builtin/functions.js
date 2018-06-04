import {Null, Primitive, Instance, Void} from '../interpreter/ast/value.js';
import {PARAM1, func1} from './func_bases.js';
import {BUILTIN_CLASSES} from './classes.js';

export {BUILTIN_FUNCTIONS};

function print(context, v) {
    context.output(v.toString(context));
}

const Print = func1('print', {
    evaluate(context) {
        print(context, PARAM1.evaluate(context));
        return context.returned(Void);
    }
});
 
const Println = func1('println', {
    evaluate(context) {
        const argument = PARAM1.evaluate(context);
        if(argument !== Null) {
            print(context, argument);
        }

        context.output('\n');
        return context.returned(Void);
    }
});

function toPrimitive(bool) {
    return bool ? Primitive.BoolTrue : Primitive.BoolFalse;
}

const HasValue = func1('hasValue', {
    evaluate(context) {
        return context.returned(toPrimitive(PARAM1.evaluate(context) !== Null));
    }
});

const NoValue = func1('noValue', {
    evaluate(context) {
        return context.returned(toPrimitive(PARAM1.evaluate(context) === Null));
    }
});

const FUNC_CLZ = BUILTIN_CLASSES.get('Function');

function funcEntry(clzOfLang, name, internalNode) {
    return [name, new Instance(clzOfLang, new Map(), internalNode)];
}

const BUILTIN_FUNCTIONS = new Map([
    funcEntry(FUNC_CLZ, 'print', Print),
    funcEntry(FUNC_CLZ, 'println', Println),
    funcEntry(FUNC_CLZ, 'hasValue', HasValue),
    funcEntry(FUNC_CLZ, 'noValue', NoValue)
]); 