export {TokenableParser, TokenablesParser};

class Rule {
    constructor(rule) {
        this.rule = rule;
    }

    get type() {
        return this.rule[0];
    }

    get parser() {
        return this.rule[1];
    }
}

class RuleChain {
    constructor(rules) {
        this.rules = rules;
    }

    head() {
        return this.rules[0];
    }

    isEmpty() {
        return this.rules.length === 0;
    }
}

class Parser {
    constructor(ruleChain) {
        this.ruleChain = ruleChain;
    }

    parse(tokenables) {
        return this.ruleChain.parse(tokenables);
    }
}

class TokenableRuleChain extends RuleChain {
    constructor(rules) {
        super(rules);
    }

    static orRules(...rulePairList) {
        return new TokenableRuleChain(rulePairList.map(rulePair => new Rule(rulePair)));
    }

    tail() {
        return new TokenableRuleChain(this.rules.slice(1));
    }

    parse(tokenable) {
        if(this.isEmpty()) {
            throw new SyntaxError(`\n\t${tokenable.toString()}`);
        }

        let rule = this.head();
        let matchedTokenables = tokenable.tryTokenables(rule.type);
        if(matchedTokenables.length !== 0) {
            return rule.parser.parse(matchedTokenables);
        }
        return this.tail().parse(tokenable);
    }
}

class TokenableParser extends Parser {
    constructor(ruleChain) {
        super(ruleChain);
    }

    static orRules(...rulePairList) {
        return new TokenableParser(TokenableRuleChain.orRules(...rulePairList));
    }
}

class TokenablesRuleChain extends RuleChain {
    constructor(rules) {
        super(rules);
    }

    static orRules(...rulePairList) {
        return new TokenablesRuleChain(rulePairList.map(rulePair => new Rule(rulePair)));
    }

    tail() {
        return new TokenablesRuleChain(this.rules.slice(1));
    }

    parse(tokenables) {
        if(this.isEmpty()) {
            throw new SyntaxError(`\n\t${tokenables[0].toString()}`);
        }

        let rule = this.head();
        let matchedTokenables = tokenables[0].tryTokenables(rule.type);
        if(matchedTokenables.length !== 0) {
            return rule.parser.parse(tokenables, matchedTokenables);
        }

        return this.tail().parse(tokenables);
    }
}

class TokenablesParser extends Parser {
    constructor(ruleChain) {
        super(ruleChain);
    }

    static orRules(...rulePairList) {
        return new TokenablesParser(TokenablesRuleChain.orRules(...rulePairList));
    }
}