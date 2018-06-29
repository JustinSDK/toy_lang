# Toy Lang

Toy lang was started from a [gist](https://gist.github.com/JustinSDK/9c38136b90137387ad3518d4e99d15ba). It's the first language I made. ES6 modules support is required.

- Keywords: `if`, `else`, `while`, `def`, `return`, `and`, `or`, `not`, `new`, `class`, `this`, `arguments`, `throw`, `try`, `catch`, `nonlocal`, `switch`, `case`, `default`
- Literals: 3.14 (number), `true`, `false`, `'Hello, World'` (string), `\r`, `'\n'`, `'\t'`, `'\\'`, `'\''`
- Operators: `new`, `.`, `==`, `!=`, `>=`, `>`, `<=`, `<`, `and`, `or`, `not`, `+`, `-`, `*`, `/`, `%`, `&`, `|`, `^`, `<<`, `>>`
- Assigns: `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, `>>=`
- Built-in functions: `print`, `println`, `printf`, `hasValue`, `noValue`, `format`
- Built-in classes: `Object`, `Class`, `Function`, `String`, `List`, `Traceable`
- Comment: `#`

[Play It](https://openhome.cc/Gossip/Computation/toy_lang/)

# Examples

- Multiplication Table

```python
def print_row(n) {
    i = 2
    while i < 10 {
        print('{0}*{1}={2}\t'.format(i, n, i * n))
        i += 1 
    }
    println()
}

range(1, 10).forEach(print_row)
```

- Tower of Hanoi

```python
def hanoi(n, a, b, c) {
    if n == 1 {
        println('Move sheet from {0} to {1}'.format(a , c))
    } 
    else {
        hanoi(n - 1, a, c, b)
        hanoi(1, a, b, c)
        hanoi(n - 1, b, a, c) 
    }
}

hanoi(3, 'A', 'B', 'C')
```

- Factorial

```Java
def factorial(n) {
    if n == 0 {
        return 1
    }

    return n * factorial(n - 1)
}

# use \ for cross-line expression
range(1, 6).map(n -> '{0}! = {1}'.format(n, factorial(n))) \
           .forEach(println)
```

- Tricolour 

```java
def adjust(flags) {
    b = 0
    w = 0
    r = flags.length() - 1
    while flags.get(w) == 'B' and w < flags.length() {
        w += 1
    }
    while flags.get(r) == 'R' and r > 0 {
        r -= 1
    }
    while w <= r {
        switch flags.get(w) {
            case 'W'
                w += 1
            case 'B'
                flags.swap(b, w)
                w += 1
                b += 1
            default
                flags.swap(r, w)
                r -= 1
        }
    }
    return flags
}

flags = 'RWBBWRWR'.split('')
println(adjust(flags))
```

- Class

```java
class AccountException(Traceable) {
    def init() {
        this.super(Traceable, 'init', arguments)
    }
}
      
class Account {
    # it's a field
    balance = 0 

    def init(number, name) {
        this.number = number
        this.name = name
    }

    def deposit(amount) {
        if amount <= 0 {
            throw new AccountException('must be positive')
        }

        this.balance += amount
    }

    def toString() {
        return '{0}, {1}, {2}'.format(this.number, this.name, this.balance)
    }
}

acct = new Account('123', 'Justin')
acct.deposit(100)

println(acct)

try {
    acct.deposit(-100)
}
catch e {
    e.printStackTrace()
}
```

- Built-in Classes

```java
def sum(lt) {
    if lt.isEmpty() {
        return 0
    }
    
    return lt.get(0) + sum(lt.slice(1))
}
    
lt = range(1, 11)
println('{0}={1}'.format(lt.join('+'), sum(lt)))

println(new String('aBc').toUpperCase())
println(new String('aBc').toLowerCase())
```

- Closure

```javascript
def foo() {
    x = 10
    def inner(y) {
        # closure closes the variable x, not its value
        return x + y
    }
    x = 30 
    return inner
}

f = foo()
println('f(20) is ' + f(20))

def orz() {
    x = 10
    class Inner {
        y = x
        def init(p) {
            # closure closes the variable x, not its value
            this.z = x + p
        }

        def x() {
            # closure closes the variable x, not its value
            return x
        }
    }
    x = 30
    return Inner
}

clz = orz()
obj = new clz(20)

println('obj.x() is ' + obj.x())
println('obj.y is ' + obj.y)
println('obj.z is ' + obj.z)

def foo2(x) {
    def getX() {
        return x
    }

    def setX(v) {
        nonlocal x = v
    }

    return [getX, setX]
}

accessor = foo2(10)
getX = accessor.get(0)
setX = accessor.get(1)

println(getX()) 
setX(100)
println(getX())
```

- Lambda expression

```java    
[1, 2, 3, 4, 5].filter(elem -> elem >= 2) \
               .map(elem -> elem * 100)   \
               .forEach(println)

range(1, 10) \
  .map(n -> range(2, 10).map(i -> '{0}*{1}={2}'.format(i, n, i * n)).join('\t')) \
  .forEach(println)

def foo3(x, y) {
    return () -> x + y
}

println(foo3(10, 20)())

def orz() {
    x = 10
    return (y, z) -> x + y + z 
}

println(orz()(100, 200))

# IIFE
(() -> println('XD'))()
(x -> println(x))('XD')
println(((x, y) -> x + y)(1, 2))
```

- Mixin

```ruby
class Ordered {
    def lessThan(that) {
        return this.compare(that) < 0
    }

    def lessEqualsThan(that) {
        return this.lessThan(that) or this.equals(that)
    }

    def greaterThan(that) {
        return not this.lessEqualsThan(that)
    }

    def greaterEqualsThan(that) {
        return not this.lessThan(that)
    }
}

class Circle {
    def init(radius) {
        this.radius = radius
    }

    def compare(that) {
        return this.radius - that.radius
    }

    def equals(that) {
        return this.radius == that.radius
    }
}

Circle.mixin(Ordered)

c1 = new Circle(10)
c2 = new Circle(20)

println(c1.lessThan(c2))
println(c1.lessEqualsThan(c2))
println(c1.greaterThan(c2))
println(c1.greaterEqualsThan(c2))
```

- Inheritance 1

```python
class PA {
    def init() {
        println('PA init')
    }

    def ma(x, y) {
        println(x)
        println(y)
    }
}

class PB {
    def mb() {
        println('mb')
    }
}

class C(PA, PB) {
    def init() {
        this.super(PA, 'init')
        println('C init')
    }

    def mc() {
        println('mc')
    }

    def ma(x, y) {
        this.super(PA, 'ma', arguments)
        println('c.ma()')
    }
}

c = new C()
c.ma(10, 20)
c.mb()
c.mc()
```

- Inheritance 2

```python
class Ordered {
    def lessThan(that) {
        return this.compare(that) < 0
    }

    def lessEqualsThan(that) {
        return this.lessThan(that) or this.equals(that)
    }

    def greaterThan(that) {
        return not this.lessEqualsThan(that)
    }

    def greaterEqualsThan(that) {
        return not this.lessThan(that)
    }
}

class Circle(Ordered) {
    def init(radius) {
        this.radius = radius
    }

    def compare(that) {
        return this.radius - that.radius
    }

    def equals(that) {
        return this.radius == that.radius
    }
}

c1 = new Circle(10)
c2 = new Circle(20)

println(c1.lessThan(c2))
println(c1.lessEqualsThan(c2))
println(c1.greaterThan(c2))
println(c1.greaterEqualsThan(c2))
```

- meta programming 1

```javascript
println(Object.ownMethods())
Object.deleteOwnMethod('toString')    
println(Object.ownMethods())

def toString() {
    props = this.ownProperties()
    # each prop is a List instance which contains name and value
    return  props.map(prop -> prop.join()).join('\n')
}

o1 = new Object()
o1.x = 1
o1.y = 2
o1.z = 3
println(toString.apply(o1))

o2 = new Object([['x', 10], ['y', 20]])
println(toString.apply(o2))

def foo4(p) {
    return this.x + this.y + this.z + p
}

# The 2nd parameter of the apply method accepts a List instance. 
println(foo4.apply(o1, [40]))
```

- meta programming 2

```javascript
class PA {
    def pa() {
        println('pa')
    }
}

class PB {
    def pb() {
        println('pb')
    }
}

class C {
    def c() {
        println('c') 
    }
}

println(C.parents())
C.parents([PA, PB])
println(C.parents())

new C().pa()
new C().pb()
new C().c()

def toString() {
    return this.class().name()
}

Orz = new Class('Orz', [PA, PB], [toString])
orz = new Orz()
orz.pa()
orz.pb()
println(orz)
```

----------

[openhome.cc](https://openhome.cc)