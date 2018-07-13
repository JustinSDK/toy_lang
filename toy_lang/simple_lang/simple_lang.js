// === Tokenizer

class Tokens {
    constructor(tokens) {
        this.head = tokens[0];
        this.tail = tokens.slice(1);
    }
}

class Tokenizer {
    constructor(code) {
        this.code = code;
    }

    tokenize() {
        return this.code.trim().split('\n')
                        .map(line => line.trim())
                        .map(line => {
                            let assign = /([a-zA-Z_]+[a-zA-Z_0-9]*)\s*=\s*(.*)/.exec(line);
                            if(assign) {
                                return new Tokens(['var', assign[1], assign[2]]);
                            }
                            
                            if(line.startsWith('end')) {
                                return new Tokens(['end']);
                            }

                            let matched = /(\w+)\s*(.*)/.exec(line);
                            return new Tokens([matched[1], matched[2]]);
                        });
    }
}

// === Nodes

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

// === Parsers

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
            let matched = /([a-zA-Z_0-9]+)\s*\+\s*([a-zA-Z_0-9]+)/.exec(arg);
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
            let matched = /([a-zA-Z_0-9]+)\s*\-\s*([a-zA-Z_0-9]+)/.exec(arg);
            return matched !== null ? 
                    new Substract(
                        ARG_PARSERS.get('expression').parse(matched[1]), 
                        ARG_PARSERS.get('expression').parse(matched[2])
                    ) :
                    ARG_PARSERS.get('num').parse(arg);
        }
    }] 
]);

class AST {
    constructor(tokenizer) {
        this.ast = TOKEN_PARSERS.get('sequence').parse(tokenizer.tokenize());
    }

    evaluate(context) {
        return this.ast.evaluate(context);
    }
}

let code = `
text = 'Hello, World\\n'
t2 = text
print t2
x = 2
z = x - 2
print z + 3
print '\\n'
until0 x
    x = x - 1
    print '  XD\\n'
    print '  XD\\n'
    y = 3
    until0 y
        y = y - 1
        print '    ^o^\\n'
    end
    print '  XDXD\\n'
end
print 'Orz\\n'
`;

new AST(new Tokenizer(code))
    .evaluate(new Context())
    .outputs
    .forEach(output => process.stdout.write(`${output}`.replace('\\n', '\n')));

let fibonacci = `
print 'Fibonacci number\\n'
n = 10
fn1 = 1
fn2 = 1
print fn1
print ' '
print fn2
print ' '
until0 n
    fn = fn2 + fn1
    print fn
    print ' '
    fn1 = fn2
    fn2 = fn
    n = n - 1
end
print '\\n'
`;

new AST(new Tokenizer(fibonacci))
    .evaluate(new Context())
    .outputs
    .forEach(output => process.stdout.write(`${output}`.replace('\\n', '\n')));