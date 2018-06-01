import {Tokenizer} from './interpreter/tokenizer/tokenizer.js';        
import {Context} from './context.js';
import {ToyParser} from './interpreter/toy_parser.js';

export {Toy};

class Toy {
    constructor(env, code) {
        this.env = env;
        this.code = code;
    }

    play() {
        new ToyParser(this.env)
              .parse(new Tokenizer(this.code))
              .evaluate(Context.initialize(this.env));
    }
}
