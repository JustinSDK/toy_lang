export {Text, Num, Boolean, Void};

const Void = {
    evaluate(context) {
        return this;
    }    
};

class Text {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}

class Num {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }
}

class Boolean {
    constructor(value) {
        this.value = value;
    }

    evaluate(context) {
        return this;
    }    
}
