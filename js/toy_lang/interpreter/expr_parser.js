import {Stack} from './commons/collection.js';
import {Primitive, Func} from './ast/value.js';
import {FunCall, Return} from './ast/function.js';
import {Variable} from './ast/statement.js';
import {BINARY_OPERATORS, UNARY_OPERATORS} from './ast/operator.js';
import {TokenableParser} from './commons/parser.js';

export {EXPR_PARSER, exprAst, toPostfix};

const EXPR_PARSER = TokenableParser.orRules(
    ['expression', {
        burst(infixTokenables) {
            return exprAst(toPostfix(infixTokenables));
        }
    }]
);

const OPERAND_PARSER = TokenableParser.orRules(
    ['lambda', {
        burst([bodyTokenable, ...paramTokenables]) {
            return new Func(
                paramTokenables.map(paramTokenable => new Variable(paramTokenable.value)), 
                new Return(EXPR_PARSER.parse(bodyTokenable)),
                "''"
            );
        }        
    }],  
    ['iife', {
        burst([lambdaExprTokenable, argLtChainTokenable]) {
            return createFuncall(OPERAND_PARSER.parse(lambdaExprTokenable), argLtChainTokenable);
        }        
    }],  
    ['fcall', {
        burst([fNameTokenable, argLtChainTokenable]) {
            return createFuncall(new Variable(fNameTokenable.value), argLtChainTokenable);
        }        
    }],  
    ['text', {
        burst([textTokenable]) {
            return new Primitive(textTokenable.value
                .replace(/^\\r/, '\r')
                .replace(/^\\n/, '\n')
                .replace(/([^\\])\\r/g, '$1\r')
                .replace(/([^\\])\\n/g, '$1\n')
                .replace(/^\\t/, '\t')
                .replace(/([^\\])\\t/g, '$1\t')
                .replace(/\\\\/g, '\\')
                .replace(/\\'/g, '\'')
            );
        }
    }],
    ['number', {
        burst([numTokenable]) {
            return new Primitive(parseFloat(numTokenable.value));
        }        
    }],
    ['boolean', {
        burst([boolTokenable]) {
            return Primitive.boolNode(boolTokenable.value === 'true');
        }        
    }],    
    ['variable', {
        burst([varTokenable]) {
            return new Variable(varTokenable.value);
        }
    }] 
);

function createFuncall(func, argLtChainTokenable) {
    return new FunCall(
        func, 
        argLtChainTokenable.tryTokenables('argLists')
                           .map(argLtTokenable => argLtTokenable.tryTokenables('args'))
                           .map(argTokenables => argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable)))
    );
}

// expression

function exprAst(tokenables) {
    return tokenables.reduce((stack, tokenable) => {
        if(isBinaryOperator(tokenable.value)) {
            return reduceBinary(stack, tokenable.value);
        } 

        if(isUnaryOperator(tokenable.value)) {
            return reduceUnary(stack, tokenable.value);
        }         

        return stack.push(
            OPERAND_PARSER.parse(tokenable)
        );
    }, new Stack()).top;
}

function priority(operator) {
    return operator === 'new' ? 7 :
           operator === '.' ? 6 :
           operator === 'not' ? 5 :
           ['==', '!=', '>=', '>', '<=', '<'].indexOf(operator) !== -1 ? 4 : 
           ['and', 'or'].indexOf(operator) !== -1 ? 3 :
           ['*', '/', '%'].indexOf(operator) !== -1 ? 2 :
           ['+', '-'].indexOf(operator) !== -1 ? 1 : 0;
}

function popHighPriority(tokenable, stack, output) {
    if(!stack.isEmpty() && priority(stack.top.value) >= priority(tokenable.value)) {
        return popHighPriority(tokenable, stack.pop(), output.concat([stack.top]));
    }
    return [stack, output];
}

function popAllBeforeLP(stack, output) {
    if(stack.top.value !== '(') {
        return popAllBeforeLP(stack.pop(), output.concat([stack.top]));
    }
    return [stack, output];
}

function digest(tokenables, stack = new Stack(), output = []) {
    if(tokenables.length === 0) {
        return [stack, output];
    }

    switch(tokenables[0].value) {
        case '(':
            return digest(tokenables.slice(1), stack.push(tokenables[0]), output);
        case 'new':
        case '.':
        case 'not':
        case '==': case '!=': case '>=': case '>': case '<=': case '<':
        case 'and': case 'or':
        case '+': case '-': case '*': case '/': case '%':
            const [s1, o1] = popHighPriority(tokenables[0], stack, output);
            return digest(tokenables.slice(1), s1.push(tokenables[0]), o1);
        case ')':
            const [s2, o2] = popAllBeforeLP(stack, output);
            return digest(tokenables.slice(1), s2.pop(), o2);
        default: 
            return digest(tokenables.slice(1), stack, output.concat([tokenables[0]]));
    }
}

function popAll(stack, output) {
    if(stack.isEmpty()) {
        return output;
    }
    return popAll(stack.pop(), output.concat([stack.top]));
}

function toPostfix(tokenables) {
    const [stack, output] = digest(tokenables);
    return popAll(stack, output);
}

function isUnaryOperator(value) {
    return ['new', 'not'].indexOf(value) !== -1;
}

function isBinaryOperator(value) {        
    return ['.', 
            '==', '!=', '>=', '>', '<=', '<',
            'and', 'or', 
            '+', '-', '*', '/', '%'].indexOf(value) !== -1;
}

function reduceUnary(stack, value) {
    const UnaryOperator = UNARY_OPERATORS.get(value);
    const operand = stack.top;
    const s1 = stack.pop();
    return s1.push(new UnaryOperator(operand));
}

function reduceBinary(stack, value) {
    const right = stack.top;
    const s1 = stack.pop();
    const left = s1.top;
    const s2 = s1.pop();
    const Operator = BINARY_OPERATORS.get(value);
    return s2.push(new Operator(left, right));
}