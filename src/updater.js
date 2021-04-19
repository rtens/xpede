const { Loading, Storing } = require('./persistence')
const { updateDashboard } = require('./dashboard')
const Expedition = require('./aggregates/expedition')

class Updater {
    constructor(expeditions) {
        this.expeditions = expeditions
    }

    findDueMetrics() {
        const expeditions = this.expeditions.all()

        const uniques = []
        const metrics = []
        Object.keys(expeditions).forEach(e => {
            flatten(expeditions[e].metrics())
                .filter(({ metric }) => metric.isDue())
                .forEach(({ path, metric }) => {
                    if (uniques.indexOf(metric) + 1) return
                    uniques.push(metric)
                    
                    metrics.push(mapMetric(e, path, metric))
                })
        })
        return metrics
    }

    addFact({ expedition, path, at, value }) {
        const e = this.expeditions.all()[expedition]

        const metrics = flatten(e.metrics())
            .reduce((acc, m) => ({ ...acc, [JSON.stringify(m.path)]: m.metric }), {})

        const metric = metrics[JSON.stringify(path)]

        metric.facts.add().create(f => {
            f.at.set(at.length ? new Date(at) : new Date())
            f.value.set(parseValue(metric.source, value))
        })

        this.expeditions.save(expedition, e)
    }
}
module.exports = Updater

function flatten(metric, path = []) {
    switch (metric.constructor.name) {
        case 'Measured': return [{ path, metric }]
        case 'Object': return Object.keys(metric).reduce((acc, k) =>
            [...acc, ...flatten(metric[k], [...path, k])], []
        )
        case 'Array': return metric.reduce((acc, m, i) =>
            [...acc, ...flatten(m, [...path, i])], []
        )
    }
}

function mapMetric(expedition, path, m) {
    return {
        expedition,
        path,
        name: m.name.get(),
        description: m.description.get(),
        source: mapSource(m.source),
        facts: m.facts.getAll().map(f => ({
            at: f.at.get(),
            value: f.value.get()
        }))
    }
}

function mapSource(s) {
    if (!s.exists()) return

    switch (s.get().constructor.name) {
        case 'Manual':
            return {
                type: 'Manual',
                instructions: s.get().instructions.get(),
                hint: hintFor(s.get().type.get())
            }
    }
}

function parseValue(source, value) {
    if (!source.exists()) return value

    switch (source.get().type.get()) {
        case 'Number':
            return parseFloat(value.replace(',', '.'))
        case 'Date':
        case 'DateTime':
            return new Date(value)
        case 'Hours':
            return new Date('1970-01-01 ' + value + ' Z').getTime() / 3600000
        case 'Minutes':
            return new Date('1970-01-01 00:' + value + ' Z').getTime() / 60000
        default:
            return value
    }
}

function hintFor(type) {
    switch (type) {
        case 'Date':
            return 'Date (YYYY-MM-TT)'
        case 'DateTime':
            return 'Date and time (YYYY-MM-TT HH:MM:SS)'
        case 'Hours':
            return 'Hours (HH:MM:SS)'
        case 'Minutes':
            return 'Minutes (MM:SS)'
        case 'Number':
            return 'Number'
        default:
            return 'Value'
    }
}

class Expeditions {
    constructor(files) {
        this.files = files
    }

    all() {
        return this.files
            .split('\n')
            .reduce((acc, f) => ({
                ...acc,
                [f]: this.get(f)
            }), {})
    }

    get(file) {
        return Loading
            .fromFile(file)
            .inflated(new Expedition)
    }

    save(file, expedition) {
        new Storing(expedition).toFile(file)
        updateDashboard()
    }
}

if (require.main === module) {
    const express = require('express')

    const app = express()
    app.use(express.json())
    const port = 19747

    const updater = new Updater(new Expeditions(process.env.FILES))
    updateDashboard()

    app.use('/', express.static('updater'))

    app.get('/due-metrics', (req, res) => {
        res.send(updater.findDueMetrics())
    })

    app.post('/add-fact', (req, res) => {
        console.log('Add fact', req.body.expedition, req.body.path.join('/'), req.body.at, req.body.value)
        updater.addFact(req.body)
        res.status(200).send({ success: true })
    })

    app.listen(port, () => {
        console.log()
        console.log(`Open http://localhost:${port} to update due metrics`)
        console.log('Press ENTER to exit');
        process.stdin.once('data', function () {
            process.exit(0)
        });
    })
}