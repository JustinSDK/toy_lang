import {Value} from './value.js';
export {BINARY_OPERATORS, UNARY_OPERATORS};

function createOperatorNode(operator) {
    return class BinaryOperator {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
    
        evaluate(context) {
            return new Value(operator(this.left.evaluate(context).value, this.right.evaluate(context).value));
        }
    }
}

class Not {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        return new Value(!this.operand.evaluate(context).value);
    }
}

const UNARY_OPERATORS = new Map([
    ['not', Not]
]);

const BINARY_OPERATORS = new Map([
    ['+', createOperatorNode((a, b) => a + b)],
    ['-', createOperatorNode((a, b) => a - b)],
    ['*', createOperatorNode((a, b) => a * b)],
    ['/', createOperatorNode((a, b) => a / b)],
    ['%', createOperatorNode((a, b) => a % b)],
    ['==', createOperatorNode((a, b) => a === b)],
    ['!=', createOperatorNode((a, b) => a !== b)],
    ['>=', createOperatorNode((a, b) => a >= b)],
    ['>', createOperatorNode((a, b) => a > b)],
    ['<=', createOperatorNode((a, b) => a <= b)],
    ['<', createOperatorNode((a, b) => a < b)],
    ['and', createOperatorNode((a, b) => a && b)],
    ['or', createOperatorNode((a, b) => a / b)]
]);
