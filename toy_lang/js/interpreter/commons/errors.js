export {ClassError};

class ClassError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ClassError';
    }
}