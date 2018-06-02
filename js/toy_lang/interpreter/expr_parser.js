import {Stack} from './commons/collection.js';
import {Primitive} from './ast/value.js';
import {FunCall} from './ast/function.js';
import {Instalization, Property, MethodCall} from './ast/class.js';
import {Variable} from './ast/statement.js';
import {BINARY_OPERATORS, UNARY_OPERATORS} from './ast/operator.js';
import {TokenableParser} from './commons/parser.js';

export {EXPR_PARSER};

const EXPR_PARSER = TokenableParser.orRules(
    ['expression', {
        burst([...infixTokenables]) {
            return exprAst(toPostfix(infixTokenables));
        }
    }]
);

const OPERAND_PARSER = TokenableParser.orRules(
    ['new', {
        burst([classNameTokenable, ...argTokenables]) {
            return new Instalization(
                new Variable(classNameTokenable.value), 
                argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable))
            );
        }        
    }],  
    ['fcall', {
        burst([fNameTokenable, ...argTokenables]) {
            return new FunCall(
                new Variable(fNameTokenable.value), 
                argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable))
            );
        }        
    }],   
    ['mcall', {
        burst([nameTokenable, propTokenable, ...argTokenables]) {
            return new MethodCall(
                new Property(new Variable(nameTokenable.value), propTokenable.value).getter(), 
                argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable))
            );
            
        }        
    }],     
    ['property', {
        burst([nameTokenable, propTokenable]) {
            return new Property(new Variable(nameTokenable.value), propTokenable.value).getter();
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
            return boolTokenable.value === 'true' ? Primitive.BoolTrue : Primitive.BoolFalse;
        }        
    }],    
    ['variable', {
        burst([varTokenable]) {
            return new Variable(varTokenable.value);
        }
    }] 
);

// expression

function exprAst(tokenables) {
    return tokenables.reduce((stack, tokenable) => {
        if(isOperator(tokenable.value)) {
            return reduce(stack, tokenable.value);
        } 
        else if(tokenable.value.startsWith('not')) {
            const [unaryTokenable, operandTokenable] = tokenable.tryTokenables('not');
            const NotOperator = UNARY_OPERATORS.get(unaryTokenable.value);
            return stack.push(
                new NotOperator(
                    OPERAND_PARSER.parse(operandTokenable)
                )
            );
        }
        return stack.push(
            OPERAND_PARSER.parse(tokenable)
        );
    }, new Stack()).top;
}

function priority(operator) {
    return ['==', '!=', '>=', '>', '<=', '<'].indexOf(operator) !== -1 ? 4 : 
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

function isOperator(value) {        
    return ['==', '!=', '>=', '>', '<=', '<',
            'and', 'or', 
            '+', '-', '*', '/', '%'].indexOf(value) !== -1;
}

function reduce(stack, value) {
    const right = stack.top;
    const s1 = stack.pop();
    const left = s1.top;
    const s2 = s1.pop();
    const Operator = BINARY_OPERATORS.get(value);
    return s2.push(new Operator(left, right));
}