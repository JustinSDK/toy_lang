import {FunCall} from './function.js';
import {Variable} from './statement.js';
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

function evalMethod(context, instance, methodName, args) {
    const methodBodyStmt = instance.methodBodyStmt(context, methodName, args);
    const fClz = instance.getOwnProperty(methodName);
    const clzNode = instance.clzOfLang.internalNode;
    const parentContext = clzNode.parentContext || 
                          (fClz && fClz.internalNode.parentContext); // In this case, instance is just a namespace.

    return methodBodyStmt.evaluate(
        parentContext ?
            parentContext.childContext() : // closure context
            context.childContext()
    );
}

class DotOperator {
    constructor(receiver, message) {
        this.receiver = receiver;
        this.message = message;
    }

    evaluate(context) {
        const instance = this.receiver.evaluate(context);
        if(this.message instanceof Variable) {
            return instance.getProperty(this.message.name).evaluate(context);
        } else if(this.message instanceof FunCall) {
            const methodName = this.message.apply.fVariable.name;
            const args = this.message.apply.args;
            return evalMethod(context, instance, methodName, args).returnedValue;
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
