import {Func, Void, Class} from './ast/value.js';
import {Property, MethodCall} from './ast/class.js';
import {Return, FunCall, FunCallWrapper} from './ast/function.js';
import {Variable, VariableAssign, PropertyAssign, While, If, StmtSequence} from './ast/statement.js';
import {EXPR_PARSER} from './expr_parser.js';
import {TokenablesParser} from './parser_commons.js';

export {PROGRAM_PARSER};

const PROGRAM_PARSER = {
    parse(tokenableLines) {
        if(tokenableLines.length === 0 || tokenableLines[0].value === 'else' || tokenableLines[0].value === 'end') {
            return StmtSequence.EMPTY;
        }

        return STMT_PARSER.parse(tokenableLines);   
    }
};

const STMT_PARSER = TokenablesParser.orRules(
    ['variableAssign', {
        burst(tokenableLines, [varTokenable, assignedTokenable]) {
            return createAssign(
                tokenableLines, 
                VariableAssign, 
                new Variable(varTokenable.value), 
                assignedTokenable
            );
        }
    }],   
    ['propertyAssign', {
        burst(tokenableLines, [varTokenable, propertyTokenable, assignedTokenable]) {
            return createAssign(
                tokenableLines, 
                PropertyAssign, 
                new Property(new Variable(varTokenable.value), propertyTokenable.value), 
                assignedTokenable
            );                
        }
    }],             
    ['fcall', {
        burst(tokenableLines, [fNameTokenable, ...argTokenables]) {            
            return new StmtSequence(
                new FunCallWrapper(
                    new FunCall(
                        new Variable(fNameTokenable.value),
                        argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable)) 
                    )
                ),
                PROGRAM_PARSER.parse(tokenableLines.slice(1))
            );                
        }
    }],        
    ['mcall', {
        burst(tokenableLines, [nameTokenable, propTokenable, ...argTokenables]) {
            return new StmtSequence(
                new FunCallWrapper(
                    new MethodCall(
                        new Property(new Variable(nameTokenable.value), propTokenable.value).getter(), 
                        argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable))
                    )
                ),
                PROGRAM_PARSER.parse(tokenableLines.slice(1))
            ); 
        }
    }],   
    ['return', {
        burst(tokenableLines, [argTokenable]) {
            return createReturn(tokenableLines, argTokenable); 
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
    }]
);

function createAssign(tokenableLines, clz, target, assignedTokenable) {
    return new StmtSequence(
        new clz(
            target, 
            EXPR_PARSER.parse(assignedTokenable)
        ),
        PROGRAM_PARSER.parse(tokenableLines.slice(1))
    );
}

function createReturn(tokenableLines, argTokenable) { 
    return new StmtSequence(
        new Return(argTokenable.value === '' ? Void : EXPR_PARSER.parse(argTokenable)),
        PROGRAM_PARSER.parse(tokenableLines.slice(1))
    );
}

function createAssignFunc(tokenableLines, argTokenable, clz = Func) {
    let [fNameTokenable, ...paramTokenables] = argTokenable.tryTokenables('func');
    let remains = tokenableLines.slice(1);     
    return new StmtSequence(
        new VariableAssign(
            new Variable(fNameTokenable.value), 
            new clz(
                paramTokenables.map(paramTokenable => new Variable(paramTokenable.value)), 
                PROGRAM_PARSER.parse(remains),
                fNameTokenable.value
            )
        ),
        PROGRAM_PARSER.parse(linesAfterCurrentBlock(remains))
    );    
}

function createAssignClass(tokenableLines, argTokenable) {
    return createAssignFunc(tokenableLines, argTokenable, Class)
}

function createIf(tokenableLines, argTokenable) {
    let remains = tokenableLines.slice(1);     
    let trueStmt = PROGRAM_PARSER.parse(remains);

    let i = matchingElseIdx(trueStmt);
    let falseStmt = remains[i].value === 'else' ? 
            PROGRAM_PARSER.parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;

    return new StmtSequence(
            new If(
                EXPR_PARSER.parse(argTokenable), 
                trueStmt,
                falseStmt
            ),
            PROGRAM_PARSER.parse(linesAfterCurrentBlock(remains))
    );
}

function createWhile(tokenableLines, argTokenable) {
    let remains = tokenableLines.slice(1);     
    return new StmtSequence(
         new While(
            EXPR_PARSER.parse(argTokenable), 
            PROGRAM_PARSER.parse(remains)
         ),
         PROGRAM_PARSER.parse(linesAfterCurrentBlock(remains))
    ); 
}

function matchingElseIdx(stmt, i = 1) {
    if(stmt.secondStmt === StmtSequence.EMPTY) {
        return i;
    }
    return matchingElseIdx(stmt.secondStmt, i + 1);
}

function linesAfterCurrentBlock(tokenableLines, endCount = 1) {
    if(endCount === 0) {
        return tokenableLines;
    }

    let line = tokenableLines[0].value;
    let n = (line.startsWith('if') || line.startsWith('while') || line.startsWith('def')) ? endCount + 1 : (
        line === 'end' ? endCount - 1 : endCount
    );

    return linesAfterCurrentBlock(tokenableLines.slice(1), n);
}