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
        // for closure
        if(this.parentContext) {
            return new StmtSequence(
                VariableAssign.assigns(
                    Array.from(this.parentContext.variables.keys()).map(name => new Variable(name)), 
                    Array.from(this.parentContext.variables.values())
                ),
                new StmtSequence(this.apply(args), this.stmt)
            );
        }
        return new StmtSequence(this.apply(args), this.stmt);
    }

    toString() {
        return `[Function ${this.name}]`;
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

    toString() {
        return `[Class ${this.name}]`;
    }
}

const Void = new Value();

class Instance extends Value {
    constructor(clz, properties) {
        super();
        this.clz = clz;
        this.properties = new Map(Array.from(properties.entries()).concat([['class', clz]]));
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

    method(context, name, args = []) {
        let f = this.hasOwnProperty(name) ? this.getProperty(name) : this.clz.getMethod(name);
        return new StmtSequence(
            new VariableAssign(new Variable('this'), this),  
            f.bodyStmt(args.map(arg => arg.evaluate(context)))
        );
    }

    toString() {
        return `[${this.clz.name} object]`;
    }
}
