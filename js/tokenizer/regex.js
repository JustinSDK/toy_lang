export {REGEX};

const NESTED_PARENTHESES_LEVEL = 3; 

const BOOLEAN_REGEX = /true|false/;
const NUMBER_REGEX = /[0-9]+\.?[0-9]*/;
const TEXT_REGEX = /'((\\'|\\\\|\\r|\\n|\\t|[^'\\])*)'/;
const VARIABLE_REGEX = /[a-zA-Z_]+[a-zA-Z_0-9]*/;
const RELATION_REGEX = /==|!=|>=|>|<=|</;
const LOGIC_REGEX = /and|or/;
const ARITHMETIC_REGEX = /\+|\-|\*|\/|\%/;
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

const METHODCALL_REGEX = new RegExp(`((${VARIABLE_REGEX.source})\\.(${VARIABLE_REGEX.source})(${ARGUMENT_LT_REGEX.source}))`);
const PROP_REGEX = new RegExp(`((${VARIABLE_REGEX.source})\\.(${VARIABLE_REGEX.source}))`);

const EXPR_REGEX = new RegExp(
    `((not\\s+)?${FUNCALL_REGEX.source}|${METHODCALL_REGEX.source}|${PROP_REGEX.source}|${TEXT_REGEX.source}|${RELATION_REGEX.source}|${LOGIC_REGEX.source}|${NUMBER_REGEX.source}|${ARITHMETIC_REGEX.source}|${PARENTHESE_REGEX.source}|(not\\s+)?(${BOOLEAN_REGEX.source})|(not\\s+)?${VARIABLE_REGEX.source})`
);


const REGEX = new Map([
    ['boolean', new RegExp(`^(${BOOLEAN_REGEX.source})$`)],
    ['number', new RegExp(`^${NUMBER_REGEX.source}$`)],
    ['text', new RegExp(`^${TEXT_REGEX.source}$`)],
    ['variable', new RegExp(`^${VARIABLE_REGEX.source}$`)],
    ['fcall', new RegExp(`^${FUNCALL_REGEX.source}$`)],
    ['mcall', new RegExp(`^${METHODCALL_REGEX.source}$`)],
    ['new', new RegExp(`^new ${FUNCALL_REGEX.source}$`)],
    ['property', new RegExp(`^${PROP_REGEX.source}$`)],
    ['relation', new RegExp(`^(.*)\\s+(${RELATION_REGEX.source})\\s+(.*)$`)],
    ['logic', new RegExp(`^(.*)\\s+(${LOGIC_REGEX.source})\\s+(.*)$`)],
    ['argList', new RegExp(`^${ARGUMENT_LT_REGEX.source}$`)],
    ['expression', new RegExp(`^${EXPR_REGEX.source}`)],
    ['dotSeperated', new RegExp(`^(${EXPR_REGEX.source}|(,))`)],
    ['func', new RegExp(`^(${VARIABLE_REGEX.source})(${PARAM_LT_REGEX.source})?$`)],
    ['not', /^not\s+(.*)$/],
    ['command', /^(\w+)\s+(.*)$/],
    ['variableAssign', new RegExp(`^(${VARIABLE_REGEX.source})\\s*=\\s*(.*)$`)],
    ['propertyAssign', new RegExp(`^(${VARIABLE_REGEX.source})\\.(${VARIABLE_REGEX.source})\\s*=\\s*(.*)$`)]
]);