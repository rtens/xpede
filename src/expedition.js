const { Value, One, Many, Map, Reference, Either, Formula, extend } = require('./model')

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
}

class Mountain {
    constructor() {
        this.name = Value.of(String)
        this.reason = Value.of(String)

        this.goals = Many.of(Goal)
        this.indicators = Many.of(Either.of(One.of(Indicator), Reference.to(Indicator)))
    }

    status() {
        return {
            name: this.name.get(),
            reason: this.reason.get(),
            indicators: this.indicators.getAll()
                .map(i => i.get().status())
        }
    }
}

class Goal {
    constructor() {
        this.caption = Value.of(String)
        this.description = Value.of(String)

        this.indicators = Many.of(Indicator)
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
            metric: this.metric.ifThere(m => m.info()),
            status: this.metric.ifEither(
                m => m.data().getAll().map(d => this.withScore(d)),
                () => [])
        }
    }

    withScore(datum) {
        return {
            at: datum.at.get(),
            value: datum.value.get(),
            score: this.scoreOf(datum.value.get())
        }
    }

    scoreOf(value) {
        const ok = this.ok.get()
        const good = this.good.get()

        return (value - ok) / (good - ok)
    }
}

class Metric {
    constructor() {
        this.caption = Value.of(String)
        this.description = Value.of(String)
    }

    info() {
        return {
            caption: this.caption.get(),
            description: this.description.get()
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
}
extend(Measured, Metric)

class Combined extends Metric {
    constructor() {
        super()
        this.inputs = Map.of(Metric)
        this.formula = Formula.for(Value.of(Number))
    }

    data() {
        const data = Many.of(Datum)
        this.dates().forEach(date => {
            try {
                this.formula.execute(this.inputs.all(), date)
                    .ifThere(result =>
                        data.add().create(d => {
                            d.at.set(date)
                            d.value.set(result)
                        }))
            } catch (e) {
                console.error('Error while executing formula:' + e)
            }
        })
        return data
    }

    dates() {
        const dates = []
        this.inputs.values().forEach(m => m.get().data().getAll()
            .forEach(l => dates.push(l.at.get())))
        dates.sort((a, b) => a - b)
        const makeUnique = (e, i) => dates.map(d => d.toISOString()).indexOf(e.toISOString()) == i
        return dates.filter(makeUnique)
    }
}
extend(Combined, Metric)

class Smoothed extends Metric {
    constructor() {
        super()
        this.window = Value.of(Number)
        this.input = One.of(Metric)
    }

    data() {
        const window = this.window.get()

        const data = Many.of(Datum)
        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const start = new Date(date.getTime() - window)

            const acc = this.input.get().dataBetween(start, date).getAll()
                .reduce((acc, i) =>
                    ({ sum: atcc.sum + i.value.get(), n: acc.n + 1 }),
                    { sum: 0, n: 0 })

            data.add().create(d => {
                d.at.set(date)
                d.value.set(acc.sum / acc.n)
            })
        })
        return data
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
        const size = this.size.get()
        const data = Many.of(Datum)
        this.dates().forEach(date => {
            const chunk = this.input.get()
                .dataBetween(new Date(date.getTime() - size), date)
            if (chunk.isEmpty()) return

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

        const lastDate = new Date()
        const dates = []
        let date = this.start.get()
        while (date <= lastDate) {
            dates.push(date)
            date = new Date(date.getTime() + size)
        }
        return dates
    }
}
extend(Chunked, Metric)

class Datum {
    constructor() {
        this.at = Value.of(Date)
        this.value = Value.of(Number)
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