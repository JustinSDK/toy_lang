import {Stack} from './util.js';
import {Primitive} from './ast/value.js';
import {FunCall} from './ast/function.js';
import {Instalization, Property} from './ast/class.js';
import {Variable} from './ast/statement.js';
import {BINARY_OPERATORS, UNARY_OPERATORS} from './ast/operator.js';

export {VALUE_PART_PARSERS};

const VALUE_PART_PARSERS = new Map([
    ['value', {
        parse(tokenable) {
            // pattern matching from text
            return VALUE_PART_PARSERS.get('text').parse(tokenable);
        }
    }],
    ['text', {
        parse(tokenable) {
            let [textTokenable] = tokenable.tryTokenables('text');
            return textTokenable ? 
                      new Primitive(textTokenable.value
                                          .replace(/^\\r/, '\r')
                                          .replace(/^\\n/, '\n')
                                          .replace(/([^\\])\\r/g, '$1\r')
                                          .replace(/([^\\])\\n/g, '$1\n')
                                          .replace(/^\\t/, '\t')
                                          .replace(/([^\\])\\t/g, '$1\t')
                                          .replace(/\\\\/g, '\\')
                                          .replace(/\\'/g, '\'')
                      ) 
                      : VALUE_PART_PARSERS.get('number').parse(tokenable);
        }
    }],
    ['number', {
        parse(tokenable) {
            let [numTokenable] = tokenable.tryTokenables('number');
            return numTokenable ? new Primitive(parseFloat(numTokenable.value)) : VALUE_PART_PARSERS.get('boolean').parse(tokenable);
        }        
    }],
    ['boolean', {
        parse(tokenable) {
            let [boolTokenable] = tokenable.tryTokenables('boolean');
            return boolTokenable ? new Primitive(boolTokenable.value === 'true') : VALUE_PART_PARSERS.get('variable').parse(tokenable);
        }        
    }],    
    ['variable', {
        parse(tokenable) {
            let [varTokenable] = tokenable.tryTokenables('variable');
            return varTokenable ? new Variable(varTokenable.value) : VALUE_PART_PARSERS.get('fcall').parse(tokenable);
        }
    }],
    ['fcall', {
        parse(tokenable) {
            let fcallTokenables = tokenable.tryTokenables('fcall');
            if(fcallTokenables.length !== 0) {
                let [fNameTokenable, ...argTokenables] = fcallTokenables;
                return new FunCall(
                    new Variable(fNameTokenable.value), 
                    argTokenables.map(argTokenable => VALUE_PART_PARSERS.get('value').parse(argTokenable))
                )
            }

            return VALUE_PART_PARSERS.get('new').parse(tokenable);
        }        
    }],    
    ['new', {
        parse(tokenable) {
            let newTokenables = tokenable.tryTokenables('new');
            if(newTokenables.length !== 0) {
                let [classNameTokenable, ...argTokenables] = newTokenables;
                return new Instalization(
                    new Variable(classNameTokenable.value), 
                    argTokenables.map(argTokenable => VALUE_PART_PARSERS.get('value').parse(argTokenable))
                )
            }

            return VALUE_PART_PARSERS.get('property').parse(tokenable);
        }        
    }],      
    ['property', {
        parse(tokenable) {
            let instanceProperty = tokenable.tryTokenables('property');
            if(instanceProperty.length !== 0) {
                let [nameTokenable, argTokenable] = instanceProperty;
                return new Property(new Variable(nameTokenable.value), argTokenable.value).getter();
            }

            return VALUE_PART_PARSERS.get('expression').parse(tokenable);
        }        
    }],          
    ['expression', {
        parse(tokenable) {
            let tokenables = toPostfix(tokenable.tryTokenables('expression'));
            return tokenables.reduce((stack, tokenable) => {
                if(isOperator(tokenable.value)) {
                    return reduce(stack, tokenable.value);
                } 
                else if(tokenable.value.startsWith('not')) {
                    let [unaryTokenable, operandTokenable] = tokenable.tryTokenables('not');
                    let NotOperator = UNARY_OPERATORS.get(unaryTokenable.value);
                    return stack.push(
                        new NotOperator(
                            VALUE_PART_PARSERS.get('value').parse(operandTokenable)
                        )
                    );
                }
                return stack.push(
                    VALUE_PART_PARSERS.get('value').parse(tokenable)
                );
            }, new Stack()).top;
        }
    }]
]);

// expression

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
            let [s1, o1] = popHighPriority(tokenables[0], stack, output);
            return digest(tokenables.slice(1), s1.push(tokenables[0]), o1);
        case ')':
            let [s2, o2] = popAllBeforeLP(stack, output);
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
    let [stack, output] = digest(tokenables);
    return popAll(stack, output);
}

function isOperator(value) {        
    return ['==', '!=', '>=', '>', '<=', '<',
            'and', 'or', 
            '+', '-', '*', '/', '%'].indexOf(value) !== -1;
}

function reduce(stack, value) {
    let right = stack.top;
    let s1 = stack.pop();
    let left = s1.top;
    let s2 = s1.pop();
    let Operator = BINARY_OPERATORS.get(value);
    return s2.push(new Operator(left, right));
}