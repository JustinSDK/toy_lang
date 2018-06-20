import {Instance, Primitive} from './value.js';

export {BINARY_OPERATORS, UNARY_OPERATORS};

function createPrimitiveBinaryOperatorNode(operator) {
    return class PrimitiveBinaryOperator {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
    
        evaluate(context) {
            const left = this.left.evaluate(context);
            const right = this.right.evaluate(context);
            return operator(
                left.value === undefined ? left.toString(context) : left.value, 
                right.value === undefined ? right.toString(context) : right.value
            );
        }
    }
}

class NewOperator {
    constructor(operand) {
        this.clz = operand.func;
        this.args = operand.argsList[0];
    }

    instance(context) {
        const clzOfLang = this.clz.evaluate(context);
        return new Instance(
            clzOfLang,
            clzOfLang.internalNode.call(context, this.args).variables
        );
    }

    evaluate(context) {
        const thisInstance = this.instance(context);

        if(thisInstance.clzOfLang.internalNode.hasOwnMethod('init')) {
            return thisInstance.evalMethod(context, 'init', this.args).variables.get('this');
        }
        
        return thisInstance;
    }   
}

class DotOperator {
    constructor(receiver, message) {
        this.receiver = receiver;
        this.message = message;
    }

    evaluate(context) {
        const instance = this.receiver.evaluate(context);
        return this.message.send(context, instance);
    }
}

class NegOperator {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        return new Primitive(-this.operand.evaluate(context).value);
    }
}

class NotOperator {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        return Primitive.boolNode(!this.operand.evaluate(context).value);
    }
}

const UNARY_OPERATORS = new Map([
    ['new', NewOperator], 
    ['not', NotOperator],
    ['$neg', NegOperator]
]);

function p(v) {
    return new Primitive(v);
}

function bool(v) {
    return Primitive.boolNode(v);
}

const BINARY_OPERATORS = new Map([
    ['.', DotOperator],
    ['+', createPrimitiveBinaryOperatorNode((a, b) => p(a + b))],
    ['-', createPrimitiveBinaryOperatorNode((a, b) => p(a - b))],
    ['*', createPrimitiveBinaryOperatorNode((a, b) => p(a * b))],
    ['/', createPrimitiveBinaryOperatorNode((a, b) => p(a / b))],
    ['%', createPrimitiveBinaryOperatorNode((a, b) => p(a % b))],
    ['==', createPrimitiveBinaryOperatorNode((a, b) => bool(a === b))],
    ['!=', createPrimitiveBinaryOperatorNode((a, b) => bool(a !== b))],
    ['>=', createPrimitiveBinaryOperatorNode((a, b) => bool(a >= b))],
    ['>', createPrimitiveBinaryOperatorNode((a, b) => bool(a > b))],
    ['<=', createPrimitiveBinaryOperatorNode((a, b) => bool(a <= b))],
    ['<', createPrimitiveBinaryOperatorNode((a, b) => bool(a < b))],
    ['and', createPrimitiveBinaryOperatorNode((a, b) => Primitive.from(a && b))],
    ['or', createPrimitiveBinaryOperatorNode((a, b) => Primitive.from(a || b))]
]);
