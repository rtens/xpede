fs = require('fs');

class Storing {
    constructor(object) {
        this.root = object
        this.registry = new StoringRegistry()
    }

    toFile(filename) {
        fs.writeFileSync(filename, this.asString());
    }

    asString() {
        return JSON.stringify(this.deflated(), null, 2)
    }

    deflated() {
        return this.deflate(this.root)
    }

    deflate(object) {
        if (!object) return null
        const type = object.constructor.name

        if (type == 'Function') {
            return undefined

        } else if (type == 'Value') {
            return object.object

        } else if (type == 'One') {
            return object.exists() ? this.deflate(object.object) : null

        } else if (type == 'Many') {
            return object.items.map(i => this.deflate(i))

        } else if (type == 'Map') {
            const flatMap = {}
            Object.keys(object.map).forEach(k => flatMap[k] = this.deflate(object.map[k]))
            return flatMap

        } else if (type == 'Reference') {
            return this.registry.reference(object.object)

        } else if (type == 'Either') {
            return {
                picked: object.picked,
                object: this.deflate(object.object)
            }

        } else if (type == 'Formula') {
            return object.function.toString()

        } else {
            const fields = {}
            Object.keys(object).forEach(k =>
                fields[k] = this.deflate(object[k]))

            const deflated = { id: undefined, type, fields }
            this.registry.register(object, id => deflated.id = id)

            return deflated
        }
    }
}

class StoringRegistry {
    constructor() {
        this.registrations = []
    }

    nextId() {
        return '@' + (this.registrations.length + 1)
    }

    reference(object) {
        if (!object) return null

        const registered = this.registrations.find(r => r.object === object)
        if (registered) {
            if (registered.whenReferenced) registered.whenReferenced(registered.id)
            return registered.id
        } else {
            const id = this.nextId()
            this.registrations.push({ object, id })
            return id
        }

    }

    register(object, whenReferenced) {
        const referenced = this.registrations.find(r => r.object === object)
        if (referenced) whenReferenced(referenced.id)
        else this.registrations.push({ object, whenReferenced, id: this.nextId() })
    }
}

class Loading {
    constructor(deflated) {
        this.deflated = deflated
        this.registry = new LoadingRegistry()
    }

    inflated(object) {
        return this.inflate(this.deflated, object)
    }

    inflate(flat, object) {
        if (!object) return null
        const type = object.constructor.name

        if (type == 'Value') {
            if (flat === null) {
                object.object = null
            } else if (object.type.name == 'Date') {
                object.object = new Date(flat)
            } else {
                object.object = flat
            }

        } else if (type == 'One') {
            if (flat) object.object = this.inflate(flat, new object.type)

        } else if (type == 'Many') {
            object.items = flat.map(i => this.inflate(i, object.container.clone()))

        } else if (type == 'Map') {
            Object.keys(flat).forEach(k =>
                object.map[k] = this.inflate(flat[k], object.container.clone()))

        } else if (type == 'Reference') {
            this.registry.find(flat, o => object.object = o)

        } else if (type == 'Either') {
            if (flat.picked !== null) object.object = this.inflate(flat.object, object['pick' + flat.picked]())

        } else if (type == 'Formula') {
            object.function = new Function('return ' + flat)()

        } else {
            if (flat.type != type) {
                const impl = object.constructor.abstracting.find(a => a.name == flat.type)
                object = new impl
            }
            if (flat.id) this.registry.found(flat.id, object)
            Object.keys(flat.fields).forEach(k =>
                object[k] = this.inflate(flat.fields[k], object[k]))
        }

        return object
    }
}
Loading.fromFlat = flat => new Loading(flat)
Loading.fromString = string => Loading.fromFlat(JSON.parse(string))
Loading.fromFile = filename => Loading.fromString(fs.readFileSync(filename, 'utf8'))

class LoadingRegistry {
    constructor() {
        this.registrations = []
    }

    find(id, whenFound) {
        const found = this.registrations.find(o => o.id == id)
        if (found) whenFound(found.object)
        else this.registrations.push({ id, whenFound })
    }

    found(id, object) {
        const looking = this.registrations.find(o => o.id == id)
        if (looking) {
            looking.object = object
            looking.whenFound(object)
        } else {
            this.registrations.push({ id, object })
        }
    }
}

class Dashboard {
    constructor(expedition) {
        this.expedition = expedition
    }

    generate(filename) {
        this._insert('src/dashboard.html', this.expedition.status(), filename)
    }

    _insert(input, model, output) {
        const template = fs.readFileSync(input, 'utf8')
        fs.writeFileSync(output, template
            .replace(/\/\*\*STATUS\*\/.*\/\*STATUS\*\*\//, JSON.stringify(model)))
    }
}

module.exports = {
    Storing,
    Loading,
    Dashboard
}