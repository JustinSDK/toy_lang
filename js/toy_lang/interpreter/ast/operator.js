import {Instance, Primitive} from './value.js';
import {MethodCall} from './callable.js';

export {BINARY_OPERATORS, UNARY_OPERATORS, IfElse};

function createPrimitiveBinaryOperatorNode(operator) {
    return class PrimitiveBinaryOperator {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
    
        evaluate(context) {
            const maybeCtxLeft = this.left.evaluate(context);
            return maybeCtxLeft.notThrown(
                left => this.right.evaluate(context).notThrown(
                    right => operator(
                        left.value === undefined ? left.toString(context) : left.value, 
                        right.value === undefined ? right.toString(context) : right.value
                    )
                )
            );
        }
    }
}

function clzInstanceFrom(context, operand) {
    if(operand.receiver) {
        const receiver = operand.receiver.evaluate(context);
        return receiver.getOwnProperty(operand.message.func.name);
    }
    return operand.func.evaluate(context);
}

function argsFrom(operand) {
    if(operand.receiver) {
        return operand.message.argsList[0];
    }
    return operand.argsList[0];
}

class NewOperator {
    constructor(operand) {
        this.operand = operand;
    }

    instance(context, args) {
        const clzInstance = clzInstanceFrom(context, this.operand);
        // run class body
        const ctx = clzInstance.internalNode.call(context, args);
        return ctx.notThrown(c => {
            c.variables.delete('arguments');
            return new Instance(
                clzInstance,
                c.variables
            );
        });
    }

    evaluate(context) {
        const args = argsFrom(this.operand);
        const maybeContext = this.instance(context, args);
        return maybeContext.notThrown(ctx => {
            if(ctx.clzNodeOfLang().hasOwnMethod('init')) {
                const maybeCtx = new MethodCall(maybeContext, 'init', [args]).evaluate(context);
                return maybeCtx.notThrown(c => maybeContext);
            }
            return ctx;
        });    
    }   
}

class DotOperator {
    constructor(receiver, message) {
        this.receiver = receiver;
        this.message = message;
    }

    evaluate(context) {
        const maybeContext = this.receiver.evaluate(context);
        return maybeContext.notThrown(
            receiver => this.message.send(context, receiver.box(context))
        );
    }
}

class NegOperator {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        const maybeContext = this.operand.evaluate(context);
        return maybeContext.notThrown(v => new Primitive(-v.value));
    }
}

class NotOperator {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        const maybeContext = this.operand.evaluate(context);
        return maybeContext.notThrown(v => Primitive.boolNode(!v.value));
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
    ['or', createPrimitiveBinaryOperatorNode((a, b) => Primitive.from(a || b))],
    ['&', createPrimitiveBinaryOperatorNode((a, b) => p(a & b))],
    ['|', createPrimitiveBinaryOperatorNode((a, b) => p(a | b))],
    ['^', createPrimitiveBinaryOperatorNode((a, b) => p(a ^ b))],
    ['<<', createPrimitiveBinaryOperatorNode((a, b) => p(a << b))],
    ['>>', createPrimitiveBinaryOperatorNode((a, b) => p(a >> b))]
]);

class IfElse {
    constructor(boolOperand, trueOperand, falseOperand) {
        this.boolOperand = boolOperand;
        this.trueOperand = trueOperand;
        this.falseOperand = falseOperand;
    }

    evaluate(context) {
        const maybeContext = this.boolOperand.evaluate(context);
        return maybeContext.notThrown(
            v => v.value ? this.trueOperand.evaluate(context) : this.falseOperand.evaluate(context)
        );
    }   
}