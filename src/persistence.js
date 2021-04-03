const fs = require('fs')
const path = require('path')

class Storing {
    constructor(object) {
        this.root = object
        this.registry = new StoringRegistry()
    }

    toFile(filename) {
        fs.mkdirSync(path.dirname(filename), { recursive: true })
        fs.writeFileSync(filename, this.asString())
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
            if (!object.exists())
                return null

            if (this.registry.has(object.object))
                return this.registry.reference(object.object)

            const flat = this.deflate(object.object)
            this.registry.add(object.object, id => flat.id = id)

            return flat

        } else if (type == 'Many') {
            return object.items.map(i => this.deflate(i))

        } else if (type == 'Map') {
            const flatMap = {}
            Object.keys(object.map).forEach(k => flatMap[k] = this.deflate(object.map[k]))
            return flatMap

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

            return { id: undefined, type, fields }
        }
    }
}

class StoringRegistry {
    constructor() {
        this.registrations = []
        this.count = 1
    }

    nextId() {
        return '@' + this.count++
    }

    has(object) {
        return !!this.registrations.find(r => r.object === object)
    }

    reference(object) {
        const found = this.registrations.find(r => r.object === object)
        if (!found.id) found.id = this.nextId()
        found.whenReferenced(found.id)
        return found.id
    }

    add(object, whenReferenced) {
        this.registrations.push({ object, whenReferenced })
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
            if (typeof flat == 'string') {
                object.object = this.registry.get(flat)
            } else if (flat) {
                object.object = this.inflate(flat, new object.type)
                if (flat.id) this.registry.put(flat.id, object.object)
            }

        } else if (type == 'Many') {
            object.items = flat.map(i => this.inflate(i, object.container.clone()))

        } else if (type == 'Map') {
            Object.keys(flat).forEach(k =>
                object.map[k] = this.inflate(flat[k], object.container.clone()))

        } else if (type == 'Either') {
            if (flat.picked !== null) object.object = this.inflate(flat.object, object['pick' + flat.picked]())

        } else if (type == 'Formula') {
            object.function = new Function('return ' + flat)()

        } else {
            if (flat.type != type) {
                const impl = object.constructor.abstracting.find(a => a.name == flat.type)
                object = new impl
            }
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

    get(id) {
        return this.registrations.find(o => o.id == id).object
    }

    put(id, object) {
        this.registrations.push({ id, object })
    }
}

module.exports = {
    Storing,
    Loading
}