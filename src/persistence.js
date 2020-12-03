fs = require('fs');

class Storing {
    constructor(object) {
        this.root = object
        this.registry = new Registry()
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
            return object.value

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

class Dashboard {
    constructor(expedition) {
        this.expedition = expedition
    }

    status(filename) {
        this._insert('src/status.html', this.expedition.status(), filename)
    }

    goals(filename) {
        this._insert('src/goals.html', this.expedition.goals(), filename)
    }

    _insert(input, model, output) {
        const template = fs.readFileSync(input, 'utf8')
        fs.writeFileSync(output, template
            .replace(/assets\//g, "../assets/")
            .replace(/\/\*\*MODEL\*\/.*\/\*MODEL\*\*\//, JSON.stringify(model)))
    }
}

class Loading {
    constructor(deflated) {
        this.deflated = deflated
        this.registry = new Registry()
    }

    inflated(object) {
        return this.inflate(this.deflated, object)
    }

    inflate(flat, object) {
        if (!object) return null
        const type = object.constructor.name

        if (type == 'Value') {
            if (flat === null) {
                object.value = null
            } else if (object.type.name == 'Date') {
                object.value = new Date(flat)
            } else {
                object.value = flat
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

class Registry {
    constructor() {
        this.objects = []
    }

    reference(object) {
        if (!object) return null

        const registered = this.objects.find(o => o.object === object)
        if (registered) {
            registered.whenReferenced(registered.id)
            return registered.id
        } else {
            const id = generate()
            this.objects.push({ object, id })
            return id
        }

    }

    register(object, whenReferenced) {
        const referenced = this.objects.find(o => o.object === object)
        if (referenced) whenReferenced(referenced.id)
        else this.objects.push({ object, whenReferenced, id: generate() })
    }

    find(id, whenFound) {
        const found = this.objects.find(o => o.id == id)
        if (found) whenFound(found.object)
        else this.objects.push({ id, whenFound })
    }

    found(id, object) {
        const looking = this.objects.find(o => o.id == id)
        if (looking) looking.whenFound(object)
        else this.objects.push({ id, object })
    }
}

let generate = () => '@' + Math.round(Math.random() * 100000000)

module.exports = {
    Storing,
    Loading,
    Dashboard,
    setGenerator: generator => generate = generator
}