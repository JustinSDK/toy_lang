export {Void, Value};

const Void = {
    evaluate(context) {
        return this;
    }    
};

class Value {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}