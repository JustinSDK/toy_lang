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
    ['fcall', function(input) {
        let matched = REGEX.get('fcall').exec(input);
        return matched ? [matched[2]].concat(funcArguments(matched[3])) : [];
    }],
    ['new', function(input) {
        let matched = REGEX.get('new').exec(input);
        return matched ? [matched[2]].concat(funcArguments(matched[3])) : [];
    }],    
    ['property', function(input) {
        let matched = REGEX.get('property').exec(input);
        return matched ? [matched[2], matched[3]] : [];
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
    ['func', function(input) {
        let matched = REGEX.get('func').exec(input);
        return [matched[1]].concat(matched[3] ? matched[3].split(/,\s*/) : []);
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
        this.code = code;
    }

    tokenizableLines() {
        return this.code.trim().split('\n')
                        .map(line => line.trim())
                        .map((line, idx) => new Tokenable('line', idx + 1, line))
                        .filter(tokenizableLine => tokenizableLine.value !== '' && !tokenizableLine.value.startsWith("#")); // A comment starts with #
    }
}
