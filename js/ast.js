import {Stack} from './util.js';
import {ExprTokenizer} from './tokenizer.js';
export {Context, AST};

const STMT_PARSERS = new Map([
    ['sequence', {
        parse(stmts) {
            if(stmts.length === 0 || stmts[0].type === 'empty') {
                return StmtSequence.EMPTY;
            }
    
            return STMT_PARSERS.get(stmts[0].type).parse(stmts);   
        }
    }],    
    ['assign', {
        parse(stmts) {
            return new StmtSequence(
                new Assign(
                    new Variable(stmts[0].tail[0]), 
                    ARG_PARSERS.get('arg').parse(stmts[0].tail[1])
                ),
                STMT_PARSERS.get('sequence').parse(stmts.slice(1))
            );
        }
    }],
    ['print', {
        parse(stmts) {
            return new StmtSequence(
                new Print(ARG_PARSERS.get('arg').parse(stmts[0].tail[0])),
                STMT_PARSERS.get('sequence').parse(stmts.slice(1))
            );
        }
    }],
    ['until0', {
        parse(stmts) {
            return new StmtSequence(
                 new UntilZero(
                    ARG_PARSERS.get('num').parse(stmts[0].tail[0]), 
                    STMT_PARSERS.get('sequence').parse(stmts.slice(1))
                 ),
                 STMT_PARSERS.get('sequence').parse(linesAfterUntil0(stmts.slice(1)))
            );
        }
    }]
]);

function linesAfterUntil0(lines, until0 = 1) {
    if(until0 === 0) {
        return lines;
    }

    let stmt = lines[0].type;
    let rpts = stmt === 'until0' ? until0 + 1 : 
        (stmt === 'empty' ? until0 - 1 : until0);
    
    return linesAfterUntil0(lines.slice(1), rpts)
}

const ARG_PARSERS =  new Map([
    ['arg', {
        parse(arg) {
            // pattern matching from text
            return ARG_PARSERS.get('text').parse(arg);
        }
    }],
    ['text', {
        parse(arg) {
            let matched = /^'(.*)'$/.exec(arg);
            return matched !== null ? 
                      new Text(matched[1]) : 
                      ARG_PARSERS.get('num').parse(arg);
        }
    }],
    ['num', {
        parse(arg) {
            let matched = /^-?[0-9]+\.?[0-9]*$/.exec(arg);
            return matched !== null ? new Num(parseFloat(arg)) : ARG_PARSERS.get('variable').parse(arg);
        }        
    }],
    ['variable', {
        parse(arg) {
            let matched = /^-?[a-zA-Z_]+[a-zA-Z_0-9]*$/.exec(arg);
            if(matched) {
                return matched[0].charAt(0) === '-' ? 
                           ARG_PARSERS.get('expression').parse(`0 ${arg}`) : 
                           new Variable(arg);
            } 
            return ARG_PARSERS.get('expression').parse(arg);
        }
    }],
    ['expression', {
        parse(arg) {
            let tokens = new ExprTokenizer(arg).postfixTokens();
            return tokens.reduce((stack, token) => {
                if('+-*/'.indexOf(token) !== -1) {
                    return reduce(stack, token);
                } 
                return stack.push(ARG_PARSERS.get('num').parse(token));
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

class Context {
    constructor(outputs = [], variables = new Map()) {
        this.outputs = outputs;
        this.variables = variables;
    }
}

class Num {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}

class Text {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}

class Variable {
    constructor(name) {
        this.name = name;
    }

    evaluate(context) {
        return context.variables.get(this.name);
    }
}

class Assign {
    constructor(variable, expression) {
        this.variable = variable;
        this.expression = expression;
    }

    evaluate(context) {
        let value = this.expression.evaluate(context);
        return new Context(
            context.outputs,
            new Map(Array.from(context.variables.entries()).concat([[this.variable.name, value]]))
        );
    }
}

class Print {
    constructor(expression) {
        this.expression = expression;
    }

    evaluate(context) {
        return new Context(
            context.outputs.concat([this.expression.evaluate(context).value]),
            context.variables
        );
    }
}

class UntilZero {
    constructor(expression, stmt) {
        this.expression = expression;
        this.stmt = stmt;
    }

    evaluate(context) {
        if(this.expression.evaluate(context).value !== 0) {
            let ctx = this.stmt.evaluate(context);
            return this.evaluate(ctx);
        }

        return context;
    }    
}

class StmtSequence {
    constructor(firstStmt, secondStmt) {
        this.firstStmt = firstStmt;
        this.secondStmt = secondStmt;
    }

    evaluate(context) {
        return this.secondStmt.evaluate(this.firstStmt.evaluate(context));
    }
}

StmtSequence.EMPTY = {
    evaluate(context) {
        return context;
    }
};

class Add {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value + this.right.evaluate(context).value);
    }
}

class Substract {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value - this.right.evaluate(context).value);
    }
}

class Multiply {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value * this.right.evaluate(context).value);
    }
}

class Divide {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value / this.right.evaluate(context).value);
    }
}

class AST {
    constructor(tokenizer) {
        this.ast = STMT_PARSERS.get('sequence').parse(tokenizer.tokenize());
    }

    evaluate(context) {
        return this.ast.evaluate(context);
    }
}