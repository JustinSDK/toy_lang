import {Stack} from './util.js';
export {Tokenizer};

const NESTED_PARENTHESES_LEVEL = 3; 

const BOOLEAN_REGEX = /true|false/;
const NUMBER_REGEX = /[0-9]+\.?[0-9]*/;
const TEXT_REGEX = /'((\\'|\\\\|\\r|\\n|\\t|[^'\\])*)'/;
const VARIABLE_REGEX = /[a-zA-Z_]+[a-zA-Z_0-9]*/;
const RELATION_REGEX = /==|!=|>=|>|<=|</;
const LOGIC_REGEX = /and|or/;
const ARITHMETIC_REGEX = /\+|\-|\*|\/|\%/;
const PARENTHESE_REGEX = /\(|\)/;

const ASSIGN_REGEX = new RegExp(`^(${VARIABLE_REGEX.source})\\s*(=)\\s*(.*)$`);

// For simplicity, only allow three nested parentheses.
// You can change NESTED_PARENTHESES_LEVEL to what level you want.
// More nested parentheses are too complex to code, right?

function nestingParentheses(level) {
    if (level === 0) {
        return '[^()]*';
    }
    return `([^()]|\\(${nestingParentheses(level - 1)}\\))*`;
}

const ARGUMENT_LIST_REGEX = new RegExp(`\\((${nestingParentheses(NESTED_PARENTHESES_LEVEL)})\\)`);

const FUNC_REGEX = new RegExp(`((${VARIABLE_REGEX.source})(${ARGUMENT_LIST_REGEX.source}))`);
const EXPR_REGEX = new RegExp(
    `((not\\s+)?${FUNC_REGEX.source}|${TEXT_REGEX.source}|${RELATION_REGEX.source}|${LOGIC_REGEX.source}|${NUMBER_REGEX.source}|${ARITHMETIC_REGEX.source}|${PARENTHESE_REGEX.source}|(not\\s+)?(${BOOLEAN_REGEX.source})|(not\\s+)?${VARIABLE_REGEX.source})`
);

const BOOLEAN_TOKEN_REGEX = new RegExp(`^(${BOOLEAN_REGEX.source})$`);
const NUMBERT_TOKEN_REGEX = new RegExp(`^${NUMBER_REGEX.source}$`);
const TEXT_TOKEN_REGEX = new RegExp(`^${TEXT_REGEX.source}$`);
const VARIABLE_TOKEN_REGEX = new RegExp(`^${VARIABLE_REGEX.source}$`);
const FUNC_TOKEN_REGEX = new RegExp(`^${FUNC_REGEX.source}$`);
const RELATION_TOKEN_REGEX = new RegExp(`^(.*)\\s+(${RELATION_REGEX.source})\\s+(.*)$`);
const LOGIC_TOKEN_REGEX = new RegExp(`^(.*)\\s+(${LOGIC_REGEX.source})\\s+(.*)$`);

const ARGUMENT_LT_TOKEN_REGEX = new RegExp(`^${ARGUMENT_LIST_REGEX.source}$`);
const EXPR_TOKEN_REGEX = new RegExp(`^${EXPR_REGEX.source}`);

const DOT_SEPERATED_TOKEN_REGEX = new RegExp(`^(${EXPR_REGEX.source}|(,))`);

function funcArguments(input) {
    let matched = ARGUMENT_LT_TOKEN_REGEX.exec(input);
    if(matched[1] === '') {
        return [];
    }

    return dotSeperated(matched[1]);
}

function dotSeperated(input, x = '', acc = []) {
    if(input == '') {
        return acc.concat([x.trim()]);
    }

    let matched = DOT_SEPERATED_TOKEN_REGEX.exec(input);
    if(matched) {
        let token = matched[1];
        if(token == ',') {
            return  dotSeperated(input.slice(token.length).trim(), '', acc.concat([x]));
        } 
        else {
            return dotSeperated(input.slice(token.length).trim(), x + token + ' ', acc);
        }
    }
    else {
        return [];
    }
}

const TOKEN_TESTERS = new Map([
    ['text', function(input) {
        let matched = TEXT_TOKEN_REGEX.exec(input);
        return matched === null ? null : matched[1];
    }],
    ['number', function(input) {
        let matched = NUMBERT_TOKEN_REGEX.exec(input);
        return matched === null ? null : input;
    }],
    ['boolean', function(input) {
        let matched = BOOLEAN_TOKEN_REGEX.exec(input);
        return matched === null ? null : input;
    }],
    ['variable', function(input) {
        let matched = VARIABLE_TOKEN_REGEX.exec(input);
        return matched === null ? null : input;
    }],
    ['funcall', function(input) {
        let matched = FUNC_TOKEN_REGEX.exec(input);;
        return matched === null ? null : [matched[2]].concat(funcArguments(matched[3]));
    }],
    ['not', function(input) {
        let matched = /^not\s+(.*)$/.exec(input);
        return matched === null ? null : ['not', matched[1]];
    }],    
    ['logic', function(input) {
        let matched = LOGIC_TOKEN_REGEX.exec(input);
        return matched === null ? null : [matched[1], matched[2], matched[3]];
    }],
    ['relation', function(input) {
        let matched = RELATION_TOKEN_REGEX.exec(input);
        return matched === null ? null : [matched[1], matched[2], matched[3]];
    }],
    ['postfixExprTokens', function(input) {
        return new ExprTokenizer(input.charAt(0) === '-' ? `0 ${input}` : input).postfixTokens();
    }],
    ['def', function(input) {
        let matched = FUNC_TOKEN_REGEX.exec(input);
        return [matched[2]].concat(matched[4] === '' ? [] : matched[4].split(/,\s*/));
    }]
]);

class ValueTester {
    constructor(stmtTokenizer, input = stmtTokenizer.matchingValue()) {
        this.stmtTokenizer = stmtTokenizer;
        this.input = input;
    }

    valueTester(input) {
        return new ValueTester(this.stmtTokenizer, input);
    }

    tryToken(type) {
        return TOKEN_TESTERS.get(type)(this.input);
    }

    tryTokens(type) {
        return TOKEN_TESTERS.get(type)(this.input);
    }

    toString() {
        return this.stmtTokenizer.toString();
    }
}

class StmtTokenizer {
    constructor(type, tokens, lineNumber) {
        this.type = type;
        this.tokens = tokens;
        this.lineNumber = lineNumber;
        this.valueTester = new ValueTester(this);
    }

    toString() {
        return `line ${this.lineNumber}\t${this.tokens.join(' ')}`;
    }
}

class EmptyStmtTokenizer extends StmtTokenizer {
    constructor(type, tokens, lineNumber) {
        super(type, tokens, lineNumber);
    }

    matchingValue() {
        return '';
    }
}

class AssignStmtTokenizer extends StmtTokenizer {
    constructor(type, tokens, lineNumber) {
        super(type, tokens, lineNumber);
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

class OneArgStmtTokenizer extends StmtTokenizer {
    constructor(type, tokens, lineNumber) {
        super(type, tokens, lineNumber);
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

class FuncallStmtTokenizer extends StmtTokenizer {
    constructor(type, tokens, lineNumber) {
        super(type, tokens, lineNumber);
    }

    funcName() {
        return this.tokens[0];
    }    

    matchingValue() {
        return this.tokens[1];
    }

    args() {
        let argTokens = funcArguments(this.matchingValue());
        return argTokens.map(token => new ValueTester(this, token));
    }
}

class Tokenizer {
    constructor(code) {
        this.code = code;
    }

    tokenize() {
        return this.code.trim().split('\n')
                        .map(line => line.trim())
                        .map((line, idx) => {
                            return {
                                code   : line,
                                number : idx + 1
                            };
                        })
                        .filter(line => line.code !== '' && !line.code.startsWith("#")) // A comment starts with #
                        .map(line => {
                            if(line.code.startsWith('end')) {
                                return new EmptyStmtTokenizer('end', [line.code], line.number);
                            }

                            if(line.code.startsWith('else')) {
                                return new EmptyStmtTokenizer('else', [line.code], line.number);
                            }
                            
                            let assign = ASSIGN_REGEX.exec(line.code);
                            if(assign) {
                                return new AssignStmtTokenizer('assign', [assign[1], assign[2], assign[3]], line.number);
                            }

                            let funcall = FUNC_TOKEN_REGEX.exec(line.code);
                            if(funcall) {
                                return new FuncallStmtTokenizer('funcall', [funcall[2], funcall[3]], line.number);
                            }

                            let reTurn = /^return\s*(.*)$/.exec(line.code);
                            if(reTurn) {
                                return new OneArgStmtTokenizer('return', ['return', reTurn[1]], line.number);
                            }

                            let command = /^(\w+)\s+(.*)$/.exec(line.code);
                            if(command) {
                                return new OneArgStmtTokenizer(command[1], [command[1], command[2]], line.number);
                            }
                            
                            throw new SyntaxError(`\n\tline ${line.number}\t${line.code}`);
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
    let matched = EXPR_TOKEN_REGEX.exec(expr);
    if(matched) {
        let token = matched[1];
        return [token].concat(expr_tokens(expr.slice(token.length).trim()));
    } 
    else {
        return [];
    }
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
