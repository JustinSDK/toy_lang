export {TokenableParser};

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

    tail() {
        return new TokenableRuleChain(this.rules.slice(1));
    }

    isEmpty() {
        return this.rules.length === 0;
    }
}

class TokenableRuleChain extends RuleChain {
    constructor(rules) {
        super(rules);
    }

    static orRules(...rulePairList) {
        return new TokenableRuleChain(rulePairList.map(rulePair => new Rule(rulePair)));
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

class TokenableParser {
    constructor(ruleChain) {
        this.ruleChain = ruleChain;
    }

    static orRules(...rulePairList) {
        return new TokenableParser(TokenableRuleChain.orRules(...rulePairList));
    }

    parse(tokenable) {
        return this.ruleChain.parse(tokenable);
    }
}