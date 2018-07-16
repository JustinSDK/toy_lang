import {Stack} from './commons/collection.js';
import {Primitive, Func} from './ast/value.js';
import {FunCall} from './ast/callable.js';
import {Variable} from './ast/assignment.js';
import {Return} from './ast/statement.js';
import {BINARY_OPERATORS, UNARY_OPERATORS, IfElse} from './ast/operator.js';
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
        burst([funcTokenable, argLtChainTokenable]) {
            return createFuncall(
                funcTokenable.value.includes('if') ? 
                    OPERAND_PARSER.parse(funcTokenable) :
                    Variable.of(funcTokenable.value), 
                argLtChainTokenable
            );
        }        
    }],  
    ['text', {
        burst([textTokenable]) {
            return Primitive.of(textTokenable.value
                .replace(/^\\r/, '\r')
                .replace(/([^\\])\\r/g, '$1\r')                
                .replace(/^\\n/, '\n')
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
            const value = numTokenable.value;
            switch(value.slice(0, 2)) {
                case '0b' :
                    return Primitive.of(Number.parseInt(numTokenable.value.slice(2), 2));
                case '0o' :
                    return Primitive.of(Number.parseInt(numTokenable.value.slice(2), 8));
                case '0x' :
                    return Primitive.of(Number.parseInt(numTokenable.value.slice(2), 16));
                default:
                    return Primitive.of(Number.parseFloat(numTokenable.value));
            }
            
        }        
    }],
    ['boolean', {
        burst([boolTokenable]) {
            return Primitive.boolNode(boolTokenable.value === 'true');
        }        
    }],    
    ['ternary', {
        burst([trueTokenable, condTokenable, falseTokenable]) {
            return new IfElse(
                EXPR_PARSER.parse(condTokenable),
                EXPR_PARSER.parse(trueTokenable),
                EXPR_PARSER.parse(falseTokenable)
            );
        }        
    }],      
    ['variable', {
        burst([varTokenable]) {
            return Variable.of(varTokenable.value);
        }
    }],
    ['list', {
        burst(elemTokenables) {
            const NewOperator = UNARY_OPERATORS.get('new');
            const args = elemTokenables.length === 1 && elemTokenables[0].value === '' ? [[]] :
                               [elemTokenables.map(elem => EXPR_PARSER.parse(elem))]
                    
            return new NewOperator(
                new FunCall(
                    Variable.of('List'), 
                    args
                )
            );
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

function precedence(operator) {
    switch(operator) {
        case '.':    return 14;
        case 'new':  return 13;
        case '$neg': return 12;
        case 'not':  return 11;
        case '*': case '/': case '%':
                     return 10;
        case '+': case '-':
                     return 9;
        case '<<': case '>>':
                     return 8;
        case '>=': case '>': case '<=': case '<':
                     return 7;
        case '==': case '!=':
                     return 6;
        case '&':    return 5;
        case '^':    return 4; 
        case '|':    return 3;
        case 'and':  return 2;
        case 'or':   return 1;
        default:     return 0; 
    }
}

function popHigherPrecedence(tokenable, stack, output) {
    if(!stack.isEmpty() && precedence(stack.top.value) >= precedence(tokenable.value)) {
        return popHigherPrecedence(tokenable, stack.pop(), output.concat([stack.top]));
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
        case 'new': case '.': case '$neg': case 'not':
        case '==': case '!=': case '>=': case '>': case '<=': case '<':
        case 'and': case 'or':
        case '&': case '|': case '^': 
        case '<<': case '>>':
        case '+': case '*': case '/': case '%':
            const [s1, o1] = popHigherPrecedence(tokenables[0], stack, output);
            return digest(tokenables.slice(1), s1.push(tokenables[0]), o1, tokenables[0]);
        case '-':
            const tokenable = notOperand(prevTokenable) ? tokenables[0].replaceValue('$neg') : tokenables[0];
            const [s2, o2] = popHigherPrecedence(tokenable, stack, output);
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

const UNARY_OPERATOR_KEYWORDS = new Set(['new', 'not', '$neg']);

function isUnaryOperator(value) {
    return UNARY_OPERATOR_KEYWORDS.has(value);
}

const BINARY_OPERATOR_KEYWORDS = new Set(['.', 
    '==', '!=', '>=', '>', '<=', '<',
    'and', 'or', 
    '+', '-', '*', '/', '%',
    '&', '|', '^', '<<', '>>']);

function isBinaryOperator(value) {        
    return BINARY_OPERATOR_KEYWORDS.has(value);
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