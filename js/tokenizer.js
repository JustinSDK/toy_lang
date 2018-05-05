import {Stack} from './util.js';
export {StmtTokenizer};

function funcArguments(input) {
    let matched = /^\(\s*(.*)\s*\)$/.exec(input);
    if(matched[1] === '') {
        return [];
    }
    return matched[1].split(/,\s*/);
}

const TOKEN_TESTERS = new Map([
    ['text', function(input) {
        let matched = /^'([^']*)'$/.exec(input);
        return matched === null ? null : matched[1];
    }],
    ['number', function(input) {
        let matched = /^-?[0-9]+\.?[0-9]*$/.exec(input);
        return matched === null ? null : input;
    }],
    ['boolean', function(input) {
        let matched = /^(true|false)$/.exec(input);
        return matched === null ? null : input;
    }],
    ['variable', function(input) {
        let matched = /^-?[a-zA-Z_]+[a-zA-Z_0-9]*$/.exec(input);
        return matched === null ? null : input;
    }],
    ['funcall', function(input) {
        let matched = /^([a-zA-Z_]+[a-zA-Z_0-9]*)(\(.*\))$/.exec(input);
        return matched === null ? null : [matched[1]].concat(funcArguments(matched[2]));
    }],
    ['not', function(input) {
        let matched = /^not\s+(.*)$/.exec(input);
        return matched === null ? null : ['not', matched[1]];
    }],    
    ['logic', function(input) {
        let matched = /^(.*)\s+(and|or)\s+(.*)$/.exec(input);
        return matched === null ? null : [matched[1], matched[2], matched[3]];
    }],
    ['relation', function(input) {
        let matched = /^(.*)\s+(==|!=|>=|<=|>|<)\s+(.*)$/.exec(input);
        return matched === null ? null : [matched[1], matched[2], matched[3]];
    }],
    ['postfixExprTokens', function(input) {
        return new ExprTokenizer(input.charAt(0) === '-' ? `0 ${input}` : input).postfixTokens();
    }],
    ['def', function(input) {
        let matched = /^([a-zA-Z_]+[a-zA-Z_0-9])\(\s*(.*)\s*\)$/.exec(input);
        return [matched[1]].concat(matched[2] === '' ? [] : matched[2].split(/,\s*/));
    }]
]);

class TokenTester {
    constructor(input) {
        this.input = input;
    }

    tokenTester(input) {
        return new TokenTester(input);
    }

    tryToken(type) {
        return TOKEN_TESTERS.get(type)(this.input);
    }

    tryTokens(type) {
        return TOKEN_TESTERS.get(type)(this.input);
    }
}

class Statement {
    constructor(type, tokens) {
        this.type = type;
        this.tokens = tokens;
        this.tokenTester = new TokenTester(this.matchingValue());
    }
}

class EmptyStatement extends Statement {
    constructor(type, tokens) {
        super(type, tokens);
    }

    matchingValue() {
        return '';
    }
}

class AssignStatement extends Statement {
    constructor(type, tokens) {
        super(type, tokens);
    }

    variableName() {
        return this.tokens[0];
    }

    assigned() {
        return this.tokens[2];
    }

    matchingValue() {
        return this.assigned();
    }
}

class OneArgStatement extends Statement {
    constructor(type, tokens) {
        super(type, tokens);
    }

    funcName() {
        return this.tokens[0];
    }    

    argument() {
        return this.tokens[1];
    }

    matchingValue() {
        return this.argument();
    }
}

class FuncallStatement extends Statement {
    constructor(type, tokens) {
        super(type, tokens);
    }

    funcName() {
        return this.tokens[0];
    }    

    matchingValue() {
        return this.tokens[1];
    }

    args() {
        let argTokens = funcArguments(this.matchingValue());
        return argTokens.map(token => new TokenTester(token));
    }
}

class StmtTokenizer {
    constructor(code) {
        this.code = code;
    }

    tokenize() {
        return this.code.trim().split('\n')
                        .map(line => line.trim())
                        .filter(line => line !== '')
                        .map(line => {
                            if(line.startsWith('end')) {
                                return new EmptyStatement('end', [line]);
                            }

                            if(line.startsWith('else')) {
                                return new EmptyStatement('else', [line]);
                            }
                            
                            let assign = /^([a-zA-Z_]+[a-zA-Z_0-9]*)\s*(=)\s*(.*)$/.exec(line);
                            if(assign) {
                                return new AssignStatement('assign', [assign[1], assign[2], assign[3]]);
                            }

                            let funcall = /^([a-zA-Z_]+[a-zA-Z_0-9]*)(\(.*\))$/.exec(line);
                            if(funcall) {
                                return new FuncallStatement('funcall', [funcall[1], funcall[2]]);
                            }

                            let reTurn = /^return\s*(.*)$/.exec(line);
                            if(reTurn) {
                                return new OneArgStatement('return', ['return', reTurn[1]]);
                            }

                            let command = /^(\w+)\s+(.*)$/.exec(line);
                            return new OneArgStatement(command[1], [command[1], command[2]]);
                        });
    }
}

class ExprTokenizer {
    constructor(expr) {
        this.expr = expr;
    }

    infixTokens() {
        return expr_tokens(this.expr);
    }

    postfixTokens() {
        return toPostfix(this.infixTokens());
    }
}

function expr_tokens(expr) {
    let regex = /^(([a-zA-Z_]+[a-zA-Z_0-9]*\(.*\))|('[^']*')|(\+|\-|\*|\/)|(\(|\))|([a-zA-Z_]+[a-zA-Z_0-9]*|[0-9]+\.?[0-9]*))/;
    let matched = regex.exec(expr);
    if(matched) {
        let token = matched[1];
        return [token].concat(expr_tokens(expr.slice(token.length).trim()));
    } 
    else {
        return [];
    }
}

function priority(c) {
    return c === '+' || c === '-' ? 1 : 
           c === '*' || c === '/' ? 2 : 0;
}

function popHighPriority(token, stack, output) {
    if(!stack.isEmpty() && priority(stack.top) >= priority(token)) {
        return popHighPriority(token, stack.pop(), output.concat([stack.top]));
    }
    return [stack, output];
}

function popAllBeforeLP(stack, output) {
    if(stack.top !== '(') {
        return popAllBeforeLP(stack.pop(), output.concat([stack.top]));
    }
    return [stack, output];
}

function digest(tokens, stack = new Stack(), output = []) {
    if(tokens.length === 0) {
        return [stack, output];
    }

    switch(tokens[0]) {
        case '(':
            return digest(tokens.slice(1), stack.push(tokens[0]), output);
        case '+': case '-': case '*': case '/':
            let [s1, o1] = popHighPriority(tokens[0], stack, output);
            return digest(tokens.slice(1), s1.push(tokens[0]), o1);
        case ')':
            let [s2, o2] = popAllBeforeLP(stack, output);
            return digest(tokens.slice(1), s2.pop(), o2);
        default: 
            return digest(tokens.slice(1), stack, output.concat([tokens[0]]));
    }
}

function popAll(stack, output) {
    if(stack.isEmpty()) {
        return output;
    }
    return popAll(stack.pop(), output.concat([stack.top]));
}

function toPostfix(tokens) {
    let [stack, output] = digest(tokens);
    return popAll(stack, output);
}
