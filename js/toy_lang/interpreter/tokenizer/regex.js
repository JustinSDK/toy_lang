export {REGEX};

const NESTED_PARENTHESES_LEVEL = 3; 

const BOOLEAN_REGEX = /true|false/;
const NUMBER_REGEX = /[0-9]+\.?[0-9]*/;
const TEXT_REGEX = /'((\\'|\\\\|\\r|\\n|\\t|[^'\\])*)'/;
const VARIABLE_REGEX = /[a-zA-Z_]+[a-zA-Z_0-9]*/;
const RELATION_REGEX = /==|!=|>=|>|<=|</;
const LOGIC_REGEX = /and|or/;
const ARITHMETIC_REGEX = /\+|\-|\*|\/|\%/;
const NEW_REGEX = /new/;
const DOT_REGEX = /\./;
const NOT_REGEX = /not/;
const PARENTHESE_REGEX = /\(|\)/;

// For simplicity, only allow three nested parentheses.
// You can change NESTED_PARENTHESES_LEVEL to what level you want.
// More nested parentheses are too complex to code, right?

function nestingParentheses(level) {
    if (level === 0) {
        return '[^()]*';
    }
    return `([^()]|\\(${nestingParentheses(level - 1)}\\))*`;
}

const ARGUMENT_LT_REGEX = new RegExp(`\\((${nestingParentheses(NESTED_PARENTHESES_LEVEL)})\\)`);

const FUNCALL_REGEX = new RegExp(`((${VARIABLE_REGEX.source})(${ARGUMENT_LT_REGEX.source}))`);

const PARAM_LT_REGEX = new RegExp(`\\((((${VARIABLE_REGEX.source},\\s*)+${VARIABLE_REGEX.source})|(${VARIABLE_REGEX.source})?)\\)`);

const EXPR_REGEX = orRegexs(
    NEW_REGEX,
    FUNCALL_REGEX,
    TEXT_REGEX,
    NUMBER_REGEX,
    BOOLEAN_REGEX,
    VARIABLE_REGEX,
    DOT_REGEX,
    NOT_REGEX,
    RELATION_REGEX,
    LOGIC_REGEX,
    ARITHMETIC_REGEX,
    PARENTHESE_REGEX
);

function orRegexs(...regexs) {
    const regexSources = regexs.map(regex => regex.source).join('|');
    return new RegExp(`(${regexSources})`);
}

const REGEX = new Map([
    ['boolean', new RegExp(`^(${BOOLEAN_REGEX.source})$`)],
    ['number', new RegExp(`^${NUMBER_REGEX.source}$`)],
    ['text', new RegExp(`^${TEXT_REGEX.source}$`)],
    ['variable', new RegExp(`^${VARIABLE_REGEX.source}`)],
    ['fcall', new RegExp(`^${FUNCALL_REGEX.source}$`)],
    ['relation', new RegExp(`^(.*)\\s+(${RELATION_REGEX.source})\\s+(.*)$`)],
    ['logic', new RegExp(`^(.*)\\s+(${LOGIC_REGEX.source})\\s+(.*)$`)],
    ['argList', new RegExp(`^${ARGUMENT_LT_REGEX.source}$`)],
    ['expression', new RegExp(`^${EXPR_REGEX.source}`)],
    ['commaSeperated', new RegExp(`^(${EXPR_REGEX.source}|(,))`)],
    ['func', new RegExp(`^(${VARIABLE_REGEX.source})(${PARAM_LT_REGEX.source})?$`)],
    ['block', /^(def|class|if|while)\s+([^{]*)\s+{$/],
    ['else', /^else\s+{$/],
    ['variableAssign', new RegExp(`^(${VARIABLE_REGEX.source})\\s*=\\s*(.*)$`)],
    ['propertyAssign', new RegExp(`^(.*)\\.(${VARIABLE_REGEX.source})\\s*=\\s*(.*)$`)],
    ['return', /^return\s*(.*)$/],
]);