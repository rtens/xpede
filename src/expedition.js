const { Value, One, Many, Map, Formula, extend } = require('./model')

class Expedition {
    constructor() {
        this.name = Value.of(String)
        this.mountains = Many.of(Mountain)
    }

    status() {
        return {
            name: this.name.get(),
            mountains: this.mountains.getAll()
                .map(m => m.status())
        }
    }

    dueMetrics() {
        const due = this.mountains.getAll()
        .reduce((acc, m) => [...acc, ...m.metrics()], [])
        .filter(m => m.isDue())

        return due.filter((e, i) => due.map(d => d).indexOf(e) === i)
    }
}

class Mountain {
    constructor() {
        this.name = Value.of(String)
        this.reason = Value.of(String)

        this.goals = Many.of(Goal)
        this.indicators = Many.of(Indicator)
    }

    status() {
        return {
            name: this.name.get(),
            reason: this.reason.get(),
            goals: this.goals.getAll()
                .map(g => g.status()),
            indicators: this.indicators.getAll()
                .map(i => i.status())
        }
    }

    metrics() {
        return [
            ...this.goals.getAll().reduce((acc, g) => [...acc, ...g.metrics()], []),
            ...this.indicators.getAll().reduce((acc, i) => [...acc, ...i.metrics()], []),
        ]
    }
}

class Goal {
    constructor() {
        this.caption = Value.of(String)
        this.description = Value.of(String)

        this.criteria = Many.of(Indicator)
    }

    status() {
        return {
            caption: this.caption.get(),
            description: this.description.get(),
            criteria: this.criteria.getAll()
                .map(i => i.status())
        }
    }

    metrics() {
        return this.criteria.getAll().reduce((acc, i) => [...acc, ...i.metrics()], [])
    }
}

class Indicator {
    constructor() {
        this.caption = Value.of(String)
        this.description = Value.of(String)
        this.ok = Value.of(Number)
        this.good = Value.of(Number)

        this.metric = One.of(Metric)
    }

    status() {
        return {
            caption: this.caption.get(),
            description: this.description.get(),
            ok: this.ok.get(),
            good: this.good.get(),
            metric: this.metric.ifThere(m => m.status())
        }
    }

    metrics() {
        return this.metric.ifEither(m => m.metrics(), () => [])
    }
}

class Metric {
    constructor() {
        this.caption = Value.of(String)
        this.description = Value.of(String)
    }

    status() {
        return {
            caption: this.caption.get(),
            description: this.description.get(),
            data: this.data().getAll().map(d => d.flat())
        }
    }

    data() {
        return Many.of(Datum)
    }

    datumOn(date) {
        return this.data()
            .select(l => l.get().at.get() <= date)
            .last()
    }

    dataBetween(start, end) {
        return this.data()
            .select(l =>
                l.get().at.get() > start
                && l.get().at.get() <= end)
    }

    metrics() {
        return [this]
    }

    isDue() {
        return false
    }
}

class Measured extends Metric {
    constructor() {
        super()
        this.frequency = Value.of(Number)
        this.source = One.of(Source)
        this.facts = Many.of(Datum)
    }

    data() {
        return this.facts
    }

    measure(date, value) {
        this.facts.add().create(d => {
            d.at.set(date)
            d.value.set(value)
        })
    }

    isDue() {
        if (!this.frequency.exists()) return false

        const last = this.data().last()
        return !last.exists() || last.get().at.get() < new Date(new Date().getTime() - this.frequency.get())
    }
}
extend(Measured, Metric)

class Derived extends Metric {
    constructor() {
        super()
        this.inputs = Map.of(Metric)
        this.formula = Formula.for(Value.of(Number))
    }

    data() {
        const data = Many.of(Datum)
        this.dates().forEach(date => {
            try {
                const inputs = {}
                this.inputs.keys().forEach(k => inputs[k] = this.inputs.at(k).get())
                this.formula.execute(inputs, date)
                    .ifThere(result =>
                        data.add().create(d => {
                            d.at.set(date)
                            d.value.set(result)
                        }))
            } catch (e) {
                // console.error('Error in [' + this.caption.get() + '] for [' + date.toISOString() + ']: ' + e)
            }
        })
        return data
    }

    dates() {
        const dates = []
        this.inputs.values().forEach(m => m.get().data().getAll()
            .forEach(l => dates.push(l.at.get())))
        dates.sort((a, b) => a - b)
        const makeUnique = (e, i) => dates.map(d => d.toISOString()).indexOf(e.toISOString()) === i
        return dates.filter(makeUnique)
    }

    metrics() {
        return [
            this,
            ...this.inputs.values().reduce((acc, i) => [...acc, ...i.get().metrics()], [])
        ]
    }
}
extend(Derived, Metric)

class Smoothed extends Metric {
    constructor() {
        super()
        this.window = Value.of(Number)
        this.input = One.of(Metric)
    }

    data() {
        const data = Many.of(Datum)
        if (!this.input.exists()) return data

        const window = this.window.get()

        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const start = new Date(date.getTime() - window)

            const acc = this.input.get().dataBetween(start, date).getAll()
                .reduce((acc, i) =>
                    ({ sum: acc.sum + i.value.get(), n: acc.n + 1 }),
                    { sum: 0, n: 0 })

            data.add().create(d => {
                d.at.set(date)
                d.value.set(acc.sum / acc.n)
            })
        })
        return data
    }

    metrics() {
        return [
            this,
            ...this.input.ifEither(m => m.metrics(), () => [])
        ]
    }
}
extend(Smoothed, Metric)

class Chunked extends Metric {
    constructor() {
        super()
        this.start = Value.of(Date)
        this.size = Value.of(Number)
        this.input = One.of(Metric)
    }

    data() {
        const data = Many.of(Datum)
        if (!this.input.exists()) return data

        const size = this.size.get()
        this.dates().forEach(date => {
            const chunk = this.input.get()
                .dataBetween(new Date(date.getTime() - size), date)

            data.add().create(d => {
                d.at.set(date)
                d.value.set(chunk.getAll()
                    .reduce((acc, i) => acc + i.value.get(), 0))
            })
        })
        return data
    }

    dates() {
        const size = this.size.get()

        const lastDate = this.input.get().data().last().ifEither(d => d.at.get(), () => new Date())
        const untilDate = new Date(Math.min(new Date().getTime(), lastDate.getTime() + size))
        const dates = []
        let date = this.start.get()
        while (date <= untilDate) {
            dates.push(date)
            date = new Date(date.getTime() + size)
        }
        return dates
    }

    metrics() {
        return [
            this,
            ...this.input.ifEither(m => m.metrics(), () => [])
        ]
    }
}
extend(Chunked, Metric)

class Datum {
    constructor() {
        this.at = Value.of(Date)
        this.value = Value.of(Number)
    }

    flat() {
        return {
            at: this.at.get(),
            value: this.value.get()
        }
    }
}

class Source {
    constructor() {
        this.name = Value.of(String)
    }
}

class External extends Source { }
extend(External, Source)

class Website extends Source {
    constructor() {
        super()
        this.url = Value.of(String)
    }
}
extend(Website, Source)

module.exports = Expedition
