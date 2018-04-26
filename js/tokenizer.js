export {Tokenizer};

class Tokens {
    constructor(tokens) {
        this.head = tokens[0];
        this.tail = tokens.slice(1);
    }
}

class Tokenizer {
    constructor(code) {
        this.code = code;
    }

    tokenize() {
        return this.code.trim().split('\n')
                        .map(line => line.trim())
                        .filter(line => line !== '')
                        .map(line => {
                            let assign = /([a-zA-Z_]+[a-zA-Z_0-9]*)\s*=\s*(.*)/.exec(line);
                            if(assign) {
                                return new Tokens(['assign', assign[1], assign[2]]);
                            }
                            
                            if(line.startsWith('end')) {
                                return new Tokens(['end']);
                            }

                            let matched = /(\w+)\s*(.*)/.exec(line);
                            return new Tokens([matched[1], matched[2]]);
                        });
    }
}