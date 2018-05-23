import {Variable, VariableAssign, StmtSequence} from './statement.js'
export {Null, Primitive, Func, Void, Instance, Class};

class Value {
    evaluate(context) {
        return this;
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
    constructor(params, stmt) {
        super();
        this.params = params;
        this.stmt = stmt;
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
        return `Function`;
    }
}

class Class extends Func {
    constructor(params, stmt) {
        super(params, stmt);
    }

    toString() {
        return `Class`;
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
}
