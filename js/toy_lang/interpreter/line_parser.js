import {Func, Void, Class} from './ast/value.js';
import {Throw, Return} from './ast/function.js';
import {ExprWrapper, Variable, VariableAssign, PropertyAssign, While, If, StmtSequence} from './ast/statement.js';
import {EXPR_PARSER} from './expr_parser.js';
import {TokenablesParser} from './commons/parser.js';
import {ParseExInterceptor} from './commons/interceptor.js';

export {LINE_PARSER};

const LINE_PARSER = new ParseExInterceptor({
    parse(tokenableLines) {
        if(tokenableLines.length === 0 || tokenableLines[0].value === '}') {
            return StmtSequence.EMPTY;
        }

        return STMT_PARSER.parse(tokenableLines);   
    }
});

const STMT_PARSER = TokenablesParser.orRules(
    ['return', {
        burst(tokenableLines, [argTokenable]) {
            return createReturn(tokenableLines, argTokenable); 
        }
    }],  
    ['throw', {
        burst(tokenableLines, [argTokenable]) {
            return createThrow(tokenableLines, argTokenable); 
        }
    }],       
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
    ['expression', {
        burst(tokenableLines, infixTokenables) {
            return new StmtSequence(
                new ExprWrapper(
                    EXPR_PARSER.exprAst(infixTokenables)
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

function createThrow(tokenableLines, argTokenable) { 
    return new StmtSequence(
        new Throw(EXPR_PARSER.parse(argTokenable)),
        LINE_PARSER.parse(tokenableLines.slice(1)),
        tokenableLines[0].lineNumber
    );
}

function isDef(stmt) {
    return stmt.firstStmt instanceof VariableAssign && stmt.firstStmt.value instanceof Func;
}

function funcs(stmt) {
    if(stmt === StmtSequence.EMPTY) {
        return [];
    }

    return isDef(stmt) ? 
             [[stmt.firstStmt.variable.name, stmt.firstStmt.value]].concat(funcs(stmt.secondStmt)) :
             funcs(stmt.secondStmt);
}

function notDefStmt(stmt) {
    if(stmt === StmtSequence.EMPTY) {
        return StmtSequence.EMPTY;
    }

    return !isDef(stmt) ? 
            new StmtSequence(stmt.firstStmt, notDefStmt(stmt.secondStmt), stmt.lineNumber) : 
            notDefStmt(stmt.secondStmt);
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
            new Class({
                notMethodStmt : notDefStmt(stmt), 
                methods : new Map(funcs(stmt)), 
                name : fNameTokenable.value, 
                parentClzNames : parentClzNames.length === 0 ? ['Object'] : parentClzNames
            })
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