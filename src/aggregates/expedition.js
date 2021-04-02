const { Value, One, Many, Map, Formula, extend } = require('../model')
const Party = require('./party')

class Expedition {
    constructor() {
        this.name = Value.of(String)

        this.stakeholders = Many.of(Party)
        this.participants = Many.of(Party)

        this.summit = One.of(Goal)
        this.waypoints = Many.of(Goal)
    }

    status() {
        const goals = this.waypoints.getAll()
        if (this.summit.exists()) goals.push(this.summit.get())

        return combine(goals)
    }
}
module.exports = Expedition

class Datum {
    constructor() {
        this.at = Value.of(Date)
        this.value = Value.of(Number)
    }
}

class Indicator {
    constructor() {
        this.name = Value.of(String)
        this.description = Value.of(String)
    }

    status() {
        return Many.of(Datum)
    }

    statusOn(at) {
        const status = this.status()
        if (status.isEmpty()) return One.of(Datum)

        return status.all()
            .filter(s => s.get().at.get() <= at)
            .reduce((found, next) =>
                found.get().at.get() > next.get().at.get() ? found : next,
                status.at(0))
    }
}

class Goal extends Indicator {
    constructor() {
        super()
        this.location = Many.of(Indicator)
        this.progress = Many.of(Indicator)
    }

    status() {
        if (!this.progress.isEmpty()) return combine(this.progress.getAll())
        if (!this.location.isEmpty()) return combine(this.location.getAll())

        return super.status()
    }
}
extend(Goal, Indicator)

class Target extends Indicator {
    constructor() {
        super()
        this.ok = Value.of(Number)
        this.good = Value.of(Number)

        this.metric = One.of(Metric)
    }

    status() {
        if (!this.ok.exists() ||
            !this.good.exists() ||
            !this.metric.exists()) return super.status()

        return this.metric.get().data().mapTo(Datum, (i, o) => o.create(d => {
            d.at.set(i.at.get())
            d.value.set(this.score(i.value))
        }))
    }

    score(value) {
        return (value.get() - this.ok.get()) / (this.good.get() - this.ok.get())
    }
}
extend(Target, Indicator)

class Metric {
    constructor() {
        this.name = Value.of(String)
        this.description = Value.of(String)
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

class Derived extends Metric {
    constructor() {
        super()
        this.formula = Formula.for(Value.of(Number))
        this.inputs = Map.of(Metric)
    }

    data() {
        const data = Many.of(Datum)
        dates(this.inputs.values(), i => i.get().data()).forEach(date => {
            try {
                this.formula.execute(date, this._inputMap())
                    .ifThere(result =>
                        data.add().create(d => {
                            d.at.set(date)
                            d.value.set(result)
                        })
                    )
            } catch (e) {
                // console.error('Error in [' + this.name.get() + '] for [' + date.toISOString() + ']: ' + e)
            }
        })
        return data
    }

    _inputMap() {
        const inputs = {}
        this.inputs.keys().forEach(k => inputs[k] = this.inputs.at(k).get())
        return inputs
    }
}
extend(Derived, Metric)

class Smoothed extends Metric {
    constructor() {
        super()
        this.window = One.of(Span)
        this.input = One.of(Metric)
    }

    data() {
        const data = Many.of(Datum)
        if (!this.input.exists() ||
            !this.window.exists()) return data

        const window = this.window.get().millis()

        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const begin = new Date(date.getTime() - window)

            const values = this.input.get().dataBetween(begin, date).getAll()
                .map(d => d.value.get())

            data.add().create(d => {
                d.at.set(date)
                d.value.set(values.reduce((sum, i) => sum + i, 0) / values.length)
            })
        })
        return data
    }
}
extend(Smoothed, Metric)

class Averaged extends Metric {
    constructor() {
        super()
        this.window = One.of(Span)
        this.unit = One.of(Span)
        this.input = One.of(Metric)
    }

    data() {
        const data = Many.of(Datum)
        if (!this.input.exists() ||
            !this.window.exists() ||
            !this.unit.exists()) return data

        const window = this.window.get().millis()
        const unit = this.unit.get().millis()

        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const begin = new Date(date.getTime() - window)

            const sum = this.input.get().dataBetween(begin, date).getAll()
                .reduce((sum, d) => sum + d.value.get(), 0)

            data.add().create(d => {
                d.at.set(date)
                d.value.set(sum / window * unit)
            })
        })
        return data
    }
}
extend(Averaged, Metric)

class Difference extends Metric {
    constructor() {
        super()
        this.window = One.of(Span)
        this.input = One.of(Metric)
    }

    data() {
        const data = Many.of(Datum)
        if (!this.input.exists() ||
            !this.window.exists()) return data

        const window = this.window.get().millis()

        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const begin = new Date(date.getTime() - window)
            const then = this.input.get().datumOn(begin)

            if (!then.exists()) return

            const diff = this.input.get().datumOn(date).get().value.get() - 
                then.get().value.get()
                
            data.add().create(d => {
                d.at.set(date)
                d.value.set(diff)
            })
        })
        return data
    }
}
extend(Difference, Metric)

class Span {
    constructor() {
        this.weeks = Value.of(Number)
        this.days = Value.of(Number)
        this.hours = Value.of(Number)
    }

    millis() {
        return this.hours.get(0) * 3600 * 1000
            + this.days.get(0) * 24 * 3600 * 1000
            + this.weeks.get(0) * 7 * 24 * 3600 * 1000
    }
}

class Measured extends Metric {
    constructor() {
        super()
        this.facts = Many.of(Datum)
        this.frequency = One.of(Span)
        this.source = One.of(Source)
    }

    data() {
        return this.facts
    }
}
extend(Measured, Metric)

class Source {
    constructor() {
        this.name = Value.of(String)
    }
}

class Website extends Source {
    constructor() {
        super()
        this.url = Value.of(String)
        this.instructions = Value.of(String)
    }
}
extend(Website, Source)



function combine(indicators) {
    const status = Many.of(Datum)
    dates(indicators, i => i.status())
        .forEach(at => status.add().create(d => {
            d.at.set(at)
            d.value.set(Math.min(...indicators
                .map(i => i.statusOn(at))
                .filter(s => s.exists())
                .map(s => s.get().value.get())))
        }))

    return status
}

function dates(source, toData) {
    const map = {}
    source.forEach(i =>
        toData(i).getAll().forEach(d =>
            map[d.at.get().toISOString()] = true
        )
    )

    const dates = Object.keys(map)
    dates.sort()
    return dates.map(at => new Date(at))
}