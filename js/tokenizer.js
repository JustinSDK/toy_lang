import {Stack} from './util.js';
import {REGEX} from './regex.js'
export {Tokenizer};

const TOKEN_TESTERS = new Map([
    ['text', function(input) {
        let matched = REGEX.get('text').exec(input);
        return matched ? [matched[1]] : [];
    }],
    ['number', function(input) {
        let matched = REGEX.get('number').exec(input);
        return matched ? [input] : [];
    }],
    ['boolean', function(input) {
        let matched = REGEX.get('boolean').exec(input);
        return matched ? [input] : [];
    }],
    ['variable', function(input) {
        let matched = REGEX.get('variable').exec(input);
        return matched ? [input] : [];
    }],
    ['funcall', function(input) {
        let matched = REGEX.get('funcall').exec(input);
        return matched ? [matched[2]].concat(funcArguments(matched[3])) : [];
    }],
    ['not', function(input) {
        let matched = REGEX.get('not').exec(input);
        return matched ? ['not', matched[1]] : [];
    }],    
    ['logic', function(input) {
        let matched = REGEX.get('logic').exec(input);
        return matched ? [matched[1], matched[2], matched[3]] : [];
    }],
    ['relation', function(input) {
        let matched = REGEX.get('relation').exec(input);
        return matched ? [matched[1], matched[2], matched[3]] : [];
    }],
    ['expression', function expr_tokens(input) {
        let matched = REGEX.get('expression').exec(input);
        if(matched) {
            let token = matched[1];
            return [token].concat(expr_tokens(input.slice(token.length).trim()));
        } 
        else {
            return [];
        }
    }],
    ['postfixExpression', function(input) {
        return postfixTokens(input.charAt(0) === '-' ? `0 ${input}` : input);
    }],
    ['func', function(input) {
        let matched = REGEX.get('func').exec(input);
        return [matched[1]].concat(matched[2] ? matched[2].split(/,\s*/) : []);
    }],
    ['assign', function(input) {
        let matched = REGEX.get('assign').exec(input);
        return matched ? [matched[1], matched[2]] : [];
    }],
    ['command', function(input) {
        let matched = REGEX.get('command').exec(input);
        return matched ? [matched[1], matched[2]] : [];
    }]
]);

function funcArguments(input) {
    let matched = REGEX.get('argList').exec(input);
    if(matched[1]) {
        return dotSeperated(matched[1]);
    }

    return [];
}

function dotSeperated(input, x = '', acc = []) {
    if(input === '') {
        return acc.concat([x.trim()]);
    }

    let matched = REGEX.get('dotSeperated').exec(input);
    if(matched) {
        let token = matched[1];
        if(token === ',') {
            return dotSeperated(input.slice(token.length).trim(), '', acc.concat([x]));
        } 
        else {
            return dotSeperated(input.slice(token.length).trim(), x + token + ' ', acc);
        }
    }
    else {
        return [];
    }
}

class Token {
    constructor(type, lineNumber, value) {
        this.type = type;
        this.lineNumber = lineNumber;
        this.value = value;
    }

    tryTokenize(type) {
        return TOKEN_TESTERS.get(type)(this.value).map(token => new Token(type, this.lineNumber, token));
    }     
}

class Line {
    constructor(code, number) {
        this.code = code;
        this.number = number;
    }

    tryTokenize(type) {
        return TOKEN_TESTERS.get(type)(this.code).map(token => new Token(type, this.number, token));
    }

    toString() {
        return `line ${this.number}\t${this.code}`;
    }
}

class Tokenizer {
    constructor(code) {
        this.code = code;
    }

    lines() {
        return this.code.trim().split('\n')
                        .map(line => line.trim())
                        .map((line, idx) => new Line(line, idx + 1))
                        .filter(line => line.code !== '' && !line.code.startsWith("#")); // A comment starts with #
    }
}

// expression

function infixTokens(expr) {
    return TOKEN_TESTERS.get('expression')(expr);
}

function postfixTokens(expr) {
    return toPostfix(infixTokens(expr));
}

function priority(operator) {
    return ['==', '!=', '>=', '>', '<=', '<'].indexOf(operator) !== -1 ? 4 : 
           ['and', 'or'].indexOf(operator) !== -1 ? 3 :
           ['*', '/', '%'].indexOf(operator) !== -1 ? 2 :
           ['+', '-'].indexOf(operator) !== -1 ? 1 : 0;
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
        case '==': case '!=': case '>=': case '>': case '<=': case '<':
        case 'and': case 'or':
        case '+': case '-': case '*': case '/': case '%':
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
