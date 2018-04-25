export {Context, AST};

const CMD_PARSERS = new Map([
    ['var', {
        parse(lines) {
            return new Sequence(
                TOKEN_PARSERS.get('var').parse(lines[0]),
                TOKEN_PARSERS.get('sequence').parse(lines.slice(1))
            );
        }
    }],
    ['print', {
        parse(lines) {
            return new Sequence(
                TOKEN_PARSERS.get('print').parse(lines[0]),
                TOKEN_PARSERS.get('sequence').parse(lines.slice(1))
            );
        }
    }],
    ['until0', {
        parse(lines) {
            function linesAfterUntil0(lines, until0 = 1) {
                if(until0 === 0) {
                    return lines;
                }
    
                let keyword = lines[0].head;
                let rpts = keyword === 'until0' ? until0 + 1 : 
                    (keyword === 'end' ? until0 - 1 : until0);
                
                return linesAfterUntil0(lines.slice(1), rpts)
            }
    
            return new Sequence(
                 TOKEN_PARSERS.get('until0').parse(lines),
                 TOKEN_PARSERS.get('sequence').parse(linesAfterUntil0(lines.slice(1)))
            );
        }
    }]
]);

const TOKEN_PARSERS = new Map([
    ['var', {
        parse(tokens) {
            return new Var(
                new Variable(tokens.tail[0]), 
                ARG_PARSERS.get('expression').parse(tokens.tail[1])
            );
        }
    }],    
    ['print', {
        parse(tokens) {
            return new Print(ARG_PARSERS.get('expression').parse(tokens.tail[0]));
        }
    }],
    ['until0', {
        parse(lines) {
            return new UntilZero(
                ARG_PARSERS.get('expression').parse(lines[0].tail[0]), 
                TOKEN_PARSERS.get('sequence').parse(lines.slice(1))
            );
        }
    }],
    ['sequence', {
        parse(lines) {
            if(lines.length === 0 || lines[0].head === 'end') {
                return Sequence.nothing;
            }
    
            return CMD_PARSERS.get(lines[0].head).parse(lines);   
        }
    }]    
]);

const ARG_PARSERS =  new Map([
    ['num', {
        parse(arg) {
            return new Num(parseInt(arg));
        }        
    }],
    ['text', {
        parse(arg) {
            let matched = /'(.*)'/.exec(arg);
            return matched !== null ? 
                      new Text(matched[1]) : 
                      ARG_PARSERS.get('variable').parse(arg);
        }
    }],
    ['variable', {
        parse(arg) {
            return arg.search(/^[a-zA-Z_]+[a-zA-Z_0-9]*$/) !== -1 ?
                       new Variable(arg) :
                       ARG_PARSERS.get('add').parse(arg);
        }
    }],
    ['expression', {
        parse(arg) {
            return ARG_PARSERS.get('text').parse(arg);
        }
    }],
    ['add', {
        parse(arg) {
            let matched = /([a-zA-Z_0-9]+)\s*\+\s*(.+)/.exec(arg);
            return matched !== null ?
                    new Add(
                        ARG_PARSERS.get('expression').parse(matched[1]), 
                        ARG_PARSERS.get('expression').parse(matched[2])
                    ) :
                    ARG_PARSERS.get('substract').parse(arg);
        }
    }],    
    ['substract', {
        parse(arg) {
            let matched = /([a-zA-Z_0-9]+)\s*\-\s*(.+)/.exec(arg);
            return matched !== null ? 
                    new Substract(
                        ARG_PARSERS.get('expression').parse(matched[1]), 
                        ARG_PARSERS.get('expression').parse(matched[2])
                    ) :
                    ARG_PARSERS.get('num').parse(arg);
        }
    }] 
]);

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

class Var {
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
    constructor(expression, cmd) {
        this.expression = expression;
        this.cmd = cmd;
    }

    evaluate(context) {
        if(this.expression.evaluate(context).value !== 0) {
            let ctx = this.cmd.evaluate(context);
            return this.evaluate(ctx);
        }

        return context;
    }    
}

class Sequence {
    constructor(firstCmd, secondCmd) {
        this.firstCmd = firstCmd;
        this.secondCmd = secondCmd;
    }

    evaluate(context) {
        return this.secondCmd.evaluate(this.firstCmd.evaluate(context));
    }
}

Sequence.nothing = {
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

class AST {
    constructor(tokenizer) {
        this.ast = TOKEN_PARSERS.get('sequence').parse(tokenizer.tokenize());
    }

    evaluate(context) {
        return this.ast.evaluate(context);
    }
}