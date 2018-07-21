export {ModuleError, ClassError, ValueError};

class ModuleError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ModuleError';
    }
}

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