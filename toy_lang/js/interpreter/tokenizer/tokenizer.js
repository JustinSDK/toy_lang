import {REGEX} from './regex.js'

export {Tokenizer};

const KEYWORDS = new Set(['if', 'else', 'while', 'def', 'return', 'and', 'or', 'not', 
                  'new', 'class', 'this', 'arguments', 'throw', 'try', 'catch', 
                  'nonlocal', 'switch', 'case', 'default', 'break', 'import', 'as', 'from']);

const TOKEN_TESTERS = new Map([
    ['importAs', function(input) {
        const matched = REGEX.get('importAs').exec(input);
        return matched ? [matched[1], matched[2], matched[4]] : [];
    }],
    ['fromImport', function(input) {
        const matched = REGEX.get('fromImport').exec(input);
        return matched ? [matched[1], matched[2], matched[4]] : [];
    }],
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
        return matched ? [matched[2]].concat(
            matched[1].startsWith('(') ? 
                  matched[1].slice(1, -1).split(',').map(p => p.trim())
                  : [matched[1]]
        ) : [];
    }], 
    ['iife', function(input) {
        const matched = REGEX.get('iife').exec(input);
        return matched ? [matched[1], matched[4]] : [];
    }], 
    ['func', function(input) {
        const matched = REGEX.get('func').exec(input);
        return [matched[1]].concat(matched[2] ? matched[2].split(/,\s*/) : []);
    }],
    ['variableAssign', function(input) {
        const matched = REGEX.get('variableAssign').exec(input);
        return matched ? [matched[1], matched[2], matched[3]] : [];
    }],
    ['nonlocalAssign', function(input) {
        const matched = REGEX.get('nonlocalAssign').exec(input);
        return matched ? [matched[1], matched[2], matched[3]] : [];
    }],
    ['propertyAssign', function(input) {
        const matched = REGEX.get('propertyAssign').exec(input);
        if(matched) {
            return matched.slice(1);
        }
        return [];
    }],    
    ['cmd-arg', function(input) {
        const matched = REGEX.get('cmd-arg').exec(input);
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
    ['case', function(input) {
        const matched = REGEX.get('case').exec(input);
        if(matched[1]) {
            return splitByComma(matched[1]).map(elem => elem.trim());
        }
        return [];
    }],    
    ['try', function(input) {
        const matched = REGEX.get('try').exec(input);
        return matched ? matched : [];
    }],    
    ['catch', function(input) {
        const matched = REGEX.get('catch').exec(input);
        return matched ? [matched[1]] : [];
    }],    
    ['argLists', function(input) {
        return argLists(input);
    }],
    ['list', function(input) {
        return listElems(input).map(elem => elem.trim());
    }],
    ['args', function(input) {
        return funcArguments(input);
    }],
    ['break', function(input) {
        const matched = REGEX.get('break').exec(input);
        return matched ? matched : [];
    }],
    ['ternary', function(input) {
        const matched = REGEX.get('ternary-bare').exec(input) || REGEX.get('ternary-parentheses').exec(input);
        if(matched) {
            return [matched[1], matched[2], matched[3]];
        }
        
        return [];
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

function listElems(input) {
    const matched = REGEX.get('elemList').exec(input);
    if(matched) {
        return matched[1] === '' ? [''] : splitByComma(matched[1].trim());
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
        return token === ',' ? splitByComma(input.slice(token.length).trim(), '', acc.concat([x.trim()])) :
                               tokenBetweenComma(token, input, x, acc);
    }
    else {
        return [];
    }
}

function tokenBetweenComma(token, input, x, acc) {
    if(REGEX.get('lambda').exec(token)) {
        const arrowIdx = token.indexOf('->');
        const lambda = token.substring(0, arrowIdx) + '->' +  lambdaBody(token.substring(arrowIdx + 2));
        return splitByComma(input.slice(lambda.length).trim(), x + lambda + ' ', acc);
    }
    return splitByComma(input.slice(token.length).trim(), x + token + ' ', acc);
}

function lambdaBody(input, body = '') {
    const trimStarted = input.trimStart();
    const space = ' '.repeat(input.length - trimStarted.length);
    const matched = REGEX.get('expression').exec(trimStarted);
    if(matched) {
        return lambdaBody(trimStarted.substring(matched[0].length), body + space + matched[0]);
    }
    return body;
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
        return `${this.lineNumber}:${this.value}`;
    }    

    syntaxErr(message) {
        const err = new SyntaxError(message);
        err.code = this.value;
        err.lineNumber = this.lineNumber;
        throw err;
    }

    errIfKeyword() {
        if(KEYWORDS.has(this.value)) {
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

/* 
    Matching single line comments except in a string
    ref: https://stackoverflow.com/questions/8446064/java-regex-find-oracle-single-line-comments-except-in-a-string

    ^                    # match the start of the line
    (                    # start match group 1
    (?:                  #   start non-capturing group 1
        (?!#|').         #     if there's no '#' or single quote ahead, match any char
        |                #     OR
        '(?:''|[^'])*'   #     match a string literal
    )*                   #   end non-capturing group 1 and repeat it zero or more times
    )                    # end match group 1
    #.*$                 # match a comment all the way to the end of the line    
*/

class Tokenizer {
    constructor(code) {
        this.lines = concatExpr(
            code.split('\n')
                // a comment starts with #
                .map(line => line.replace(/^((?:(?!#|').|'(?:''|[^'])*')*)\s*#.*$/, '$1')) // comment after a line
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
        const [line, i] = lineIdxBackSlash(lines);
        return [new Tokenable('line', lines[0].lineNumber, line)].concat(concatExpr(lines.slice(i + 1)));
    }

    if(lines[0].value.startsWith('(')) {
        const [lc, rc] = countParentheses(lines[0].value.split(''));
        if(lc !== rc) {
            const [line, i] = lineIdxParentheses(lines);
            const tokenable = new Tokenable('line', 
                lines[0].lineNumber, line.trim().slice(1, -1).trim()
            );
            return [tokenable].concat(concatExpr(lines.slice(i + 1)));
        }
    }

    return [lines[0]].concat(concatExpr(lines.slice(1)));
}

function lineIdxBackSlash(lines) {
    function __lineIdx(line, i = 1) {
        if(!lines[i].value.endsWith('\\')) {
            return [line + ' ' + lines[i].value, i];
        }

        if(lines.length === i + 1) {
            lines[i].syntaxErr('illegal cross-line backslash');
        }

        return __lineIdx(line + ' ' + lines[i].value.slice(0, -1).trim(), i + 1);
    }
    
    return __lineIdx(lines[0].value.slice(0, -1).trim());
}

function lineIdxParentheses(lines) {
    function __lineIdx(line = '', lc = 0, rc = 0, i = 0) {
        if(lines.length === i) {
            lines[0].syntaxErr('unable to match parentheses');
        }
        // string regex  /'((?:[^'\\]|\\'|\\\\|\\r|\\n|\\t)*)'/
        // ignore parentheses in string first
        const parentheses = countParentheses(lines[i].value.replace(/'((?:[^'\\]|\\'|\\\\|\\r|\\n|\\t)*)'/g, '').split(''));
        const leftPCount = parentheses[0] + lc;
        const rightPCount = parentheses[1] + rc;
        if(leftPCount === rightPCount) {
            return [line +  lines[i].value + ' ', i];
        }
        return __lineIdx(line + lines[i].value + ' ', leftPCount, rightPCount, i + 1);
    }
    return __lineIdx();
}

function countParentheses(chars) {
    const parentheses = chars.filter(c => c === '(' || c === ')')
                             .reduce((acc, c) => c === '(' ? [acc[0] + c, acc[1]] : [acc[0], acc[1] + c], ['', '']);
    return [parentheses[0].length, parentheses[1].length];
}