import {Stack} from './commons/collection.js';
import {Primitive, Func} from './ast/value.js';
import {FunCall} from './ast/callable.js';
import {Variable, Return} from './ast/statement.js';
import {BINARY_OPERATORS, UNARY_OPERATORS} from './ast/operator.js';
import {TokenableParser} from './commons/parser.js';
import {EvalErrInterceptor} from './commons/interceptor.js';

export {EXPR_PARSER};

function interceptExprAst(infixTokenables) {
    return new EvalErrInterceptor(
        exprAst(toPostfix(infixTokenables))
    );
}

const EXPR_PARSER = TokenableParser.orRules(
    ['expression', {
        burst(infixTokenables) {
            return interceptExprAst(infixTokenables);
        }
    }]
);

EXPR_PARSER.exprAst = interceptExprAst;

const OPERAND_PARSER = TokenableParser.orRules(
    ['lambda', {
        burst([bodyTokenable, ...paramTokenables]) {
            return new Func(
                paramTokenables.map(paramTokenable => Variable.of(paramTokenable.value)), 
                new Return(EXPR_PARSER.parse(bodyTokenable)),
                "''" // anonymous
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
            return createFuncall(Variable.of(fNameTokenable.value), argLtChainTokenable);
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
            return Variable.of(varTokenable.value);
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
            return reduceBinary(stack, tokenable);
        } 

        if(isUnaryOperator(tokenable.value)) {
            return reduceUnary(stack, tokenable);
        }         

        return stack.push(
            OPERAND_PARSER.parse(tokenable)
        );
    }, new Stack()).top;
}

function priority(operator) {
    return operator === 'new' ? 8 :
           operator === '.' ? 7 :
           operator === '$neg' ? 6 :
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

function digest(tokenables, stack = new Stack(), output = [], prevTokenable = null) {
    if(tokenables.length === 0) {
        return [stack, output];
    }

    switch(tokenables[0].value) {
        case '(':
            return digest(tokenables.slice(1), stack.push(tokenables[0]), output, tokenables[0]);
        case 'new':
        case '.':
        case '$neg':
        case 'not':
        case '==': case '!=': case '>=': case '>': case '<=': case '<':
        case 'and': case 'or':
        case '+': case '*': case '/': case '%':
            const [s1, o1] = popHighPriority(tokenables[0], stack, output);
            return digest(tokenables.slice(1), s1.push(tokenables[0]), o1, tokenables[0]);
        case '-':
            const tokenable = notOperand(prevTokenable) ? tokenables[0].replaceValue('$neg') : tokenables[0];
            const [s2, o2] = popHighPriority(tokenable, stack, output);
            return digest(tokenables.slice(1), s2.push(tokenable), o2, tokenables[0]);
        case ')':
            const [s3, o3] = popAllBeforeLP(stack, output);
            return digest(tokenables.slice(1), s3.pop(), o3, tokenables[0]);
        default: 
            if(notOperand(prevTokenable)) {
                return digest(tokenables.slice(1), stack, output.concat([tokenables[0]]), tokenables[0]);
            }
            throw prevTokenable.syntaxErr('illegal expression');
    }
}

function notOperand(tokenable) {
    return tokenable === null || 
           tokenable.value === '(' || 
           isUnaryOperator(tokenable.value) || 
           isBinaryOperator(tokenable.value);
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
    return ['new', 'not', '$neg'].indexOf(value) !== -1;
}

function isBinaryOperator(value) {        
    return ['.', 
            '==', '!=', '>=', '>', '<=', '<',
            'and', 'or', 
            '+', '-', '*', '/', '%'].indexOf(value) !== -1;
}

function reduceUnary(stack, tokenable) {
    const UnaryOperator = UNARY_OPERATORS.get(tokenable.value);
    const operand = stack.top;
    const s1 = stack.pop();
    return s1.push(new UnaryOperator(operand));
}

function reduceBinary(stack, tokenable) {
    const right = stack.top;
    const s1 = stack.pop();
    const left = s1.top;
    const s2 = s1.pop();
    const Operator = BINARY_OPERATORS.get(tokenable.value);
    tokenable.errIfNoValue(left, 'no left operand');
    tokenable.errIfNoValue(right, 'no right operand');
    return s2.push(new Operator(left, right));
}