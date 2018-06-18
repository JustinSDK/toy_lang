import {Func, Void, Class} from './ast/value.js';
import {Return} from './ast/function.js';
import {ExprWrapper, Variable, VariableAssign, PropertyAssign, While, If, StmtSequence} from './ast/statement.js';
import {EXPR_PARSER, exprAst, toPostfix} from './expr_parser.js';
import {TokenablesParser} from './commons/parser.js';

export {LINE_PARSER};

class Interceptor {
    constructor(parser) {
        this.parser = parser;
    }

    parse(tokenableLines) {
        try {
            return this.parser.parse(tokenableLines);
        } 
        catch(ex) {
            if(ex instanceof SyntaxError) {
                throw ex;
            }
            tokenableLines[0].syntaxErr('illegal statement');
        }
    }
}

const LINE_PARSER = new Interceptor({
    parse(tokenableLines) {
        if(tokenableLines.length === 0 || tokenableLines[0].value === '}') {
            return StmtSequence.EMPTY;
        }

        return STMT_PARSER.parse(tokenableLines);   
    }
});

const STMT_PARSER = TokenablesParser.orRules(
    ['variableAssign', {
        burst(tokenableLines, [varTokenable, valueTokenable]) {
            varTokenable.errIfKeyword();

            return createAssign(
                tokenableLines, 
                VariableAssign, 
                new Variable(varTokenable.value), 
                valueTokenable
            );
        }
    }],   
    ['propertyAssign', {
        burst(tokenableLines, [targetTokenable, propTokenable, valueTokenable]) {
            propTokenable.errIfKeyword();
            const target = EXPR_PARSER.parse(targetTokenable);
            const value = EXPR_PARSER.parse(valueTokenable);

            return new StmtSequence(
                new PropertyAssign(target, propTokenable.value, value),
                LINE_PARSER.parse(tokenableLines.slice(1)),
                tokenableLines[0].lineNumber
            );
        }
    }],             
    ['block', {
        burst(tokenableLines, [cmdTokenable, argTokenable]) {
            switch(cmdTokenable.value) {
                case 'def':
                    return createAssignFunc(tokenableLines, argTokenable);
                case 'class':
                    return createAssignClass(tokenableLines, argTokenable);
                case 'if':
                    return createIf(tokenableLines, argTokenable);
                case 'while':
                    return createWhile(tokenableLines, argTokenable);
            }
        }
    }],   
    ['return', {
        burst(tokenableLines, [argTokenable]) {
            return createReturn(tokenableLines, argTokenable); 
        }
    }],        
    ['expression', {
        burst(tokenableLines, infixTokenables) {
            return new StmtSequence(
                new ExprWrapper(
                    exprAst(toPostfix(infixTokenables))
                ),
                LINE_PARSER.parse(tokenableLines.slice(1)),
                tokenableLines[0].lineNumber
            ); 
        }
    }]
);

function createAssign(tokenableLines, clzNode, target, assignedTokenable) {
    return new StmtSequence(
        new clzNode(
            target, 
            EXPR_PARSER.parse(assignedTokenable)
        ),
        LINE_PARSER.parse(tokenableLines.slice(1)),
        tokenableLines[0].lineNumber
    );
}

function createReturn(tokenableLines, argTokenable) { 
    return new StmtSequence(
        new Return(argTokenable.value === '' ? Void : EXPR_PARSER.parse(argTokenable)),
        LINE_PARSER.parse(tokenableLines.slice(1)),
        tokenableLines[0].lineNumber
    );
}

function funcs(stmt) {
    if(stmt === StmtSequence.EMPTY) {
        return [];
    }

    if(stmt.firstStmt instanceof VariableAssign && stmt.firstStmt.value instanceof Func) {
        const funcStmt = stmt.firstStmt;
        return [[funcStmt.variable.name, funcStmt.value]].concat(funcs(stmt.secondStmt));
    }
    return funcs(stmt.secondStmt);
}

