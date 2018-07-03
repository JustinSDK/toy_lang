import {Native, Null, Primitive, Instance, Void, newInstance, MethodCall} from './ast_export.js';

import {PARAM1, PARAM2, PARAM3, func1, func2, func3, format} from './bases/func_bases.js';
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

const Range = func3('range', {
    evaluate(context) {
        const stepArg = PARAM3.evaluate(context);

        const start = PARAM1.evaluate(context).value;
        const stop = PARAM2.evaluate(context).value;
        const step = stepArg === Null ? 1 : stepArg.value;
        const jsArray = new Array(parseInt((stop - start) / step))
                              .fill(undefined)
                              .map((_, i) => new Primitive(i * step + start));
                             
        return context.returned(newInstance(context, 'List', Native, jsArray));
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
    funcEntry(FUNC_CLZ, 'noValue', NoValue),
    funcEntry(FUNC_CLZ, 'range', Range)
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