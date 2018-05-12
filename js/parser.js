import {Stack} from './util.js';
import {Value, Void} from './ast/value.js';
import {Func, Return, FunCall, FunCallWrapper} from './ast/function.js';
import {BINARY_OPERATORS, UNARY_OPERATORS} from './ast/operator.js';
import {Variable, Assign, While, If, StmtSequence} from './ast/statement.js';
export {Parser};

const STMT_PARSERS = new Map([
    ['sequence', {
        parse(stmts) {
            if(stmts.length === 0 || stmts[0].type === 'else' || stmts[0].type === 'end') {
                return StmtSequence.EMPTY;
            }
    
            return STMT_PARSERS.get(stmts[0].type).parse(stmts);   
        }
    }],    
    ['def', {
        parse(stmts) {
            let [funcName, ...params] = stmts[0].tokenTester.tryTokens('def');
            let remains = stmts.slice(1);     
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
        parse(stmts) {
            return new StmtSequence(
                new Return(stmts[0].tokens[1] === '' ? Void : VALUE_PARSERS.get('value').parse(stmts[0].tokenTester)),
                STMT_PARSERS.get('sequence').parse(stmts.slice(1))
            );
        }
    }],      
    ['funcall', {
        parse(stmts) {
            return new StmtSequence(
                new FunCallWrapper(
                    new FunCall(
                        new Variable(stmts[0].funcName()), 
                        stmts[0].args().map(tokenTester => VALUE_PARSERS.get('value').parse(tokenTester))
                    )
                ),
                STMT_PARSERS.get('sequence').parse(stmts.slice(1))
            );
        }
    }],        
    ['assign', {
        parse(stmts) {
            return new StmtSequence(
                new Assign(
                    new Variable(stmts[0].variableName()), 
                    VALUE_PARSERS.get('value').parse(stmts[0].tokenTester)
                ),
                STMT_PARSERS.get('sequence').parse(stmts.slice(1))
            );
        }
    }],
    ['if', {
        parse(stmts) {
            let remains = stmts.slice(1);     
            let trueStmt = STMT_PARSERS.get('sequence').parse(remains);

            let i = matchingElseIdx(trueStmt);
            let falseStmt = remains[i].type === 'else' ? 
                    STMT_PARSERS.get('sequence').parse(remains.slice(i + 1)) : 
                    StmtSequence.EMPTY;

            return new StmtSequence(
                 new If(
                    VALUE_PARSERS.get('boolean').parse(stmts[0].tokenTester), 
                    trueStmt,
                    falseStmt
                 ),
                 STMT_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
            );
        }
    }],
    ['while', {
        parse(stmts) {
            let remains = stmts.slice(1);     
            return new StmtSequence(
                 new While(
                    VALUE_PARSERS.get('boolean').parse(stmts[0].tokenTester), 
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

function linesAfterCurrentBlock(stmts, end = 1) {
    if(end === 0) {
        return stmts;
    }

    let stmt = stmts[0].type;
    let rpts = stmt === 'if' || stmt === 'while' || stmt === 'def' ? end + 1 : 
        (stmt === 'end' ? end - 1 : end);
    
    return linesAfterCurrentBlock(stmts.slice(1), rpts)
}

const VALUE_PARSERS = new Map([
    ['value', {
        parse(tokenTester) {
            // pattern matching from text
            return VALUE_PARSERS.get('text').parse(tokenTester);
        }
    }],
    ['text', {
        parse(tokenTester) {
            let text = tokenTester.tryToken('text');
            return text === null ? 
                      VALUE_PARSERS.get('num').parse(tokenTester) : 
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
        parse(tokenTester) {
            let number = tokenTester.tryToken('number');
            return number === null ? VALUE_PARSERS.get('boolean').parse(tokenTester) : new Value(parseFloat(number));
        }        
    }],
    ['boolean', {
        parse(tokenTester) {
            let boolean = tokenTester.tryToken('boolean');
            return boolean === null ? VALUE_PARSERS.get('variable').parse(tokenTester) : new Value(boolean === 'true');
        }        
    }],    
    ['variable', {
        parse(tokenTester) {
            let variable = tokenTester.tryToken('variable');
            return variable === null ?  VALUE_PARSERS.get('not').parse(tokenTester) : new Variable(variable);
        }
    }],
    ['not', {
        parse(tokenTester) {
            let notTokens = tokenTester.tryTokens('not');
            if(notTokens) {
                let [not, operand] = notTokens;
                let NotOperator = UNARY_OPERATORS.get(not);
                return new NotOperator(
                    VALUE_PARSERS.get('value').parse(tokenTester.tokenTester(operand))
                );
            }

            return VALUE_PARSERS.get('funcall').parse(tokenTester);
        }        
    }],   
    ['funcall', {
        parse(tokenTester) {
            let funcallTokens = tokenTester.tryTokens('funcall');
            if(funcallTokens) {
                let [fName, ...args] = funcallTokens;
                return new FunCall(
                    new Variable(fName), 
                    args.map(arg => VALUE_PARSERS.get('value').parse(tokenTester.tokenTester(arg)))
                )
            }

            return VALUE_PARSERS.get('expression').parse(tokenTester);
        }        
    }],    
    ['expression', {
        parse(tokenTester) {
            let tokens = tokenTester.tryTokens('postfixExprTokens');
            return tokens.reduce((stack, token) => {
                if(isOperator(token)) {
                    return reduce(stack, token);
                } 
                return stack.push(
                    VALUE_PARSERS.get('value').parse(tokenTester.tokenTester(token))
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
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
    }

    parse() {
        return STMT_PARSERS.get('sequence').parse(this.tokenizer.tokenize());
    }
}
