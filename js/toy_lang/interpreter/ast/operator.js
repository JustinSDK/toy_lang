import {Primitive} from './value.js';
export {BINARY_OPERATORS, UNARY_OPERATORS};

function createOperatorNode(operator) {
    return class BinaryOperator {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
    
        evaluate(context) {
            const left = this.left.evaluate(context);
            const right = this.right.evaluate(context);
            return new Primitive(
                operator(
                    left.value ? left.value : left.toString(context), 
                    right.value ? right.value : right.toString(context)
                )
            );
        }
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
    ['or', createOperatorNode((a, b) => a || b)]
]);
