import {Func, Void, Class} from './ast/value.js';
import {Property, MethodCall} from './ast/class.js';
import {Return, FunCall, FunCallWrapper} from './ast/function.js';
import {Variable, VariableAssign, PropertyAssign, While, If, StmtSequence} from './ast/statement.js';
import {VALUE_PART_PARSERS} from './value_parsers.js';

export {STMT_PARSERS};

class LineParserInterceptor {
    constructor(parser) {
        this.parser = parser;
    }

    parse(tokenizableLines) {
        try {
            return this.parser.parse(tokenizableLines);
        } 
        catch(ex) {
            if(ex instanceof SyntaxError) {
                throw ex;
            }
            
            throw new SyntaxError(`\n\t${tokenizableLines[0].toString()}`);
        }
    }
}

const STMT_PARSERS = new Map([
    ['sequence', new LineParserInterceptor({
        parse(tokenizableLines) {
            if(tokenizableLines.length === 0 || tokenizableLines[0].value === 'else' || tokenizableLines[0].value === 'end') {
                return StmtSequence.EMPTY;
            }
    
            return STMT_PARSERS.get('variableAssign').parse(tokenizableLines);   
        }
    })], 
    ['variableAssign', {
        parse(tokenizableLines) {
            let matched = tokenizableLines[0].tryTokenables('variableAssign');
            if(matched.length !== 0) {
                let [varTokenable, assignedTokenable] = matched;
                return createAssign(
                    tokenizableLines, 
                    VariableAssign, 
                    new Variable(varTokenable.value), 
                    assignedTokenable
                );
            }

            return STMT_PARSERS.get('propertyAssign').parse(tokenizableLines);
        }
    }],   
    ['propertyAssign', {
        parse(tokenizableLines) {
            let matched = tokenizableLines[0].tryTokenables('propertyAssign');
            if(matched.length !== 0) {
                let [varTokenable, propertyTokenable, assignedTokenable] = matched;
                return createAssign(
                    tokenizableLines, 
                    PropertyAssign, 
                    new Property(new Variable(varTokenable.value), propertyTokenable.value), 
                    assignedTokenable
                );                
            }

            return STMT_PARSERS.get('fcall').parse(tokenizableLines);
        }
    }],             
    ['fcall', {
        parse(tokenizableLines) {
            let matched = tokenizableLines[0].tryTokenables('fcall');
            if(matched.length !== 0) {
                let [fNameTokenable, ...argTokenables] = matched;
                return new StmtSequence(
                    new FunCallWrapper(
                        new FunCall(
                            new Variable(fNameTokenable.value),
                            argTokenables.map(argTokenable => VALUE_PART_PARSERS.get('value').parse(argTokenable)) 
                        )
                    ),
                    STMT_PARSERS.get('sequence').parse(tokenizableLines.slice(1))
                );                
            }

            return STMT_PARSERS.get('mcall').parse(tokenizableLines);
        }
    }],        
    ['mcall', {
        parse(tokenizableLines) {
            let matched = tokenizableLines[0].tryTokenables('mcall');
            if(matched.length !== 0) {
                let [nameTokenable, propTokenable, ...argTokenables] = matched;
                return new StmtSequence(
                    new FunCallWrapper(
                        new MethodCall(
                            new Property(new Variable(nameTokenable.value), propTokenable.value).getter(), 
                            argTokenables.map(argTokenable => VALUE_PART_PARSERS.get('value').parse(argTokenable))
                        )
                    ),
                    STMT_PARSERS.get('sequence').parse(tokenizableLines.slice(1))
                );                
            }

            return STMT_PARSERS.get('command').parse(tokenizableLines);
        }
    }],            
    ['command', {
        parse(tokenizableLines) {
            let [cmdTokenable, argTokenable] = tokenizableLines[0].tryTokenables('command');
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
            throw new SyntaxError(`\n\t${tokenizableLines[0].toString()}`);
        }
    }]
]);

function createAssign(tokenizableLines, clz, target, assignedTokenable) {
    return new StmtSequence(
        new clz(
            target, 
            VALUE_PART_PARSERS.get('value').parse(assignedTokenable)
        ),
        STMT_PARSERS.get('sequence').parse(tokenizableLines.slice(1))
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
                STMT_PARSERS.get('sequence').parse(remains),
                fNameTokenable.value
            )
        ),
        STMT_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
    );    
}

function createAssignClass(tokenizableLines, argTokenable) {
    return createAssignFunc(tokenizableLines, argTokenable, Class)
}

function createReturn(tokenizableLines, argTokenable) { 
    return new StmtSequence(
        new Return(argTokenable.value === '' ? Void : VALUE_PART_PARSERS.get('value').parse(argTokenable)),
        STMT_PARSERS.get('sequence').parse(tokenizableLines.slice(1))
    );
}

function createIf(tokenizableLines, argTokenable) {
    let remains = tokenizableLines.slice(1);     
    let trueStmt = STMT_PARSERS.get('sequence').parse(remains);

    let i = matchingElseIdx(trueStmt);
    let falseStmt = remains[i].value === 'else' ? 
            STMT_PARSERS.get('sequence').parse(remains.slice(i + 1)) : 
            StmtSequence.EMPTY;

    return new StmtSequence(
            new If(
                VALUE_PART_PARSERS.get('boolean').parse(argTokenable), 
                trueStmt,
                falseStmt
            ),
            STMT_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
    );
}

function createWhile(tokenizableLines, argTokenable) {
    let remains = tokenizableLines.slice(1);     
    return new StmtSequence(
         new While(
            VALUE_PART_PARSERS.get('boolean').parse(argTokenable), 
            STMT_PARSERS.get('sequence').parse(remains)
         ),
         STMT_PARSERS.get('sequence').parse(linesAfterCurrentBlock(remains))
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