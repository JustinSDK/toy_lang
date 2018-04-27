import {Stack} from './util.js';
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
                    new Variable(stmts[0].variableName()), 
                    ARG_PARSERS.get('value').parse(stmts[0])
                ),
                STMT_PARSERS.get('sequence').parse(stmts.slice(1))
            );
        }
    }],
    ['print', {
        parse(stmts) {
            return new StmtSequence(
                new Print(ARG_PARSERS.get('value').parse(stmts[0])),
                STMT_PARSERS.get('sequence').parse(stmts.slice(1))
            );
        }
    }],
    ['until0', {
        parse(stmts) {
            return new StmtSequence(
                 new UntilZero(
                    ARG_PARSERS.get('num').parse(stmts[0]), 
                    STMT_PARSERS.get('sequence').parse(stmts.slice(1))
                 ),
                 STMT_PARSERS.get('sequence').parse(linesAfterUntil0(stmts.slice(1)))
            );
        }
    }]
]);

function linesAfterUntil0(stmts, until0 = 1) {
    if(until0 === 0) {
        return stmts;
    }

    let stmt = stmts[0].type;
    let rpts = stmt === 'until0' ? until0 + 1 : 
        (stmt === 'empty' ? until0 - 1 : until0);
    
    return linesAfterUntil0(stmts.slice(1), rpts)
}

const ARG_PARSERS =  new Map([
    ['value', {
        parse(stmt) {
            // pattern matching from text
            return ARG_PARSERS.get('text').parse(stmt);
        }
    }],
    ['text', {
        parse(stmt) {
            let text = stmt.textToken();
            return text === null ? ARG_PARSERS.get('num').parse(stmt) : new Text(text);
        }
    }],
    ['num', {
        parse(stmt) {
            let number = stmt.numberToken();
            return number === null ? ARG_PARSERS.get('variable').parse(stmt) : new Num(parseFloat(number));
        }        
    }],
    ['variable', {
        parse(stmt) {
            let variable = stmt.variableToken();
            return variable === null ? ARG_PARSERS.get('expression').parse(stmt) : new Variable(variable);
        }
    }],
    ['expression', {
        parse(stmt) {
            let tokens = stmt.expressionPostfixTokens();
            return tokens.reduce((stack, token) => {
                if('+-*/'.indexOf(token) !== -1) {
                    return reduce(stack, token);
                } 
                let number = parseFloat(token);
                return stack.push(Number.isNaN(number) ? new Variable(token) : new Num(number));
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
        if(this.name.charAt(0) === '-') {
            return context.variables.get(this.name.slice(1)) * -1;
        }
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