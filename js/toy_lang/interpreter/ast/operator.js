import {Primitive} from './value.js';
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
            return new Primitive(
                operator(
                    left.value === undefined ? left.toString(context) : left.value, 
                    right.value === undefined ? right.toString(context) : right.value
                )
            );
        }
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

class Not {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        return new Primitive(!this.operand.evaluate(context).value);
    }
}

const UNARY_OPERATORS = new Map([
    ['not', Not]
]);

const BINARY_OPERATORS = new Map([
    ['.', DotOperator],
    ['+', createPrimitiveBinaryOperatorNode((a, b) => a + b)],
    ['-', createPrimitiveBinaryOperatorNode((a, b) => a - b)],
    ['*', createPrimitiveBinaryOperatorNode((a, b) => a * b)],
    ['/', createPrimitiveBinaryOperatorNode((a, b) => a / b)],
    ['%', createPrimitiveBinaryOperatorNode((a, b) => a % b)],
    ['==', createPrimitiveBinaryOperatorNode((a, b) => a === b)],
    ['!=', createPrimitiveBinaryOperatorNode((a, b) => a !== b)],
    ['>=', createPrimitiveBinaryOperatorNode((a, b) => a >= b)],
    ['>', createPrimitiveBinaryOperatorNode((a, b) => a > b)],
    ['<=', createPrimitiveBinaryOperatorNode((a, b) => a <= b)],
    ['<', createPrimitiveBinaryOperatorNode((a, b) => a < b)],
    ['and', createPrimitiveBinaryOperatorNode((a, b) => a && b)],
    ['or', createPrimitiveBinaryOperatorNode((a, b) => a || b)]
]);
