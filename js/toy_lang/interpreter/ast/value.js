import {Variable, VariableAssign, StmtSequence} from './statement.js'
export {Value, Native, Null, Primitive, Func, Void, Instance, Class, Thrown, newInstance};

class Value {
    evaluate(context) {
        return this;
    }      

    notThrown(f) {
        return f(this);
    }

    box(context) {
        return this;
    }

    toString() {
        return '';
    }
}

// internal null value
const Null = new Value();
// internal void value
const Void = Null;

function newInstance(context, clzName, node, value) {
    return new Instance(
        context.lookUpVariable(clzName),
        new Map(), 
        new node(value)
    );
}


class Native extends Value {
    constructor(value) {
        super();
        this.value = value;
    }

    toString() {
        return `${this.value}`;
    }
}

// number, text, boolean
class Primitive extends Value {
    constructor(value) {
        super();
        this.value = value;
    }

    toString() {
        return `${this.value}`;
    }

    // currently only support text
    box(context) {
        return newInstance(context, 'String', Primitive, this.value);
    }

    static boolNode(value) {
        return value ? BOOL_TRUE : BOOL_FALSE;
    }

    static from(v) {
        return (typeof v) === 'boolean' ? Primitive.boolNode(v) : new Primitive(v);
    }    
}

const BOOL_TRUE = new Primitive(true);
const BOOL_FALSE = new Primitive(false);

class Func extends Value {
    constructor(params, stmt, name = '', parentContext = null) {
        super();
        this.params = params;
        this.stmt = stmt;
        this.name = name;
        this.parentContext = parentContext;
    }

    assignToParams(context, args) {
        const argumentsListInstance = newInstance(context, 'List', Native, args); 
        return VariableAssign.assigns(
            this.params.concat([Variable.of('arguments')]), 
            this.params.map((_, idx) => args[idx] ? args[idx] : Null).concat([argumentsListInstance])
        );
    }

    bodyStmt(context, args) {
        return new StmtSequence(this.assignToParams(context, args), this.stmt, this.stmt.lineNumber);
    }

    call(context, args) {
        const ctxValues = evaluateArgs(context, args);
        if(ctxValues.length !== 0) {
            const ctxValue = ctxValues.slice(-1)[0];
            if(ctxValue.thrownNode) {
                return ctxValue;
            }
        }

        const bodyStmt = this.bodyStmt(context, ctxValues);
        return bodyStmt.evaluate(
            this.parentContext ? 
                this.parentContext.childContext() : // closure context
                context.childContext()
        );
    }

    withParentContext(context) {
        return new Func(this.params, this.stmt, this.name, context);
    }

    clzOfLang(context) {
        return context.lookUpVariable('Function');;
    }

    evaluate(context) {
        return new Instance(
            this.clzOfLang(context), new Map(), this.withParentContext(context)
        );
    }
}

function evaluateArgs(context, args) {
    if(args.length === 0) {
        return [];
    }
    const arg = args[0];
    const ctxValue = arg.evaluate(context);
    if(ctxValue.thrownNode) {
        return [ctxValue];
    }
    return [ctxValue].concat(evaluateArgs(context, args.slice(1)));
}

class Class extends Func {
    constructor({notMethodStmt, methods, name, parentClzNames, parentContext}) {
        super([], notMethodStmt, name, parentContext || null);
        this.parentClzNames = parentClzNames || ['Object'];
        this.methods = methods;
    }

    addOwnMethod(name, fInstance) {
        const fNode = fInstance.internalNode;
        this.methods.set(name, fNode);
    }

    deleteOwnMethod(name) {
        this.methods.delete(name);
    }

    hasOwnMethod(name) {
        return this.methods.has(name);
    }    

    hasMethod(context, name) {
        if(this.name === 'Object') {
            return this.hasOwnMethod(name);
        }

        return this.hasOwnMethod(name) || 
               this.parentClzNames.some(clzName => clzNode(context, clzName).hasOwnMethod(name)) ||
               grandParentClzNames(context, this.parentClzNames).some(
                    clzName => clzNode(context, clzName).hasMethod(context, name)
               );
    }

    getOwnMethod(name) {
        return this.methods.get(name);
    }

