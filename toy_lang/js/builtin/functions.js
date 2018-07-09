import {Null, Primitive, Instance, Void, MethodCall} from './export.js';

import {PARAM1, PARAM2, func1, func2, func3, format} from './bases/func_bases.js';
import {BUILTIN_CLASSES} from './classes.js';

export {BUILTIN_FUNCTIONS};

function print(context, v) {
    const desc = v.hasProperty && v.hasProperty(context, 'toString') ?
                     new MethodCall(v, 'toString').evaluate(context) : v;
    context.output(desc.toString());
}

const Print = func1('print', {
    evaluate(context) {
        print(context, PARAM1.evaluate(context));
        return context.returned(Void);
    }
});
 
const HasValue = func1('hasValue', {
    evaluate(context) {
        return context.returned( 
            Primitive.boolNode(PARAM1.evaluate(context) !== Null)
        );
    }
});

const NoValue = func1('noValue', {
    evaluate(context) {
        return context.returned(
            Primitive.boolNode(PARAM1.evaluate(context) === Null)
        );
    }
});

const FUNC_CLZ = BUILTIN_CLASSES.get('Function');

function funcEntry(clzOfLang, name, internalNode) {
    return [name, new Instance(clzOfLang, new Map(), internalNode)];
}

const BUILTIN_FUNCTIONS = new Map([
    funcEntry(FUNC_CLZ, 'print', Print),
    funcEntry(FUNC_CLZ, 'hasValue', HasValue),
    funcEntry(FUNC_CLZ, 'noValue', NoValue)
]); 

// static methods

// String

const Format = func3('format', {
    evaluate(context) {
        const args = context.lookUpVariable('arguments').nativeValue();
        const str = format.apply(undefined, args.map(arg => arg.value));
        return context.returned(new Primitive(str));
    }
});

const StringClz = BUILTIN_CLASSES.get('String');
StringClz.setOwnProperty('format', new Instance(FUNC_CLZ, new Map(), Format));

// Number

const ParseFloat = func1('parseFloat', {
    evaluate(context) {
        const text = PARAM1.evaluate(context).value;
        return context.returned(new Primitive(Number.parseFloat(text)));
    }
});

const ParseInt = func2('parseInt', {
    evaluate(context) {
        const text = PARAM1.evaluate(context).value;
        const radixNode = PARAM2.evaluate(context);
        return context.returned(new Primitive(Number.parseInt(text, radixNode === Null ? undefined : radixNode.value)));
    }
});

const NumberClz = BUILTIN_CLASSES.get('Number');
NumberClz.setOwnProperty('parseFloat', new Instance(FUNC_CLZ, new Map(), ParseFloat));
NumberClz.setOwnProperty('parseInt', new Instance(FUNC_CLZ, new Map(), ParseInt));