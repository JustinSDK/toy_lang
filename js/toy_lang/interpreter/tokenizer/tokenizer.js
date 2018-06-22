import {REGEX} from './regex.js'
export {Tokenizer};

const TOKEN_TESTERS = new Map([
    ['text', function(input) {
        const matched = REGEX.get('text').exec(input);
        return matched ? [matched[1]] : [];
    }],
    ['number', function(input) {
        const matched = REGEX.get('number').exec(input);
        return matched ? [input] : [];
    }],
    ['boolean', function(input) {
        const matched = REGEX.get('boolean').exec(input);
        return matched ? [input] : [];
    }],
    ['variable', function(input) {
        const matched = REGEX.get('variable').exec(input);
        return matched ? [input] : [];
    }],
    ['fcall', function(input) {
        const matched = REGEX.get('fcall').exec(input);
        return matched ? [matched[2], matched[3]] : [];
    }], 
    ['expression', function(input) {
        return expr_tokens(input);
    }],
    ['lambda', function(input) {
        const matched = REGEX.get('lambda').exec(input);
        return matched ? [matched[8]].concat(
            matched[1].startsWith('(') ? 
                  matched[1].slice(1, -1).split(',').map(p => p.trim())
                  : [matched[1]]
        ) : [];
    }], 
    ['iife', function(input) {
        const matched = REGEX.get('iife').exec(input);
        return matched ? [matched[2], matched[15]] : [];
    }], 
    ['func', function(input) {
        const matched = REGEX.get('func').exec(input);
        return [matched[1]].concat(matched[3] ? matched[3].split(/,\s*/) : []);
    }],
    ['variableAssign', function(input) {
        const matched = REGEX.get('variableAssign').exec(input);
        return matched ? [matched[1], matched[2]] : [];
    }],
    ['propertyAssign', function(input) {
        const matched = REGEX.get('propertyAssign').exec(input);
        if(matched) {
            return matched.slice(1);
        }
        return [];
    }],    
    ['block', function(input) {
        const matched = REGEX.get('block').exec(input);
        return matched ? [matched[1], matched[2]] : [];
    }],
    ['return', function(input) {
        const matched = REGEX.get('return').exec(input);
        return matched ? [matched[1]] : [];
    }],
    ['throw', function(input) {
        const matched = REGEX.get('throw').exec(input);
        return matched ? [matched[1]] : [];
    }],
    ['else', function(input) {
        const matched = REGEX.get('else').exec(input);
        return matched ? matched : [];
    }],
    ['argLists', function(input) {
        return argLists(input);
    }],
    ['args', function(input) {
        return funcArguments(input);
    }]   
]);

function argLists(input) {
    const matched = REGEX.get('argList').exec(input);
    if(matched) {
        return [matched[0]].concat(argLists(input.slice(matched[0].length)));
    }
        
    return [];
}

function expr_tokens(input) {
    const matched = REGEX.get('expression').exec(input);
    if(matched) {
        const token = matched[1];
        return [token].concat(expr_tokens(input.slice(token.length).trim()));
    } 
    else {
        return [];
    }
}

function funcArguments(input) {
    const matched = REGEX.get('argList').exec(input);
    if(matched[1]) {
        return splitByComma(matched[1]);
    }

    return [];
}

function splitByComma(input, x = '', acc = []) {
    if(input === '') {
        return acc.concat([x.trim()]);
    }

    const matched = REGEX.get('commaSeperated').exec(input);
    if(matched) {
        const token = matched[1];
        if(token === ',') {
            return splitByComma(input.slice(token.length).trim(), '', acc.concat([x]));
        } 
        else {
            return splitByComma(input.slice(token.length).trim(), x + token + ' ', acc);
        }
    }
    else {
        return [];
    }
}

const KEYWORDS = ['if', 'else', 'while', 'def', 'return', 'and', 'or', 'not', 'new', 'class', 'this'];

class Tokenable {
    constructor(type, lineNumber, value) {
        this.type = type;
        this.lineNumber = lineNumber;
        this.value = value;
    }

    tryTokenables(type) {
        return TOKEN_TESTERS.get(type)(this.value).map(token => new Tokenable(type, this.lineNumber, token));
    }     

    toString() {
        return `${this.lineNumber}:${this.value}`;
    }    

    syntaxErr(message) {
        const err = new SyntaxError(message);
        err.code = this.value;
        err.lineNumber = this.lineNumber;
        throw err;
    }

    errIfKeyword() {
        if(KEYWORDS.includes(this.value)) {
            this.syntaxErr(`'${this.value}' is a keyword`);
        }
    }

    errIfNoValue(v, message) {
        if(!v) {
            this.syntaxErr(message);
        }
    }

    replaceValue(v) {
        return new Tokenable(this.type, this.lineNumber, v);
    }
}

class Tokenizer {
    constructor(code) {
        this.lines = concatExpr(
            code.split('\n')
                // a comment starts with #
                .map(line => line.replace(/(('(.*)#(.*)'[^#]*)*)(#.*)?$/, '$1')) // comment after a line
                .map(line => line.trim())
                .map((line, idx) => new Tokenable('line', idx + 1, line))
                .filter(tokenizableLine => tokenizableLine.value !== '' && !tokenizableLine.value.startsWith("#")) 
        );
    }

    tokenizableLines() {
        return this.lines;
    }
}

function concatExpr(lines) {
    if(lines.length === 0) {
        return [];
    }
    
    if(lines[0].value.endsWith('\\')) {
        let [line, i] = lineIdx(lines);
        return [new Tokenable('line', lines[0].lineNumber, line)].concat(concatExpr(lines.slice(i + 1)));
    }
    
    return [lines[0]].concat(concatExpr(lines.slice(1)));
}

function lineIdx(lines) {
    function __lineIdx(line, i = 1) {
        if(!lines[i].value.endsWith('\\')) {
            return [line + lines[i].value, i];
        }

        if(lines.length === i + 1) {
            lines[i].syntaxErr('illegal cross-line backslash');
        }

        return __lineIdx(line + lines[i].value.slice(0, -1).trim(), i + 1);
    }
    
    return __lineIdx(lines[0].value.slice(0, -1).trim());
}