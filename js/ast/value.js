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

    bodyStmt(args) {
        return new StmtSequence(VariableAssign.assigns(this.params, args), this.stmt);
    }
}

class Class extends Value {
    constructor(params, stmt) {
        super();
        this.params = params;
        this.stmt = stmt;
    }

    bodyStmt(args) {
        return new StmtSequence(
            VariableAssign.assigns(
                [new Variable('this')].concat(this.params), 
                [new Instance(new Map())].concat(args)
            ), 
            this.stmt
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

    setProperty(name, value) {
        return new Instance(
            new Map(Array.from(this.properties.entries()).concat([[name, value]]))
        );
    }
}
