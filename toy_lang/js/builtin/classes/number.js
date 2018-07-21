import {Primitive} from '../dependence.js';

export {NumberClass};

class NumberClass {}

NumberClass.methods = new Map();
NumberClass.constants = new Map([
    ['MAX_VALUE', Primitive.of(Number.MAX_VALUE)],
    ['MIN_VALUE', Primitive.of(Number.MIN_VALUE)],
    ['MAX_SAFE_INTEGER', Primitive.of(Number.MAX_SAFE_INTEGER)],
    ['MIN_SAFE_INTEGER', Primitive.of(Number.MIN_SAFE_INTEGER)],
    ['NaN', Primitive.of(Number.NaN)],
    ['POSITIVE_INFINITY', Primitive.of(Number.POSITIVE_INFINITY)],
    ['NEGATIVE_INFINITY', Primitive.of(Number.NEGATIVE_INFINITY)]
]);