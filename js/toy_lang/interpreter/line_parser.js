import {Func, Void, Class} from './ast/value.js';
import {Variable, VariableAssign, DefStmt, ClassStmt, NonlocalAssign, PropertyAssign} from './ast/assignment.js';
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

function splitFuncStmt(stmt) {
    if(stmt === StmtSequence.EMPTY) {
        return [[], StmtSequence.EMPTY];
    }

    const [funcs, notDefStmt] = splitFuncStmt(stmt.secondStmt);
    if(isDef(stmt)) {
        return [
            [[stmt.firstStmt.variable.name, stmt.firstStmt.value]].concat(funcs),
            notDefStmt
        ];
    }

    return [
        funcs, 
        new StmtSequence(stmt.firstStmt, notDefStmt, stmt.lineNumber)
    ];
}

function createAssignFunc(tokenableLines, argTokenable) {
    const [fNameTokenable, ...paramTokenables] = argTokenable.tryTokenables('func');    
    fNameTokenable.errIfKeyword();

    const remains = tokenableLines.slice(1);
    const bodyStmt = LINE_PARSER.parse(remains);
    const bodyLineCount = bodyStmt.lineCount;

    return new StmtSequence(
        new DefStmt(
            Variable.of(fNameTokenable.value), 
            new Func(
                paramTokenables.map(paramTokenable => Variable.of(paramTokenable.value)), 
                bodyStmt,
                fNameTokenable.value
            )
        ),
        LINE_PARSER.parse(tokenableLines.slice(bodyLineCount + 2)),
        tokenableLines[0].lineNumber
    );    
}

function createAssignClass(tokenableLines, argTokenable) {
    const [fNameTokenable, ...paramTokenables] = argTokenable.tryTokenables('func');
    fNameTokenable.errIfKeyword();

    const remains = tokenableLines.slice(1);     
    const stmt = LINE_PARSER.parse(remains);
    const clzLineCount = stmt.lineCount + 2;

    const parentClzNames = paramTokenables.map(paramTokenable => paramTokenable.value);
    const [fs, notDefStmt] = splitFuncStmt(stmt);

    return new StmtSequence(
        new ClassStmt(
            Variable.of(fNameTokenable.value), 
            new Class({
                notMethodStmt : notDefStmt, 
                methods : new Map(fs), 
                name : fNameTokenable.value, 
                parentClzNames : parentClzNames.length === 0 ? ['Object'] : parentClzNames
            })
        ),
        LINE_PARSER.parse(tokenableLines.slice(clzLineCount)),
        tokenableLines[0].lineNumber
    );   
}

function isElseLine(tokenableLine) {
    return tokenableLine && tokenableLine.tryTokenables('else')[0];
}

function createIf(tokenableLines, argTokenable) {
    const remains = tokenableLines.slice(1);     
    const trueStmt = LINE_PARSER.parse(remains);
    const trueLineCount = trueStmt.lineCount;

    const i = trueLineCount + 1;
    const falseStmt = isElseLine(remains[i]) ? 
            LINE_PARSER.parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;
    const falseLineCount = falseStmt.lineCount;
    
    const linesAfterIfElse = tokenableLines.slice(
        2 + trueLineCount + (falseLineCount ? falseLineCount + 2 : 0)
    );

    return new StmtSequence(
            new If(
                EXPR_PARSER.parse(argTokenable), 
                trueStmt,
                falseStmt
            ),
            LINE_PARSER.parse(linesAfterIfElse),
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
    const stmtCount = caseStmt.lineCount;

    return [[[caseTokenables, caseStmt], stmtCount]].concat(
        collectCase(tokenableLines.slice(stmtCount + 1))
    );
}

function createSwitch(tokenableLines, argTokenable) {
    const remains = tokenableLines.slice(1);
    const cases = collectCase(remains);

    const casesLineCount = cases.map(casz => casz[0][1])
                                .map(stmt => stmt.lineCount)
                                .reduce((acc, n) => n + 1 + acc, 0);

    const i = casesLineCount;
    const defaultStmt = remains[i].value === 'default' ? 
            LINE_PARSER.parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;
    const defaultLineCount = defaultStmt.lineCount ? defaultStmt.lineCount + 1 : 0;

    const linesAfterSwitch = tokenableLines.slice(casesLineCount + defaultLineCount + 2);
    return new StmtSequence(
            new Switch(
                EXPR_PARSER.parse(argTokenable), 
                cases.map(caze => caze[0]),
                defaultStmt
            ),
            LINE_PARSER.parse(linesAfterSwitch),
            tokenableLines[0].lineNumber
    );
}

function createTry(tokenableLines) {
    const remains = tokenableLines.slice(1);     
    const tryStmt = LINE_PARSER.parse(remains);
    const tryLineCount = tryStmt.lineCount;

    const i = tryLineCount + 1;
    const exceptionName = remains[i].tryTokenables('catch')[0].value;

    const catchStmt = LINE_PARSER.parse(remains.slice(i + 1));
    const catchLineCount = catchStmt.lineCount;

    const linesAfterTryCatch = tokenableLines.slice(tryLineCount + catchLineCount + 4);
    return new StmtSequence(
            new Try(
                tryStmt,
                Variable.of(exceptionName),
                catchStmt
            ),
            LINE_PARSER.parse(linesAfterTryCatch),
            tokenableLines[0].lineNumber
    );
}

function createWhile(tokenableLines, argTokenable) {
    const remains = tokenableLines.slice(1);  
    const stmt = LINE_PARSER.parse(remains);
    const linesAfterWhile = tokenableLines.slice(stmt.lineCount + 2);

    return new StmtSequence(
         new While(
            EXPR_PARSER.parse(argTokenable), 
            LINE_PARSER.parse(remains)
         ),
         LINE_PARSER.parse(linesAfterWhile),
         tokenableLines[0].lineNumber
    ); 
}