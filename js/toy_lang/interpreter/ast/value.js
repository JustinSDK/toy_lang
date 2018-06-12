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
// internal void value
const Void = Null;

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

    assignToParams(args) {
        return VariableAssign.assigns(
            this.params, 
            this.params.map((_, idx) => args[idx] ? args[idx] : Null)
        );
    }

    bodyStmt(args) {
        return new StmtSequence(this.assignToParams(args), this.stmt);
    }

    call(context, args) {
        const bodyStmt = this.bodyStmt(args.map(arg => arg.evaluate(context)));
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

class Class extends Func {
    constructor(params, notMethodStmt, methods, name, parentContext = null, parentClzNames = ['Object']) {
        super(params, notMethodStmt, name, parentContext);
        this.methods = methods;
        this.parentClzNames = parentClzNames;
    }

    addOwnMethod(fInstance) {
        const fNode = fInstance.internalNode;
        this.methods.set(fNode.name, fNode);
    }

    deleteOwnMethod(name) {
        this.methods.delete(name);
    }

    hasOwnMethod(name) {
        return this.methods.has(name);
    }    

    hasMethod(context, name) {
        if(this.hasOwnMethod(name)) {
            return true;
        }

        if(this.name === 'Object') {
            return false;
        }

        // BFS
        if(this.parentClzNames.some(parentClzName => context.lookUpVariable(parentClzName).internalNode.hasOwnMethod(name))) {
            return true;
        }

        return grandParentClzNames(context, this.parentClzNames).some(
            grandParentClzName => context.lookUpVariable(grandParentClzName).internalNode.hasMethod(context, name)
        );
    }

    getOwnMethod(name) {
        return this.methods.get(name);
    }

    getMethod(context, name) {
        const ownMethod = this.getOwnMethod(name);
        if(ownMethod) {
            return ownMethod;
        }

        if(this.name === 'Object') {
            return false;
        }
        
        const parentClzName = this.parentClzNames.find(parentClzName => context.lookUpVariable(parentClzName).internalNode.hasOwnMethod(name))
        // BFS
        if(parentClzName) {
            return context.lookUpVariable(parentClzName).internalNode.getOwnMethod(name);
        }
                        
        const grandParentClzName = grandParentClzNames(context, this.parentClzNames).find(
            grandParentClzName => context.lookUpVariable(grandParentClzName).internalNode.hasMethod(context, name)
        );
        return context.lookUpVariable(grandParentClzName).internalNode.getOwnMethod(name);
    }

    withParentContext(context) {
        return new Class(this.params, this.stmt, this.methods, this.name, context);
    }

    clzOfLang(context) {
        return context.lookUpVariable('Class');;
    }
}

function grandParentClzNames(context, parentClzNames) {
    return parentClzNames.filter(parentName => parentName !== 'Object')
                         .map(parentName => context.lookUpVariable(parentName).internalNode)
                         .map(parentClzNode => parentClzNode.parentNames)
                         .reduce((grandParentNamesAcct, grandParentNames) => grandParentNamesAcct.concat(grandParentNames), [])
}

class Instance extends Value {
    constructor(clzOfLang, properties, internalNode = null) {
        super();
        this.clzOfLang = clzOfLang; 
        this.properties = properties;
        this.internalNode = internalNode;
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
        return new StmtSequence(
            new VariableAssign(new Variable('this'), this),  
            f.bodyStmt(args.map(arg => arg.evaluate(context)))
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
