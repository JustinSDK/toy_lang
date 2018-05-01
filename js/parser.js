import {Stack} from './util.js';
export {AST};

const STMT_PARSERS = new Map([
    ['sequence', {
        parse(stmts) {
            if(stmts.length === 0 || stmts[0].type === 'empty') {
                return StmtSequence.EMPTY;
            }
    
            return STMT_PARSERS.get(stmts[0].type).parse(stmts);   
        }
    }],    
    ['def', {
        parse(stmts) {
            let [funcName, ...params] = stmts[0].tokenTester.defTokens();
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
    ['funcall', {
        parse(stmts) {
            return new StmtSequence(
                new FunCall(
                    new Variable(stmts[0].funcName()), 
                    stmts[0].args().map(tokenTester => VALUE_PARSERS.get('value').parse(tokenTester))
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
            return new StmtSequence(
                 new If(
                    VALUE_PARSERS.get('boolean').parse(stmts[0].tokenTester), 
                    STMT_PARSERS.get('sequence').parse(remains)
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

function linesAfterCurrentBlock(stmts, end = 1) {
    if(end === 0) {
        return stmts;
    }

    let stmt = stmts[0].type;
    let rpts = stmt === 'if' || stmt === 'while' || stmt === 'def' ? end + 1 : 
        (stmt === 'empty' ? end - 1 : end);
    
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
            let text = tokenTester.textToken();
            return text === null ? VALUE_PARSERS.get('num').parse(tokenTester) : new Text(text);
        }
    }],
    ['num', {
        parse(tokenTester) {
            let number = tokenTester.numberToken();
            return number === null ? VALUE_PARSERS.get('boolean').parse(tokenTester) : new Num(parseFloat(number));
        }        
    }],
    ['boolean', {
        parse(tokenTester) {
            let boolean = tokenTester.booleanToken();
            return boolean === null ? VALUE_PARSERS.get('variable').parse(tokenTester) : new Boolean(boolean === 'true');
        }        
    }],    
    ['variable', {
        parse(tokenTester) {
            let variable = tokenTester.variableToken();
            return variable === null ? VALUE_PARSERS.get('bool_expr').parse(tokenTester) : new Variable(variable);
        }
    }],
    ['bool_expr', {
        parse(tokenTester) {
            let boolExprTokens = tokenTester.boolExprTokens();
            if(boolExprTokens) {
                let [left, op, right] = boolExprTokens;
                let leftNumber = parseFloat(left);
                let rightNumber = parseFloat(right);    
                let Class = RELATIONS.get(op);
                return new Class(
                    Number.isNaN(leftNumber) ? new Variable(left) : new Num(leftNumber), 
                    Number.isNaN(rightNumber) ? new Variable(right) : new Num(rightNumber)
                );
            }

            return VALUE_PARSERS.get('expression').parse(tokenTester);
        }        
    }],    
    ['expression', {
        parse(tokenTester) {
            let tokens = tokenTester.expressionPostfixTokens();
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
    constructor(parent = null, outputs = [], variables = new Map()) {
        this.parent = parent;
        this.outputs = outputs;
        this.variables = variables;
    }

    output(value) {
        return new Context(
            this.parent,
            this.outputs.concat([value]),
            this.variables
        );
    }

    assign(variable, value) {
        return new Context(
            this.parent,
            this.outputs,
            new Map(Array.from(this.variables.entries()).concat([[variable, value]]))
        );
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

class Num {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}

class Boolean {
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
            return new Num(lookUpVariable(context, this.name.slice(1)).value * -1) ;
        }
        return lookUpVariable(context, this.name);
    }
}

function lookUpVariable(context, name) {
    let value = context.variables.get(name);
    return value === undefined ? lookUpVariable(context.parent, name) : value;
}

class Assign {
    constructor(variable, value) {
        this.variable = variable;
        this.value = value;
    }

    evaluate(context) {
        return context.assign(this.variable.name, this.value.evaluate(context));
    }
}

class Print {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return context.output(this.value.evaluate(context).value);
    }
}

class Equal {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value === this.right.evaluate(context).value)
    }
}

class NotEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value !== this.right.evaluate(context).value)
    }
}

class GreaterEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value >= this.right.evaluate(context).value)
    }
}

class LessEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value <= this.right.evaluate(context).value)
    }
}

class GreaterThan {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value > this.right.evaluate(context).value)
    }
}

class LessThan {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value < this.right.evaluate(context).value)
    }
}

const RELATIONS = new Map([
    ['==', Equal],
    ['!=', NotEqual],
    ['>=', GreaterEqual],
    ['<=', LessEqual],
    ['>', GreaterThan],
    ['<', LessThan]
]);

class While {
    constructor(boolean, stmt) {
        this.boolean = boolean;
        this.stmt = stmt;
    }

    evaluate(context) {
        if(this.boolean.evaluate(context).value) {
            let ctx = this.stmt.evaluate(context);
            return this.evaluate(ctx);
        }

        return context;
    }   
}

class If {
    constructor(boolean, stmt) {
        this.boolean = boolean;
        this.stmt = stmt;
    }

    evaluate(context) {
        if(this.boolean.evaluate(context).value) {
            return this.stmt.evaluate(context);
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

    evaluate(context = new Context()) {
        return this.ast.evaluate(context);
    }
}

class Func {
    constructor(params, stmt) {
        this.params = params;
        this.stmt = stmt;
    }

    call(args) {
        return new StmtSequence(assigns(this.params, args), this.stmt);
    }

    evaluate(context) {
        return this;
    }
}

function assigns(params, args) {
    if(params.length === 0) {
        return StmtSequence.EMPTY;
    }
    return new StmtSequence(
                  new Assign(new Variable(params[0]), args[0]), 
                  assigns(params.slice(1), args.slice(1))
            );
}

class FunCall {
    constructor(fVariable, args) {
        this.fVariable = fVariable;
        this.args = args;
    }

    evaluate(context) {
        let f = this.fVariable.evaluate(context);
        let stmt = f.call(this.args.map(arg => arg.evaluate(context)));
        let ctx = stmt.evaluate(new Context(context, context.outputs));
        return new Context(context.parent, ctx.outputs, context.variables);
    }    
}
