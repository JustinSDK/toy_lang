import {Null, Primitive, Instance, Void} from '../interpreter/ast/value.js';
import {PARAM1, PARAM2, PARAM3, func0, func1, func3} from './func_bases.js';
import {BUILTIN_CLASSES} from './classes.js';
import {Variable} from '../interpreter/ast/statement.js';

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

const HasValue = func1('hasValue', {
    evaluate(context) {
        return context.returned(Primitive.boolNode(PARAM1.evaluate(context) !== Null));
    }
});

const NoValue = func1('noValue', {
    evaluate(context) {
        return context.returned(Primitive.boolNode(PARAM1.evaluate(context) === Null));
    }
});

const ARGUMENTS = new Variable('arguments');

const List = func0('list', {
    evaluate(context) {
        return context.returned(ARGUMENTS.evaluate(context));
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

        const listClzInstance = context.lookUpVariable('List');
        const listClzNode = listClzInstance.internalNode;
        const list = listClzNode.newInstance(context, jsArray);                              
        return context.returned(list);
    }
});

const Format = func3('format', {
    evaluate(context) {
        const args = context.lookUpVariable('arguments').internalNode.value;
        const str = format.apply(undefined, args.map(arg => arg.value));
        return context.returned(new Primitive(str));
    }
});

function format(template) {
    const args = Array.prototype.slice.call(arguments, 1);
    return template.replace(/{(\d+)}/g, (match, number) => { 
        return typeof args[number] != 'undefined' ? args[number] : match;
    });
}

const FUNC_CLZ = BUILTIN_CLASSES.get('Function');

function funcEntry(clzOfLang, name, internalNode) {
    return [name, new Instance(clzOfLang, new Map(), internalNode)];
}

const BUILTIN_FUNCTIONS = new Map([
    funcEntry(FUNC_CLZ, 'print', Print),
    funcEntry(FUNC_CLZ, 'println', Println),
    funcEntry(FUNC_CLZ, 'hasValue', HasValue),
    funcEntry(FUNC_CLZ, 'noValue', NoValue),
    funcEntry(FUNC_CLZ, 'list', List),
    funcEntry(FUNC_CLZ, 'range', Range),
    funcEntry(FUNC_CLZ, 'format', Format)
]); 