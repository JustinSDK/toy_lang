import {Primitive, Void} from './ast_export.js';

import {PARAM1} from '../bases/func_bases.js';
import {func0, func1} from '../bases/func_bases.js';
import {self} from '../bases/class_bases.js';

import {ListClass} from './list.js';

export {TraceableClass};

class TraceableClass {
}

TraceableClass.methods = new Map([
    ['init', func1('init', {
        evaluate(context) {
            const instance = self(context);
            instance.setOwnProperty('name', new Primitive(instance.clzNodeOfLang().name));
            instance.setOwnProperty('message', PARAM1.evaluate(context));
            instance.setOwnProperty('stackTraceElements', ListClass.newInstance(context, []));
            return context;
        }
    })],
    ['printStackTrace', func0('printStackTrace', {
        evaluate(context) {
            const instance = self(context);
            context.output(`${instance.getOwnProperty('name')}: ${instance.getOwnProperty('message')}`);

            instance.getOwnProperty('stackTraceElements')
                    .nativeValue()
                    .map(elem => `at ${elem.getOwnProperty('statement')} (${elem.getOwnProperty('fileName')}:${elem.getOwnProperty('lineNumber')})`)
                    .forEach(line => context.output(`\n\t${line}`));  
            
            context.output('\n');

            return context.returned(Void);
        }
    })],    
    ['toString', func0('toString', {
        evaluate(context) {
            const instance = self(context);
            return context.returned(
                new Primitive(
                    `${instance.getOwnProperty('name')}: ${instance.getOwnProperty('message')}`
                )
            );
        }    
    })]
]);