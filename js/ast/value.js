import {Variable, VariableAssign, StmtSequence} from './statement.js'
export {Null, Primitive, Func, Void, Instance, Class};

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
    constructor(params, stmt, name = '') {
        super();
        this.params = params;
        this.stmt = stmt;
        this.name = name;
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

    toString() {
        return `[Function ${this.name}]`;
    }
}

class Class extends Func {
    constructor(params, stmt, name = '') {
        super(params, stmt, name);
    }

    toString() {
        return `[Class ${this.name}]`;
    }
}

const Void = new Value();

class Instance extends Value {
    constructor(properties) {
        super();
        this.properties = properties;
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

    hasProperty(name) {
        return this.properties.has(name);
    }

    method(context, name, args = []) {
        let f = this.getProperty(name);
        return new StmtSequence(
            new VariableAssign(new Variable('this'), this),  
            f.bodyStmt(args.map(arg => arg.evaluate(context)))
        );
    }

    toString() {
        return `[object]`;
    }
}
