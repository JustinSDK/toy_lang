import {Func, Void, Class} from './ast/value.js';
import {Variable, VariableAssign, NonlocalAssign, PropertyAssign} from './ast/assignment.js';
import {ExprWrapper, While, If, Switch, StmtSequence, Throw, Return, Try, Break} from './ast/statement.js';
import {EXPR_PARSER} from './expr_parser.js';
import {TokenablesParser} from './commons/parser.js';
import {ParseErrInterceptor} from './commons/interceptor.js';

export {LINE_PARSER};

const LINE_PARSER = new ParseErrInterceptor({
    parse(tokenableLines) {
        if(tokenableLines.length === 0 || tokenableLines[0].value === '}' || 
           tokenableLines[0].value.startsWith('case') || tokenableLines[0].value.startsWith('default')) {
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
        burst(tokenableLines, [varTokenable, operatorTokenable, valueTokenable]) {
            varTokenable.errIfKeyword();

            return createAssign(
                tokenableLines, 
                VariableAssign, 
                Variable.of(varTokenable.value), 
                operatorTokenable,
                valueTokenable
            );
        }
    }],   
    ['nonlocalAssign', {
        burst(tokenableLines, [varTokenable, operatorTokenable, valueTokenable]) {
            varTokenable.errIfKeyword();
            return createAssign(
                tokenableLines, 
                NonlocalAssign, 
                Variable.of(varTokenable.value), 
                operatorTokenable,
                valueTokenable
            );
        }
    }],   
    ['propertyAssign', {
        burst(tokenableLines, [targetTokenable, propTokenable, operatorTokenable, valueTokenable]) {
            propTokenable.errIfKeyword();
            const target = EXPR_PARSER.parse(targetTokenable);
            const value = EXPR_PARSER.parse(valueTokenable);

            return new StmtSequence(
                new PropertyAssign(target, propTokenable.value, value, operatorTokenable.value),
                LINE_PARSER.parse(tokenableLines.slice(1)),
                tokenableLines[0].lineNumber
            );
        }
    }],             
    ['cmd-arg', {
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
                case 'switch':
                    return createSwitch(tokenableLines, argTokenable);                             
            }
        }
    }],       
    ['try', {
        burst(tokenableLines, _) {
            return createTry(tokenableLines);
        }
    }],      
    ['break', {
        burst(tokenableLines, _) {
            return new StmtSequence(
                Break,
                LINE_PARSER.parse(tokenableLines.slice(1)),
                tokenableLines[0].lineNumber
            );
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

function createAssign(tokenableLines, clzNode, target, operatorTokenable, assignedTokenable) {
    return new StmtSequence(
        new clzNode(
            target, 
            EXPR_PARSER.parse(assignedTokenable),
            operatorTokenable.value
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
            Variable.of(fNameTokenable.value), 
            new Func(
                paramTokenables.map(paramTokenable => Variable.of(paramTokenable.value)), 
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
            Variable.of(fNameTokenable.value), 
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
    return tokenableLine && tokenableLine.tryTokenables('else')[0];
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

function collectCase(tokenableLines) {
    if(tokenableLines[0].value === '}' || tokenableLines[0].value === 'default') {
        return [];
    }
    const caseTokenables = tokenableLines[0].tryTokenables('case')
                                            .map(tokenable => EXPR_PARSER.parse(tokenable)); 
    const caseStmt = LINE_PARSER.parse(tokenableLines.slice(1));    
    const stmtCount = countStmts(caseStmt);
    return [[[caseTokenables, caseStmt], stmtCount]].concat(
        collectCase(tokenableLines.slice(stmtCount + 1))
    );
}

function createSwitch(tokenableLines, argTokenable) {
    const remains = tokenableLines.slice(1);
    const cases = collectCase(remains);

    const i = cases.map(caze => caze[1] + 1).reduce((acc, n) => acc + n);
    const defaultStmt = remains[i].value === 'default' ? 
            LINE_PARSER.parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;

    return new StmtSequence(
            new Switch(
                EXPR_PARSER.parse(argTokenable), 
                cases.map(caze => caze[0]),
                defaultStmt
            ),
            LINE_PARSER.parse(linesAfterCurrentBlock(remains)),
            tokenableLines[0].lineNumber
    );
}

function isCatchLine(tokenableLine) {
    return tokenableLine.tryTokenables('catch').length !== 0;
}

function createTry(tokenableLines) {
    const remains = tokenableLines.slice(1);     
    const tryStmt = LINE_PARSER.parse(remains);

    const i = countStmts(tryStmt) + 1;
    const exceptionName = remains[i].tryTokenables('catch')[0].value;
    const catchStmt = LINE_PARSER.parse(remains.slice(i + 1));

    return new StmtSequence(
            new Try(
                tryStmt,
                Variable.of(exceptionName),
                catchStmt
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

const cmds = ['if ', 'try ', 'while ', 'def ', 'class ', 'switch '];

function linesAfterCurrentBlock(tokenableLines, endCount = 1) {
    if(endCount === 0) {
        return tokenableLines;
    }

    const line = tokenableLines[0].value;
    const n = cmds.some(cmd => line.startsWith(cmd)) ? endCount + 1 :
        ( 
            line === '}' && (tokenableLines.length === 1 || notElseOrCatch(tokenableLines[1])) ? 
                endCount - 1 : endCount
        );

    return linesAfterCurrentBlock(tokenableLines.slice(1), n);
}

function notElseOrCatch(tokenableLine) {
    return !(isElseLine(tokenableLine) || isCatchLine(tokenableLine));
}