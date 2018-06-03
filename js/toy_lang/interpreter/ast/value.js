import {Variable, VariableAssign, StmtSequence} from './statement.js'
export {Value, Null, Primitive, Func, Void, Instance, Class};

class Value {
    evaluate(context) {
        return this;
    }      

    toString() {
        return '';
    }
}

// internal null value
const Null = new Value();

// number, text, boolean
class Primitive extends Value {
    constructor(value) {
        super();
        this.value = value;
    }

    toString() {
        return `${this.value}`;
    }
}

Primitive.BoolTrue = new Primitive(true);
Primitive.BoolFalse = new Primitive(false);

class Func extends Value {
    constructor(params, stmt, name = '', parentContext = null) {
        super();
        this.params = params;
        this.stmt = stmt;
        this.name = name;
        this.parentContext = parentContext;
    }

    apply(args) {
        return VariableAssign.assigns(
            this.params, 
            this.params.map((_, idx) => args[idx] ? args[idx] : Null)
        );
    }

    bodyStmt(args) {
        return new StmtSequence(this.apply(args), this.stmt);
    }

    withParentContext(context) {
        return new Func(this.params, this.stmt, this.name, context);
    }

    toyClz(context) {
        return context.lookUpVariable('Function');;
    }

    evaluate(context) {
        const clz = this.toyClz(context);
        const instance = new Instance(clz, clz.internalNode.methods, this.withParentContext(context));
        return instance;
    }
}

class Class extends Func {
    constructor(params, notMethodStmt, methods, name, parentContext = null) {
        super(params, notMethodStmt, name, parentContext);
        this.methods = methods;
    }

    hasMethod(name) {
        return this.methods.has(name);
    }

    getMethod(name) {
        return this.methods.get(name);
    }

    withParentContext(context) {
        return new Class(this.params, this.stmt, this.methods, this.name, context);
    }

    toyClz(context) {
        return context.lookUpVariable('Class');;
    }
}

const Void = new Value();

class Instance extends Value {
    constructor(clz, properties, internalNode = null) {
        super();
        this.clz = clz; 
        this.properties = new Map(Array.from(properties.entries()).concat([['class', this.clz]]));
        this.internalNode = internalNode;
    }

    getProperty(name) {
        return this.properties.get(name);
    }

    /*
        Even though I use functional programming to implement toy_lang on purpose, 
        however, toy_lang is an imperative language. Using functional programming to
        implement the setter of an mutable instance will make AST more complex. 
        For simplicity, the setProperty method modifies the state directly. 
    */
    setProperty(name, value) {
        this.properties.set(name, value);
    }

    hasOwnProperty(name) {
        return this.properties.has(name);
    }

    hasProperty(name) {
        return this.hasOwnProperty(name) || this.clz.hasMethod(name);
    }

    methodBodyStmt(context, name, args = []) {
        const f = this.hasOwnProperty(name) ? this.getProperty(name) : this.clz.getMethod(name);
        return new StmtSequence(
            new VariableAssign(new Variable('this'), this),  
            f.bodyStmt(args.map(arg => arg.evaluate(context)))
        );
    }

    toString() {
        return `[${this.clz.name} object]`;
    }
}
