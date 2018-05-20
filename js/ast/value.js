export {Void, Primitive};

const Void = {
    evaluate(context) {
        return this;
    }    
};

class Primitive {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}