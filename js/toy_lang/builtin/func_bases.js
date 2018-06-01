import {Func} from '../interpreter/ast/value.js';
import {Variable} from '../interpreter/ast/statement.js';

export {PARAM1, PARAM2, PARAM3, PARAM_LT0, PARAM_LT1, PARAM_LT2, PARAM_LT3};
export {func, func0, func1, func2, func3};

const PARAM1 = new Variable('p1');
const PARAM2 = new Variable('p2');
const PARAM3 = new Variable('p3');

const PARAM_LT0 = [];
const PARAM_LT1 = [PARAM1];
const PARAM_LT2 = [PARAM1, PARAM2];
const PARAM_LT3 = [PARAM1, PARAM2, PARAM3];

function func(name, node, params = PARAM_LT0) {
    return new Func(params, node, name);
}

function func0(name, node) {
    return func(name, node);
}

function func1(name, node) {
    return func(name, node, PARAM_LT1);
}

function func2(name, node) {
    return func(name, node, PARAM_LT2);
}

function func3(name, node) {
    return func(name, node, PARAM_LT3);
}