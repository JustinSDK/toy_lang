import {Text, Num, Boolean} from './primitive.js';
export {Add, Substract, Multiply, Divide, RELATIONS};

class Add {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value + this.right.evaluate(context).value);
    }
}

class Substract {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value - this.right.evaluate(context).value);
    }
}

class Multiply {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value * this.right.evaluate(context).value);
    }
}

class Divide {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Num(this.left.evaluate(context).value / this.right.evaluate(context).value);
    }
}

class Equal {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value === this.right.evaluate(context).value)
    }
}

class NotEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value !== this.right.evaluate(context).value)
    }
}

class GreaterEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value >= this.right.evaluate(context).value)
    }
}

class LessEqual {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value <= this.right.evaluate(context).value)
    }
}

class GreaterThan {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value > this.right.evaluate(context).value)
    }
}

class LessThan {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }

    evaluate(context) {
        return new Boolean(this.left.evaluate(context).value < this.right.evaluate(context).value)
    }
}

const RELATIONS = new Map([
    ['==', Equal],
    ['!=', NotEqual],
    ['>=', GreaterEqual],
    ['<=', LessEqual],
    ['>', GreaterThan],
    ['<', LessThan]
]);