    getMethod(context, name) {
        const ownMethod = this.getOwnMethod(name);
        if(this.name === 'Object') {
            context.RUNTIME_CHECKER.refErrIfNoValue(ownMethod, name);
        }

        return ownMethod ? ownMethod : lookupParentClzes(context, this, name);
    }

    withParentContext(context) {
        return new Class({
            notMethodStmt : this.stmt, 
            methods : this.methods, 
            name : this.name, 
            parentClzNames : this.parentClzNames, 
            parentContext : context
        });
    }

    clzOfLang(context) {
        return context.lookUpVariable('Class');;
    }
}

function lookupParentClzes(context, clz, name) {
    // BFS
    const parentClzName = clz.parentClzNames.find(
        clzName => clzNode(context, clzName).hasOwnMethod(name)
    );
    if(parentClzName) {
        return clzNode(context, parentClzName).getOwnMethod(name);
    }
                    
    const grandParentClzName = grandParentClzNames(context, clz.parentClzNames).find(
        clzName => clzNode(context, clzName).hasMethod(context, name)
    );

    context.RUNTIME_CHECKER.refErrIfNoValue(grandParentClzName, name);
    return clzNode(context, grandParentClzName).getOwnMethod(name);
}

function clzNode(context, clzName) {
    return context.lookUpVariable(clzName).internalNode;
}

function grandParentClzNames(context, parentClzNames) {
    return parentClzNames.filter(clzName => clzName !== 'Object') // Object is the top class. No more lookup.
                         .map(clzName => clzNode(context, clzName))
                         .map(clzNode => clzNode.parentClzNames)
                         .reduce((acct, grandParentClzNames) => acct.concat(grandParentClzNames), [])
}

class Instance extends Value {
    constructor(clzOfLang, properties, internalNode) {
        super();
        this.clzOfLang = clzOfLang; 
        this.properties = properties;
        this.internalNode = internalNode || this;
        this.value = this;
    }

    hasOwnProperty(name) {
        return this.properties.has(name);
    }

    hasProperty(context, name) {
        return this.hasOwnProperty(name) || 
               this.clzOfLang.internalNode.hasMethod(context, name);
    }

    getOwnProperty(name) {
        return this.properties.get(name);
    }

    getProperty(context, name) {
        return this.getOwnProperty(name) || 
               this.clzOfLang.internalNode.getMethod(context, name);
    }

    deleteOwnProperty(name) {
        this.properties.delete(name);
    }

    /*
        Even though I use functional programming to implement toy_lang on purpose, 
        however, toy_lang is an imperative language. Using functional programming to
        implement the setter of an mutable instance will make AST more complex. 
        For simplicity, the setOwnProperty method modifies the state directly. 
    */
    setOwnProperty(name, value) {
        this.properties.set(name, value);
    }

    methodBodyStmt(context, name, args = []) {
        const f = this.hasOwnProperty(name) ? this.getOwnProperty(name).internalNode : this.clzOfLang.internalNode.getMethod(context, name);
        const bodystmt = f.bodyStmt(context, args.map(arg => arg.evaluate(context)));
        return new StmtSequence(
            new VariableAssign(Variable.of('this'), this),  
            bodystmt,
            bodystmt.lineNumber
        );
    }

    evalMethod(context, methodName, args) {
        const methodBodyStmt = this.methodBodyStmt(context, methodName, args);
        const fClz = this.getOwnProperty(methodName);
        const clzNode = this.clzOfLang.internalNode;
        const parentContext = clzNode.parentContext || 
                              (fClz && fClz.internalNode.parentContext); // In this case, instance is just a namespace.
    
        return methodBodyStmt.evaluate(
            parentContext ?
                parentContext.childContext() : // closure context
                context.childContext()
        );
    }

    toString(context) {
        if(context && this.hasProperty(context, 'toString')) {
            const methodBodyStmt = this.methodBodyStmt(context, 'toString');
            return methodBodyStmt.evaluate(context.childContext()).returnedValue.value;
        }
        
        return `[${this.clzOfLang.internalNode.name} object]`;
    }
}

class Thrown extends Value {
    constructor(value, stackTraceElements = []) {
        super();
        this.value = value;
        this.stackTraceElements = stackTraceElements;
    }

    addStackTraceElement(stackTraceElement) {
        this.stackTraceElements.push(stackTraceElement);
    }

    toString() {
        return `${this.value}`;
    }
}
