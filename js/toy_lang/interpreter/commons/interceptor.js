export {ParseExInterceptor, EvalExInterceptor};

class ParseExInterceptor {
    constructor(parser) {
        this.parser = parser;
    }

    parse(tokenableLines) {
        try {
            return this.parser.parse(tokenableLines);
        } 
        catch(ex) {
            if(ex instanceof SyntaxError) {
                throw ex;
            }
            tokenableLines[0].syntaxErr('illegal statement');
        }
    }
}

class EvalExInterceptor {
    constructor(ast) {
        this.ast = ast;
    }

    evaluate(context) {
        try {
            return this.ast.evaluate(context);
        } 
        catch(ex) {
            if(ex instanceof TypeError) {
                ex.message = 'illegal expression';
            }
            throw ex;
        }
    }
}