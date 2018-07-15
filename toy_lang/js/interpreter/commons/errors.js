export {ClassError, ValueError};

class ClassError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ClassError';
    }
}

class ValueError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ValueError';
    }
}