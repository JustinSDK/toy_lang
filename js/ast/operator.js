import {Value} from './value.js';
export {ARITHMETIC_OPERATORS, RELATION_OPERATORS, LOGIC_OPERATORS};

class Add {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value + this.right.evaluate(context).value);
    }
}

class Substract {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value - this.right.evaluate(context).value);
    }
}

class Multiply {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value * this.right.evaluate(context).value);
    }
}

class Divide {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value / this.right.evaluate(context).value);
    }
}

const ARITHMETIC_OPERATORS = new Map([
    ['+', Add],
    ['-', Substract],
    ['*', Multiply],
    ['/', Divide]
]);

class Equal {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value === this.right.evaluate(context).value)
    }
}

class NotEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value !== this.right.evaluate(context).value)
    }
}

class GreaterEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value >= this.right.evaluate(context).value)
    }
}

class LessEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value <= this.right.evaluate(context).value)
    }
}

class GreaterThan {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value > this.right.evaluate(context).value)
    }
}

class LessThan {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value < this.right.evaluate(context).value)
    }
}

const RELATION_OPERATORS = new Map([
    ['==', Equal],
    ['!=', NotEqual],
    ['>=', GreaterEqual],
    ['<=', LessEqual],
    ['>', GreaterThan],
    ['<', LessThan]
]);

class And {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value && this.right.evaluate(context).value)
    }
}

class Or {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Value(this.left.evaluate(context).value || this.right.evaluate(context).value)
    }
}

const LOGIC_OPERATORS = new Map([
    ['and', And],
    ['or', Or]
]);
