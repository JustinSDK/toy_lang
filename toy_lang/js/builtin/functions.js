import {Null, Primitive, Instance, Void, ValueError, ModuleError, loadedModules} from './imports.js';
import {PARAM1, PARAM2, func0, func1, func2, func3, format, valueToString} from './bases/func_bases.js';
import {BUILTIN_CLASSES} from './classes.js';
import {ListClass} from './classes/list.js';

export {BUILTIN_FUNCTIONS};

function print(context, v) {
    context.output(valueToString(context, v));
}

const Print = func1('print', {
    evaluate(context) {
        print(context, PARAM1.evaluate(context));
        return context.returned(Void);
    }
});

const Input = func1('input', {
    evaluate(context) {
        const text = context.input(PARAM1.evaluate(context).value);
        return context.returned(new Primitive(text));
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

const TypeOf = func1('typeof', {
    evaluate(context) {
        const arg = PARAM1.evaluate(context);
        if(arg === Null) {
            throw new ValueError('no assigned value');
        }

        if(arg.clzOfLang) {  // instances
            return context.returned(
                new Primitive(arg.clzNodeOfLang().name)
            );
        }
         // primitives
        return context.returned(
            new Primitive(typeof(arg.value))
        );

    }
});

const CurrentTimeMillis = func0('currentTimeMillis', {
    evaluate(context) {
        return context.returned(
            new Primitive(Date.now())
        );

    }
});

const LoadedModules = func0('loadedModules', {
    evaluate(context) {
        return context.returned(
            ListClass.newInstance(context, Array.from(loadedModules.keys()).map(key => new Primitive(key)))
        );
    }
});

const UnhandledExceptionHandler = func1('unhandledExceptionHandler', {
    evaluate(context) {
        context.unhandledExceptionHandler(PARAM1.evaluate(context));
        return context.returned(Void);
    }
});

const FUNC_CLZ = BUILTIN_CLASSES.get('Function');

function funcInstance(internalNode) {
    return new Instance(FUNC_CLZ, new Map(), internalNode);
}

function funcEntry(name, internalNode) {
    return [name, funcInstance(internalNode)];
}

const allowedNativeFunctions = {
    currentTimeMillis : {
        allowedModule : 'toy_lang/lib/sys.toy',
        funcInstance  : funcInstance(CurrentTimeMillis)
    },
    loadedModules : {
        allowedModule : 'toy_lang/lib/sys.toy',
        funcInstance : funcInstance(LoadedModules)
    },
    unhandledExceptionHandler : {
        allowedModule : 'toy_lang/lib/sys.toy',
        funcInstance  : funcInstance(UnhandledExceptionHandler)
    }
};

const NativeFunction = func2('nativeFunction', {
    evaluate(context) {
        const fName = PARAM1.evaluate(context).value;
        const moduleFileName = PARAM2.evaluate(context).internalNode.fileName;
        const allowedNativeFunction = allowedNativeFunctions[fName];
        if(moduleFileName === allowedNativeFunction.allowedModule) {
            return context.returned(
                allowedNativeFunction.funcInstance
            );
        }
        throw new ModuleError(`native call '${fName}' is not allowed in '${moduleFileName}'`);
    }
});

const BUILTIN_FUNCTIONS = new Map([
    funcEntry('input', Input),
    funcEntry('print', Print),
    funcEntry('hasValue', HasValue),
    funcEntry('noValue', NoValue),
    funcEntry('typeof', TypeOf),
    funcEntry('nativeFunction', NativeFunction)
]); 

// static methods

// String as a namespace

const Format = func3('format', {
    evaluate(context) {
        const args = context.lookUpVariable('arguments').nativeValue();
        const str = format.apply(undefined, args.map(arg => arg.value));
        return context.returned(new Primitive(str));
    }
});

const StringClz = BUILTIN_CLASSES.get('String');
StringClz.setOwnProperty('format', funcInstance(Format));

// Number as a namespace

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

function numberIs(name) {
    const funcName = `is${name}`;
    return func1(funcName, {
        evaluate(context) {
            const value = PARAM1.evaluate(context).value;
            return context.returned(Primitive.boolNode(Number[funcName](value)));
        }
    });
}

const NumberClz = BUILTIN_CLASSES.get('Number');
NumberClz.setOwnProperty('parseFloat', funcInstance(ParseFloat));
NumberClz.setOwnProperty('parseInt', funcInstance(ParseInt));
NumberClz.setOwnProperty('isNaN', funcInstance(numberIs('NaN')));
NumberClz.setOwnProperty('isFinite', funcInstance(numberIs('Finite')));
NumberClz.setOwnProperty('isInteger', funcInstance(numberIs('Integer')));
NumberClz.setOwnProperty('isSafeInteger', funcInstance(numberIs('SafeInteger')));

// List as a namespace

const ListCreate = func2('create', {
    evaluate(context) {
        const length = PARAM1.evaluate(context).value;
        const value = PARAM2.evaluate(context);
        return context.returned(ListClass.newInstance(context, new Array(length).fill(value)));
    }
});

BUILTIN_CLASSES.get('List').setOwnProperty('create', funcInstance(ListCreate));


