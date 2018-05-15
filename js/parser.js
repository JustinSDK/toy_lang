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

    parse(stmtTokenizers) {
        try {
            return this.parser.parse(stmtTokenizers);
        } 
        catch(ex) {
            if(ex instanceof SyntaxError) {
                throw ex;
            }
            throw new SyntaxError(`\n\t${stmtTokenizers[0].toString()}`);
        }
    }
}

const STMT_PARSERS = new Map([
    ['sequence', new ParserInterceptor({
        parse(stmtTokenizers) {
            if(stmtTokenizers.length === 0 || stmtTokenizers[0].type === 'else' || stmtTokenizers[0].type === 'end') {
                return StmtSequence.EMPTY;
            }
    
            return STMT_PARSERS.get(stmtTokenizers[0].type).parse(stmtTokenizers);   
        }
    })],    
    ['def', {
        parse(stmtTokenizers) {
            let [funcName, ...params] = stmtTokenizers[0].valueTester.tryTokens('def');
            let remains = stmtTokenizers.slice(1);     
            return new StmtSequence(
                new Assign(
                    new Variable(funcName), 
                    new Func(params.map(param => new Variable(param)), STMT_PARSERS.get('sequence').parse(remains))
                ),
                STMT_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
            );
        }
    }],   
    ['return', {
        parse(stmtTokenizers) {
            return new StmtSequence(
                new Return(stmtTokenizers[0].tokens[1] === '' ? Void : VALUE_PARSERS.get('value').parse(stmtTokenizers[0].valueTester)),
                STMT_PARSERS.get('sequence').parse(stmtTokenizers.slice(1))
            );
        }
    }],      
    ['funcall', {
        parse(stmtTokenizers) {
            return new StmtSequence(
                new FunCallWrapper(
                    new FunCall(
                        new Variable(stmtTokenizers[0].funcName()), 
                        stmtTokenizers[0].argsAsValueTesters().map(valueTester => VALUE_PARSERS.get('value').parse(valueTester))
                    )
                ),
                STMT_PARSERS.get('sequence').parse(stmtTokenizers.slice(1))
            );
        }
    }],        
    ['=', {
        parse(stmtTokenizers) {
            return new StmtSequence(
                new Assign(
                    new Variable(stmtTokenizers[0].variableName()), 
                    VALUE_PARSERS.get('value').parse(stmtTokenizers[0].valueTester)
                ),
                STMT_PARSERS.get('sequence').parse(stmtTokenizers.slice(1))
            );
        }
    }],
    ['if', {
        parse(stmtTokenizers) {
            let remains = stmtTokenizers.slice(1);     
            let trueStmt = STMT_PARSERS.get('sequence').parse(remains);

            let i = matchingElseIdx(trueStmt);
            let falseStmt = remains[i].type === 'else' ? 
                    STMT_PARSERS.get('sequence').parse(remains.slice(i + 1)) : 
                    StmtSequence.EMPTY;

            return new StmtSequence(
                 new If(
                    VALUE_PARSERS.get('boolean').parse(stmtTokenizers[0].valueTester), 
                    trueStmt,
                    falseStmt
                 ),
                 STMT_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
            );
        }
    }],
    ['while', {
        parse(stmtTokenizers) {
            let remains = stmtTokenizers.slice(1);     
            return new StmtSequence(
                 new While(
                    VALUE_PARSERS.get('boolean').parse(stmtTokenizers[0].valueTester), 
                    STMT_PARSERS.get('sequence').parse(remains)
                 ),
                 STMT_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
            );
        }
    }]
]);

function matchingElseIdx(stmt, i = 1) {
    if(stmt.secondStmt === StmtSequence.EMPTY) {
        return i;
    }
    return matchingElseIdx(stmt.secondStmt, i + 1);
}

function linesAfterCurrentBlock(stmtTokenizers, end = 1) {
    if(end === 0) {
        return stmtTokenizers;
    }

    let stmtType = stmtTokenizers[0].type;
    let rpts = stmtType === 'if' || stmtType === 'while' || stmtType === 'def' ? end + 1 : 
        (stmtType === 'end' ? end - 1 : end);
    
    return linesAfterCurrentBlock(stmtTokenizers.slice(1), rpts)
}

const VALUE_PARSERS = new Map([
    ['value', {
        parse(valueTester) {
            // pattern matching from text
            return VALUE_PARSERS.get('text').parse(valueTester);
        }
    }],
    ['text', {
        parse(valueTester) {
            let text = valueTester.tryToken('text');
            return text === null ? 
                      VALUE_PARSERS.get('num').parse(valueTester) : 
                      new Value(text.replace(/^\\r/, '\r')
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
    ['num', {
        parse(valueTester) {
            let number = valueTester.tryToken('number');
            return number === null ? VALUE_PARSERS.get('boolean').parse(valueTester) : new Value(parseFloat(number));
        }        
    }],
    ['boolean', {
        parse(valueTester) {
            let boolean = valueTester.tryToken('boolean');
            return boolean === null ? VALUE_PARSERS.get('variable').parse(valueTester) : new Value(boolean === 'true');
        }        
    }],    
    ['variable', {
        parse(valueTester) {
            let variable = valueTester.tryToken('variable');
            return variable === null ?  VALUE_PARSERS.get('funcall').parse(valueTester) : new Variable(variable);
        }
    }],
    ['funcall', {
        parse(valueTester) {
            let funcallTokens = valueTester.tryTokens('funcall');
            if(funcallTokens) {
                let [fName, ...args] = funcallTokens;
                return new FunCall(
                    new Variable(fName), 
                    args.map(arg => VALUE_PARSERS.get('value').parse(valueTester.valueTester(arg)))
                )
            }

            return VALUE_PARSERS.get('expression').parse(valueTester);
        }        
    }],    
    ['expression', {
        parse(valueTester) {
            let tokens = valueTester.tryTokens('postfixExprTokens');
            return tokens.reduce((stack, token) => {
                if(isOperator(token)) {
                    return reduce(stack, token);
                } 
                else if(token.startsWith('not')) {
                    let [not, operand] = valueTester.valueTester(token).tryTokens('not');
                    let NotOperator = UNARY_OPERATORS.get(not);
                    return stack.push(
                        new NotOperator(
                            VALUE_PARSERS.get('value').parse(valueTester.valueTester(operand))
                        )
                    );
                }
                return stack.push(
                    VALUE_PARSERS.get('value').parse(valueTester.valueTester(token))
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
            let stmtTokenizers = tokenizer.stmtTokenizers();
            return STMT_PARSERS.get('sequence').parse(stmtTokenizers);
        }
        catch(ex) {
            this.environment.output(ex);
            throw ex;
        }
    }
}
