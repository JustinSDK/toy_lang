import {Func, Void, Class} from './ast/value.js';
import {Property, MethodCall} from './ast/class.js';
import {Return, FunCall, FunCallWrapper} from './ast/function.js';
import {Variable, VariableAssign, PropertyAssign, While, If, StmtSequence} from './ast/statement.js';
import {EXPR_PARSER} from './expr_parser.js';
import {TokenablesParser} from './parser_commons.js';

export {PROGRAM_PARSER};

const PROGRAM_PARSER = {
    parse(tokenizableLines) {
        if(tokenizableLines.length === 0 || tokenizableLines[0].value === 'else' || tokenizableLines[0].value === 'end') {
            return StmtSequence.EMPTY;
        }

        return STMT_PARSERS.parse(tokenizableLines);   
    }
};

const STMT_PARSERS = TokenablesParser.orRules(
    ['variableAssign', {
        burst(tokenizableLines, [varTokenable, assignedTokenable]) {
            return createAssign(
                tokenizableLines, 
                VariableAssign, 
                new Variable(varTokenable.value), 
                assignedTokenable
            );
        }
    }],   
    ['propertyAssign', {
        burst(tokenizableLines, [varTokenable, propertyTokenable, assignedTokenable]) {
            return createAssign(
                tokenizableLines, 
                PropertyAssign, 
                new Property(new Variable(varTokenable.value), propertyTokenable.value), 
                assignedTokenable
            );                
        }
    }],             
    ['fcall', {
        burst(tokenizableLines, [fNameTokenable, ...argTokenables]) {            
            return new StmtSequence(
                new FunCallWrapper(
                    new FunCall(
                        new Variable(fNameTokenable.value),
                        argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable)) 
                    )
                ),
                PROGRAM_PARSER.parse(tokenizableLines.slice(1))
            );                
        }
    }],        
    ['mcall', {
        burst(tokenizableLines, [nameTokenable, propTokenable, ...argTokenables]) {
            return new StmtSequence(
                new FunCallWrapper(
                    new MethodCall(
                        new Property(new Variable(nameTokenable.value), propTokenable.value).getter(), 
                        argTokenables.map(argTokenable => EXPR_PARSER.parse(argTokenable))
                    )
                ),
                PROGRAM_PARSER.parse(tokenizableLines.slice(1))
            ); 
        }
    }],            
    ['command', {
        burst(tokenizableLines, [cmdTokenable, argTokenable]) {
            switch(cmdTokenable.value) {
                case 'def':
                    return createAssignFunc(tokenizableLines, argTokenable);
                case 'class':
                    return createAssignClass(tokenizableLines, argTokenable);
                case 'return':
                    return createReturn(tokenizableLines, argTokenable);
                case 'if':
                    return createIf(tokenizableLines, argTokenable);
                case 'while':
                    return createWhile(tokenizableLines, argTokenable);
            }
        }
    }]
);

function createAssign(tokenizableLines, clz, target, assignedTokenable) {
    return new StmtSequence(
        new clz(
            target, 
            EXPR_PARSER.parse(assignedTokenable)
        ),
        PROGRAM_PARSER.parse(tokenizableLines.slice(1))
    );
}

function createAssignFunc(tokenizableLines, argTokenable, clz = Func) {
    let [fNameTokenable, ...paramTokenables] = argTokenable.tryTokenables('func');
    let remains = tokenizableLines.slice(1);     
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

function createAssignClass(tokenizableLines, argTokenable) {
    return createAssignFunc(tokenizableLines, argTokenable, Class)
}

function createReturn(tokenizableLines, argTokenable) { 
    return new StmtSequence(
        new Return(argTokenable.value === '' ? Void : EXPR_PARSER.parse(argTokenable)),
        PROGRAM_PARSER.parse(tokenizableLines.slice(1))
    );
}

function createIf(tokenizableLines, argTokenable) {
    let remains = tokenizableLines.slice(1);     
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

function createWhile(tokenizableLines, argTokenable) {
    let remains = tokenizableLines.slice(1);     
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

function linesAfterCurrentBlock(tokenizableLines, endCount = 1) {
    if(endCount === 0) {
        return tokenizableLines;
    }

    let line = tokenizableLines[0].value;
    let n = (line.startsWith('if') || line.startsWith('while') || line.startsWith('def')) ? endCount + 1 : (
        line === 'end' ? endCount - 1 : endCount
    );

    return linesAfterCurrentBlock(tokenizableLines.slice(1), n);
}