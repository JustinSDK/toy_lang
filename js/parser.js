import {Stack} from './util.js';
import {Value, Void} from './ast/value.js';
import {Func, Return, FunCall, FunCallWrapper} from './ast/function.js';
import {BINARY_OPERATORS, UNARY_OPERATORS} from './ast/operator.js';
import {Variable, Assign, While, If, StmtSequence} from './ast/statement.js';
export {Parser};

class ParserInterceptor {
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
    ['sequence', new ParserInterceptor({
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
                let [variableName, assigned] = matched;
                return new StmtSequence(
                    new Assign(
                        new Variable(variableName.value), 
                        VALUE_PART_PARSERS.get('value').parse(assigned)
                    ),
                    LINE_PARSERS.get('sequence').parse(lines.slice(1))
                );
            }

            return LINE_PARSERS.get('funcall').parse(lines);
        }
    }],      
    ['funcall', {
        parse(lines) {
            let matched = lines[0].tryTokenize('funcall');
            if(matched.length !== 0) {
                let [funcName, ...args] = matched;
                return new StmtSequence(
                    new FunCallWrapper(
                        new FunCall(
                            new Variable(funcName.value),
                            args.map(arg => VALUE_PART_PARSERS.get('value').parse(arg)) 
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
            let [command, arg] = lines[0].tryTokenize('command');
            switch(command.value) {
                case 'def':
                    return createAssignFunc(lines, arg);
                case 'return':
                    return createReturn(lines, arg);
                case 'if':
                    return createIf(lines, arg);
                case 'while':
                    return createWhile(lines, arg);
            }
            throw new SyntaxError(`\n\t${lines[0].toString()}`);
        }
    }]
]);

function createAssignFunc(lines, arg) {
    let [funcName, ...params] = arg.tryTokenize('func');
    let remains = lines.slice(1);     
    return new StmtSequence(
        new Assign(
            new Variable(funcName.value), 
            new Func(params.map(param => new Variable(param.value)), LINE_PARSERS.get('sequence').parse(remains))
        ),
        LINE_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
    );    
}

function createReturn(lines, arg) { 
    return new StmtSequence(
        new Return(arg.value === '' ? Void : VALUE_PART_PARSERS.get('value').parse(arg)),
        LINE_PARSERS.get('sequence').parse(lines.slice(1))
    );
}

function createIf(lines, arg) {
    let remains = lines.slice(1);     
    let trueStmt = LINE_PARSERS.get('sequence').parse(remains);

    let i = matchingElseIdx(trueStmt);
    let falseStmt = remains[i].code === 'else' ? 
            LINE_PARSERS.get('sequence').parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;

    return new StmtSequence(
            new If(
            VALUE_PART_PARSERS.get('boolean').parse(arg), 
            trueStmt,
            falseStmt
            ),
            LINE_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
    );
}

function createWhile(lines, arg) {
    let remains = lines.slice(1);     
    return new StmtSequence(
         new While(
            VALUE_PART_PARSERS.get('boolean').parse(arg), 
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
        parse(token) {
            // pattern matching from text
            return VALUE_PART_PARSERS.get('text').parse(token);
        }
    }],
    ['text', {
        parse(token) {
            let [text] = token.tryTokenize('text');
            return text ? 
                      new Value(text.value.replace(/^\\r/, '\r')
                                          .replace(/^\\n/, '\n')
                                          .replace(/([^\\])\\r/g, '$1\r')
                                          .replace(/([^\\])\\n/g, '$1\n')
                                          .replace(/^\\t/, '\t')
                                          .replace(/([^\\])\\t/g, '$1\t')
                                          .replace(/\\\\/g, '\\')
                                          .replace(/\\'/g, '\'')
                      ) 
                      : VALUE_PART_PARSERS.get('num').parse(token);
        }
    }],
    ['num', {
        parse(token) {
            let [number] = token.tryTokenize('number');
            return number ? new Value(parseFloat(number.value)) : VALUE_PART_PARSERS.get('boolean').parse(token);
        }        
    }],
    ['boolean', {
        parse(token) {
            let [boolean] = token.tryTokenize('boolean');
            return boolean ? new Value(boolean.value === 'true') : VALUE_PART_PARSERS.get('variable').parse(token);
        }        
    }],    
    ['variable', {
        parse(token) {
            let [variable] = token.tryTokenize('variable');
            return variable ? new Variable(variable.value) : VALUE_PART_PARSERS.get('funcall').parse(token);
        }
    }],
    ['funcall', {
        parse(token) {
            let funcallTokens = token.tryTokenize('funcall');
            if(funcallTokens.length !== 0) {
                let [fName, ...args] = funcallTokens;
                return new FunCall(
                    new Variable(fName.value), 
                    args.map(arg => VALUE_PART_PARSERS.get('value').parse(token.from(arg.value)))
                )
            }

            return VALUE_PART_PARSERS.get('expression').parse(token);
        }        
    }],    
    ['expression', {
        parse(token) {
            let tokens = token.tryTokenize('postfixExprTokens');
            return tokens.reduce((stack, token) => {
                if(isOperator(token.value)) {
                    return reduce(stack, token.value);
                } 
                else if(token.value.startsWith('not')) {
                    let [not, operand] = token.from(token.value).tryTokenize('not');
                    let NotOperator = UNARY_OPERATORS.get(not.value);
                    return stack.push(
                        new NotOperator(
                            VALUE_PART_PARSERS.get('value').parse(token.from(operand.value))
                        )
                    );
                }
                return stack.push(
                    VALUE_PART_PARSERS.get('value').parse(token.from(token.value))
                );
            }, new Stack()).top;
        }
    }]
]);

function isOperator(token) {        
    return ['==', '!=', '>=', '>', '<=', '<',
            'and', 'or', 
            '+', '-', '*', '/', '%'].indexOf(token) !== -1;
}

function reduce(stack, token) {
    let right = stack.top;
    let s1 = stack.pop();
    let left = s1.top;
    let s2 = s1.pop();
    let Operator = BINARY_OPERATORS.get(token);
    return s2.push(new Operator(left, right));
}

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
