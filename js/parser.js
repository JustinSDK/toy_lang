import {Stack} from './util.js';
import {Value, Void} from './ast/value.js';
import {Func, Return, FunCall, FunCallWrapper} from './ast/function.js';
import {BINARY_OPERATORS, UNARY_OPERATORS} from './ast/operator.js';
import {Variable, Assign, While, If, StmtSequence} from './ast/statement.js';
export {Parser};

class Parser {
    constructor(environment) {
        this.environment = environment;  
    }

    parse(tokenizer) {
        try {
            return LINE_PARSERS.get('sequence').parse(tokenizer.lines());
        }
        catch(ex) {
            this.environment.output(ex);
            throw ex;
        }
    }
}

class LineParserInterceptor {
    constructor(parser) {
        this.parser = parser;
    }

    parse(lines) {
        try {
            return this.parser.parse(lines);
        } 
        catch(ex) {
            if(ex instanceof SyntaxError) {
                throw ex;
            }
            
            throw new SyntaxError(`\n\t${lines[0].toString()}`);
        }
    }
}

const LINE_PARSERS = new Map([
    ['sequence', new LineParserInterceptor({
        parse(lines) {
            if(lines.length === 0 || lines[0].code === 'else' || lines[0].code === 'end') {
                return StmtSequence.EMPTY;
            }
    
            return LINE_PARSERS.get('assign').parse(lines);   
        }
    })], 
    ['assign', {
        parse(lines) {
            let matched = lines[0].tryTokenize('assign');
            if(matched.length !== 0) {
                let [varTokenable, assignedTokenable] = matched;
                return new StmtSequence(
                    new Assign(
                        new Variable(varTokenable.value), 
                        VALUE_PART_PARSERS.get('value').parse(assignedTokenable)
                    ),
                    LINE_PARSERS.get('sequence').parse(lines.slice(1))
                );
            }

            return LINE_PARSERS.get('fcall').parse(lines);
        }
    }],      
    ['fcall', {
        parse(lines) {
            let matched = lines[0].tryTokenize('fcall');
            if(matched.length !== 0) {
                let [fNameTokenable, ...argTokenables] = matched;
                return new StmtSequence(
                    new FunCallWrapper(
                        new FunCall(
                            new Variable(fNameTokenable.value),
                            argTokenables.map(argTokenable => VALUE_PART_PARSERS.get('value').parse(argTokenable)) 
                        )
                    ),
                    LINE_PARSERS.get('sequence').parse(lines.slice(1))
                );                
            }

            return LINE_PARSERS.get('command').parse(lines);
        }
    }],        
    ['command', {
        parse(lines) {
            let [cmdTokenable, argTokenable] = lines[0].tryTokenize('command');
            switch(cmdTokenable.value) {
                case 'def':
                    return createAssignFunc(lines, argTokenable);
                case 'return':
                    return createReturn(lines, argTokenable);
                case 'if':
                    return createIf(lines, argTokenable);
                case 'while':
                    return createWhile(lines, argTokenable);
            }
            throw new SyntaxError(`\n\t${lines[0].toString()}`);
        }
    }]
]);

function createAssignFunc(lines, argTokenable) {
    let [fNameTokenable, ...paramTokenables] = argTokenable.tryTokenize('func');
    let remains = lines.slice(1);     
    return new StmtSequence(
        new Assign(
            new Variable(fNameTokenable.value), 
            new Func(
                paramTokenables.map(paramTokenable => new Variable(paramTokenable.value)), 
                LINE_PARSERS.get('sequence').parse(remains)
            )
        ),
        LINE_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
    );    
}

function createReturn(lines, argTokenable) { 
    return new StmtSequence(
        new Return(argTokenable.value === '' ? Void : VALUE_PART_PARSERS.get('value').parse(argTokenable)),
        LINE_PARSERS.get('sequence').parse(lines.slice(1))
    );
}

function createIf(lines, argTokenable) {
    let remains = lines.slice(1);     
    let trueStmt = LINE_PARSERS.get('sequence').parse(remains);

    let i = matchingElseIdx(trueStmt);
    let falseStmt = remains[i].code === 'else' ? 
            LINE_PARSERS.get('sequence').parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;

    return new StmtSequence(
            new If(
                VALUE_PART_PARSERS.get('boolean').parse(argTokenable), 
                trueStmt,
                falseStmt
            ),
            LINE_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
    );
}

function createWhile(lines, argTokenable) {
    let remains = lines.slice(1);     
    return new StmtSequence(
         new While(
            VALUE_PART_PARSERS.get('boolean').parse(argTokenable), 
            LINE_PARSERS.get('sequence').parse(remains)
         ),
         LINE_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
    ); 
}

function matchingElseIdx(stmt, i = 1) {
    if(stmt.secondStmt === StmtSequence.EMPTY) {
        return i;
    }
    return matchingElseIdx(stmt.secondStmt, i + 1);
}

function linesAfterCurrentBlock(lines, endCount = 1) {
    if(endCount === 0) {
        return lines;
    }

    let code = lines[0].code;
    let n = (code.startsWith('if') || code.startsWith('while') || code.startsWith('def')) ? endCount + 1 : (
        code === 'end' ? endCount - 1 : endCount
    );

    return linesAfterCurrentBlock(lines.slice(1), n);
}

const VALUE_PART_PARSERS = new Map([
    ['value', {
        parse(tokenable) {
            // pattern matching from text
            return VALUE_PART_PARSERS.get('text').parse(tokenable);
        }
    }],
    ['text', {
        parse(tokenable) {
            let [textTokenable] = tokenable.tryTokenize('text');
            return textTokenable ? 
                      new Value(textTokenable.value
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
            let [numTokenable] = tokenable.tryTokenize('number');
            return numTokenable ? new Value(parseFloat(numTokenable.value)) : VALUE_PART_PARSERS.get('boolean').parse(tokenable);
        }        
    }],
    ['boolean', {
        parse(tokenable) {
            let [boolTokenable] = tokenable.tryTokenize('boolean');
            return boolTokenable ? new Value(boolTokenable.value === 'true') : VALUE_PART_PARSERS.get('variable').parse(tokenable);
        }        
    }],    
    ['variable', {
        parse(tokenable) {
            let [varTokenable] = tokenable.tryTokenize('variable');
            return varTokenable ? new Variable(varTokenable.value) : VALUE_PART_PARSERS.get('fcall').parse(tokenable);
        }
    }],
    ['fcall', {
        parse(tokenable) {
            let fcallTokenables = tokenable.tryTokenize('fcall');
            if(fcallTokenables.length !== 0) {
                let [fNameTokenable, ...argTokenables] = fcallTokenables;
                return new FunCall(
                    new Variable(fNameTokenable.value), 
                    argTokenables.map(argTokenable => VALUE_PART_PARSERS.get('value').parse(argTokenable))
                )
            }

            return VALUE_PART_PARSERS.get('expression').parse(tokenable);
        }        
    }],    
    ['expression', {
        parse(tokenable) {
            let tokenables = toPostfix(tokenable.tryTokenize('expression'));
            return tokenables.reduce((stack, tokenable) => {
                if(isOperator(tokenable.value)) {
                    return reduce(stack, tokenable.value);
                } 
                else if(tokenable.value.startsWith('not')) {
                    let [unaryTokenable, operandTokenable] = tokenable.tryTokenize('not');
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