function notDefStmt(stmt) {
    if(stmt === StmtSequence.EMPTY) {
        return StmtSequence.EMPTY;
    }

    if(!(stmt.firstStmt instanceof VariableAssign) || !(stmt.firstStmt.value instanceof Func)) {
        return new StmtSequence(
            stmt.firstStmt,
            notDefStmt(stmt.secondStmt),
            stmt.firstStmt.lineNumber
        );
    }

    return notDefStmt(stmt.secondStmt);
}

function createAssignFunc(tokenableLines, argTokenable) {
    const [fNameTokenable, ...paramTokenables] = argTokenable.tryTokenables('func');    
    fNameTokenable.errIfKeyword();

    const remains = tokenableLines.slice(1);
    return new StmtSequence(
        new VariableAssign(
            new Variable(fNameTokenable.value), 
            new Func(
                paramTokenables.map(paramTokenable => new Variable(paramTokenable.value)), 
                LINE_PARSER.parse(remains),
                fNameTokenable.value
            )
        ),
        LINE_PARSER.parse(linesAfterCurrentBlock(remains)),
        tokenableLines[0].lineNumber
    );    
}

function createAssignClass(tokenableLines, argTokenable) {
    const [fNameTokenable, ...paramTokenables] = argTokenable.tryTokenables('func');
    fNameTokenable.errIfKeyword();

    const remains = tokenableLines.slice(1);     
    const stmt = LINE_PARSER.parse(remains);

    const parentClzNames = paramTokenables.map(paramTokenable => paramTokenable.value);
    return new StmtSequence(
        new VariableAssign(
            new Variable(fNameTokenable.value), 
            new Class( 
                notDefStmt(stmt),
                new Map(funcs(stmt)),
                fNameTokenable.value,
                parentClzNames.length === 0 ? ['Object'] : parentClzNames
            )
        ),
        LINE_PARSER.parse(linesAfterCurrentBlock(remains)),
        tokenableLines[0].lineNumber
    );   
}

function isElseLine(tokenableLine) {
    return tokenableLine.tryTokenables('else')[0];
}

function createIf(tokenableLines, argTokenable) {
    const remains = tokenableLines.slice(1);     
    const trueStmt = LINE_PARSER.parse(remains);

    const i = countStmts(trueStmt) + 1;
    const falseStmt = isElseLine(remains[i]) ? 
            LINE_PARSER.parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;

    return new StmtSequence(
            new If(
                EXPR_PARSER.parse(argTokenable), 
                trueStmt,
                falseStmt
            ),
            LINE_PARSER.parse(linesAfterCurrentBlock(remains)),
            tokenableLines[0].lineNumber
    );
}

function createWhile(tokenableLines, argTokenable) {
    const remains = tokenableLines.slice(1);     
    return new StmtSequence(
         new While(
            EXPR_PARSER.parse(argTokenable), 
            LINE_PARSER.parse(remains)
         ),
         LINE_PARSER.parse(linesAfterCurrentBlock(remains)),
         tokenableLines[0].lineNumber
    ); 
}

function countStmts(stmt, i = 1) {
    if(stmt.secondStmt === StmtSequence.EMPTY) {
        return i;
    }
    return countStmts(stmt.secondStmt, i + 1);
}

function linesAfterCurrentBlock(tokenableLines, endCount = 1) {
    if(endCount === 0) {
        return tokenableLines;
    }

    const line = tokenableLines[0].value;
    const n = (line.startsWith('if') || line.startsWith('while') || line.startsWith('def') || line.startsWith('class')) ? 
                endCount + 1 : ( 
                    line === '}' && (tokenableLines.length === 1 || !isElseLine(tokenableLines[1])) ? 
                        endCount - 1 : 
                        endCount
            );

    return linesAfterCurrentBlock(tokenableLines.slice(1), n);
}