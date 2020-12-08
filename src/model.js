class Container {
    clone() {
        return new Container()
    }

    description() {
        return 'Container'
    }
}

class ObjectContainer extends Container {
    constructor(type) {
        super()
        this.type = type
        this.object = null
    }

    exists() {
        return this.object !== null
    }

    ifThere(then) {
        if (this.exists()) return then(this.object)
    }

    ifNot(then) {
        if (!this.exists()) return then()
    }

    ifEither(there, not) {
        return this.exists() ? there(this.object) : not()
    }

    get() {
        if (!this.exists()) throw new Error('No ' + this.description())
        return this.object
    }
}

class Value extends ObjectContainer {
    constructor(type) {
        super(type)
    }

    set(value) {
        this.object = value
    }

    get() {
        return this.object
    }

    clone() {
        return Value.of(this.type)
    }

    description() {
        return 'Value of ' + this.type.name
    }
}
Value.of = type => new Value(type)

class One extends ObjectContainer {
    constructor(type) {
        super(type)

        const create = t => then => {
            this.object = new t
            if (then) then(this.object)
            return this.object
        }

        if (!type.abstracting) {
            this.create = create(type)
        } else {
            type.abstracting.forEach(impl =>
                this['create' + impl.name] = create(impl))
        }
    }

    clone() {
        return One.of(this.type)
    }

    description() {
        return 'One of ' + this.type.name
    }
}
One.of = type => new One(type)

class Many extends Container {
    constructor(container) {
        super()
        this.container = container
        this.items = []

        if (!(container instanceof Container))
            this.container = One.of(container)
    }

    add() {
        const i = this.container.clone()
        this.items.push(i)
        return i
    }

    isEmpty() {
        return this.items.length == 0
    }

    all() {
        return this.items
    }

    at(index) {
        return this.items[index] || this.container.clone()
    }

    last(index = 0) {
        return this.items[this.items.length - 1 - index] || this.container.clone()
    }

    select(condition) {
        const subset = this.clone()
        subset.items = this.items.filter(condition)
        return subset
    }

    getAll() {
        return this.all().map(i => i.get())
    }

    clone() {
        return Many.of(this.container)
    }

    description() {
        return 'Many of ' + this.container.description()
    }
}
Many.of = container => new Many(container)

class Map extends Container {
    constructor(container) {
        super()
        this.container = container
        this.map = {}

        if (!(container instanceof Container))
            this.container = One.of(container)
    }

    put(key) {
        const v = this.container.clone()
        this.map[key] = v
        return v
    }

    at(key) {
        return this.map[key] || this.container.clone()
    }

    all() {
        return this.map
    }

    keys() {
        return Object.keys(this.map)
    }

    values() {
        return Object.values(this.map)
    }

    clone() {
        return Map.of(this.container)
    }

    description() {
        return 'Map of ' + this.container.description()
    }
}
Map.of = container => new Map(container)

class Reference extends ObjectContainer {
    constructor(type) {
        super(type)
    }

    point(to) {
        this.object = to
        return to
    }

    clone() {
        return Reference.to(this.type)
    }

    description() {
        return 'Reference to ' + this.type.name
    }
}
Reference.to = type => new Reference(type)

class Either extends ObjectContainer {
    constructor(...containers) {
        super('any')
        this.containers = containers
        this.picked = null
    }

    options() {
        return this.containers
    }

    pick(index) {
        this.picked = index
        this.object = this.containers[index].clone()
        return this.object
    }

    clone() {
        return Either.of(...this.containers)
    }

    description() {
        return 'Either of ' + this.containers.map(c => c.description()).join(', ')
    }
}
Either.of = (...containers) => new Either(...containers)

class Formula extends Container {
    constructor(container) {
        super()
        this.container = container
        this.function = () => this.container

        if (!(container instanceof Container))
            this.container = One.of(container)
    }

    set(fn) {
        this.function = fn
    }

    execute(...args) {
        const result = this.container.clone()
        this.function(result, ...args)
        return result
    }

    clone() {
        return Formula.for(this.container)
    }

    body() {
        this.function.toString()
    }

    description() {
        return 'Formula of ' + this.container.description()
    }
}
Formula.for = container => new Formula(container)

function extend(implementation, abstraction) {
    if (!abstraction.abstracting) abstraction.abstracting = []
    abstraction.abstracting.push(implementation)
    implementation.abstracting = null
}

module.exports = {
    Value,
    One,
    Many,
    Map,
    Reference,
    Either,
    Formula,
    extend
}