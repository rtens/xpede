class Container {
    clone() {
        return new Container()
    }
}

class Value extends Container {
    constructor(type) {
        super()
        this.type = type
        this.value = null
    }

    set(value) {
        this.value = value
        return this
    }

    get() {
        return this.value
    }

    exists() {
        return this.value !== null
    }

    clone() {
        return Value.of(this.type)
    }
}
Value.of = type => new Value(type)

class One extends Container {
    constructor(type) {
        super()
        this.type = type
        this.object = null

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

    exists() {
        return this.object !== null
    }

    or(fn) {
        if (this.exists()) return this

        const backup = this.clone()
        fn(backup.create())
        return backup
    }

    get(ifYes, ifNo = () => null) {
        if (ifYes) return this.exists() ? ifYes(this.object) : ifNo()
        if (!this.exists()) throw new Error('No ' + this.type.name)
        return this.object
    }

    clone() {
        return One.of(this.type)
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

    getAll() {
        return this.all().map(i => i.get())
    }

    all() {
        return this.items
    }

    at(index) {
        return this.items[index] || this.container
    }

    last(index = 0) {
        return this.items[this.items.length - 1 - index] || this.container
    }

    select(condition) {
        const subset = this.clone()
        subset.items = this.items.filter(condition)
        return subset
    }

    isEmpty() {
        return this.items.length == 0
    }

    clone() {
        return Many.of(this.container)
    }
}
Many.of = (container) => new Many(container)

class Map extends Container {

    constructor(container) {
        super()
        this.container = container instanceof Container
            ? container
            : One.of(container)
        this.map = {}
    }

    put(key) {
        const v = this.container.clone()
        this.map[key] = v
        return v
    }

    at(key) {
        return this.map[key]
    }

    all() {
        return this.map
    }

    values() {
        return Object.values(this.map)
    }

    clone() {
        return Map.of(this.container)
    }
}
Map.of = (container) => new Map(container)

class Reference extends Container {
    constructor(type) {
        super()
        this.type = type
        this.object = null
    }

    point(to) {
        this.object = to
        return this
    }

    get(ifYes, ifNo = () => null) {
        if (ifYes) return this.exists() ? ifYes(this.object) : ifNo()
        if (!this.exists()) throw new Error('No ' + this.type.name)
        return this.object
    }

    exists() {
        return !!this.object
    }

    clone() {
        return Reference.to(this.type)
    }
}
Reference.to = type => new Reference(type)

class Formula extends Container {
    constructor(container) {
        super()
        this.container = container instanceof Container
            ? container
            : One.of(container)

        this.function = () => this.container
    }

    create(fn) {
        this.function = fn
    }

    result(...args) {
        const result = this.container.clone()
        this.function(result, ...args)
        return result
    }

    clone() {
        return Formula.of(this.container)
    }

    print() {
        console.log(this.function.toString())
    }
}
Formula.of = container => new Formula(container)

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
    Formula,
    extend
}