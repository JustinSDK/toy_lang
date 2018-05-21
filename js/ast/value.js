import {Variable, VariableAssign, StmtSequence} from './statement.js'
export {Primitive, Func, Void, Instance, Class};

class Value {
    evaluate(context) {
        return this;
    }      
}

// number, text, boolean
class Primitive extends Value {
    constructor(value) {
        super();
        this.value = value;
    }
}

class Func extends Value {
    constructor(params, stmt) {
        super();
        this.params = params;
        this.stmt = stmt;
    }

    apply(args) {
        return VariableAssign.assigns(this.params, args);
    }

    bodyStmt(args) {
        return new StmtSequence(this.apply(args), this.stmt);
    }
}

class Class extends Func {
    constructor(params, stmt) {
        super(params, stmt);
    }

    apply(args) {
        return new StmtSequence(
            super.apply(args), 
            new VariableAssign(new Variable('this'), new Instance(new Map())) // this object
        );
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
