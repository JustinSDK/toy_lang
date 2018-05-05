import {Stack} from './util.js';
import {Value, Void, FunCallValue} from './ast/value.js'
import {Add, Substract, Multiply, Divide, RELATIONS} from './ast/operator.js'
import {Variable, Assign, Print, While, If, StmtSequence, Func, Return, FunCallStmt, Context} from './ast/statement.js'
export {AST};

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
                    new Func(params, STMT_PARSERS.get('sequence').parse(remains))
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
                new FunCallStmt(
                    new FunCallValue(
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
    ['print', {
        parse(stmts) {
            return new StmtSequence(
                new Print(VALUE_PARSERS.get('value').parse(stmts[0].tokenTester)),
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
            return text === null ? VALUE_PARSERS.get('num').parse(tokenTester) : new Value(text);
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
            return variable === null ? VALUE_PARSERS.get('relation').parse(tokenTester) : new Variable(variable);
        }
    }],
    ['relation', {
        parse(tokenTester) {
            let boolExprTokens = tokenTester.tryTokens('relation');
            if(boolExprTokens) {
                let [left, op, right] = boolExprTokens;
                let Class = RELATIONS.get(op);
                return new Class(
                    VALUE_PARSERS.get('value').parse(tokenTester.tokenTester(left)), 
                    VALUE_PARSERS.get('value').parse(tokenTester.tokenTester(right))
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
                return new FunCallValue(
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
                if('+-*/'.indexOf(token) !== -1) {
                    return reduce(stack, token);
                } 
                // let number = parseFloat(token);
                return stack.push(
                    VALUE_PARSERS.get('value').parse(tokenTester.tokenTester(token))
                );
            }, new Stack()).top;
        }
    }]
]);

function reduce(stack, token) {
    let right = stack.top;
    let s1 = stack.pop();
    let left = s1.top;
    let s2 = s1.pop();
    switch(token) {
        case '+':
            return s2.push(new Add(left, right));
        case '-':
            return s2.push(new Substract(left, right));
        case '*':
            return s2.push(new Multiply(left, right));
        case '/':
            return s2.push(new Divide(left, right));                                                           
    }
}

class AST {
    constructor(tokenizer, output) {
        this.ast = STMT_PARSERS.get('sequence').parse(tokenizer.tokenize());
        this.output = output;
    }

    evaluate(context = new Context(null, this.output)) {
        return this.ast.evaluate(context);
    }
}
