export {Stack};

class Stack {
    constructor(array = []) {
        this.array = array;
    }

    push(elem) {
        return new Stack([elem].concat(this.array));
    }

    pop() {
        return new Stack(this.array.slice(1));
    }

    isEmpty() {
        return this.array.length === 0;
    }

    get top() {
        return this.array[0];
    }

    toString() {
        return this.array.join(' ');
    }    
}