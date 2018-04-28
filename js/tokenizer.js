import {Stack} from './util.js';
export {StmtTokenizer};

function text(input) {
    let matched = /^'(.*)'$/.exec(input);
    return matched === null ? null : matched[1];
}

function number(input) {
    let matched = /^-?[0-9]+\.?[0-9]*$/.exec(input);
    return matched === null ? null : input;
}    

function variable(input) {
    let matched = /^-?[a-zA-Z_]+[a-zA-Z_0-9]*$/.exec(input);
    return matched === null ? null : input;
}

function postfixExpression(input) {
    return new ExprTokenizer(input).postfixTokens();
}

class Statement {
    constructor(type, tokens) {
        this.type = type;
        this.tokens = tokens;
    }

    textToken() {
        return text(this.matchingValue());
    }

    numberToken() {
        return number(this.matchingValue());
    }

    variableToken() {
        return variable(this.matchingValue());
    }    

    expressionPostfixTokens() {
        return postfixExpression(this.matchingValue());
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

    argument() {
        return this.tokens[1];
    }

    matchingValue() {
        return this.argument();
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
                            let assign = /([a-zA-Z_]+[a-zA-Z_0-9]*)\s*(=)\s*(.*)/.exec(line);
                            if(assign) {
                                return new AssignStatement('assign', [assign[1], assign[2], assign[3]]);
                            }
                            
                            // 'end' is an empty statement
                            if(line.startsWith('end')) {
                                return new Statement('empty', [line]);
                            }

                            let matched = /(\w+)\s*(.*)/.exec(line);
                            return new OneArgStatement(matched[1], [matched[1], matched[2]]);
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
    let regex = /^((\+|\-|\*|\/)|(\(|\))|([a-zA-Z_]+[a-zA-Z_0-9]*|[0-9]+\.?[0-9]*))/;
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
