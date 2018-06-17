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
        return expr_tokens(input.startsWith('-') ? '0 ' + input : input);
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
        return `line ${this.lineNumber}\t${this.value}`;
    }    
}

class Tokenizer {
    constructor(code) {
        this.lines = code.trim().split('\n')
                        .map(line => line.replace(/#.*/, '')) // A comment starts with #
                        .map(line => line.trim())
                        .map((line, idx) => new Tokenable('line', idx + 1, line))
                        .filter(tokenizableLine => tokenizableLine.value !== '' && !tokenizableLine.value.startsWith("#")); 
    }

    tokenizableLines() {
        return this.lines;
    }
}
