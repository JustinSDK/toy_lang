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
            if(left.throwedValue) {
                return left; 
            }
            
            const right = this.right.evaluate(context);
            if(right.throwedValue) {
                return right; 
            }

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
        // run class body
        const ctx = clzOfLang.internalNode.call(context, this.args);
        if(ctx.throwedValue) {
            return ctx;
        }

        return new Instance(
            clzOfLang,
            ctx.variables
        );
    }

    evaluate(context) {
        const ctxOrInstance = this.instance(context);

        if(!ctxOrInstance.throwedValue && ctxOrInstance.clzOfLang.internalNode.hasOwnMethod('init')) {
            const ctx = ctxOrInstance.evalMethod(context, 'init', this.args);
            if(ctx.throwedValue) {
                return ctx;
            }
        }
        
        return ctxOrInstance;
    }   
}

class DotOperator {
    constructor(receiver, message) {
        this.receiver = receiver;
        this.message = message;
    }

    evaluate(context) {
        const ctxOrInstance = this.receiver.evaluate(context);
        if(ctxOrInstance.throwedValue) {
            return ctxOrInstance; 
        }
        return this.message.send(context, ctxOrInstance);
    }
}

class NegOperator {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        const ctxOrValue = this.operand.evaluate(context);
        if(ctxOrValue.throwedValue) {
            return ctxOrValue; 
        }

        return new Primitive(-ctxOrValue.value);
    }
}

class NotOperator {
    constructor(operand) {
        this.operand = operand;
    }

    evaluate(context) {
        const ctxOrValue = this.operand.evaluate(context);
        if(ctxOrValue.throwedValue) {
            return ctxOrValue; 
        }
        return Primitive.boolNode(!ctxOrValue.value);
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
