const { Value, One, Many, Map, Formula, extend } = require('../model')
const Party = require('./party')

let cache = false

class Signal {
    constructor() {
        this.name = Value.of(String)
        this.description = Value.of(String)
    }

    status() {
        return Many.of(Status)
    }

    statusOn(date) {
        if (!this._statusOn) this._statusOn = {}
        if (cache && this._statusOn[date]) return this._statusOn[date]

        this._statusOn[date] = this.status()
            .select(l => l.get().at.get() <= date)
            .last()

        return this._statusOn[date]
    }
}

class Status {
    constructor() {
        this.at = Value.of(Date)
        this.score = Value.of(Number)
    }
}

class Expedition extends Signal {
    constructor() {
        super()

        this.summit = One.of(Goal)
        this.waypoints = Many.of(Goal)

        this.stakeholders = Many.of(Party)
        this.participants = Many.of(Party)
    }

    status() {
        if (cache && this._status) return this._status

        const goals = this.waypoints.getAll()
        if (this.summit.exists()) goals.push(this.summit.get())

        this._status = combine(goals)
        return this._status
    }

    withCaching(active = true) {
        cache = active
        return this
    }
}
module.exports = Expedition

class Goal extends Signal {
    constructor() {
        super()

        this.coordinates = Many.of(Coordinate)
        this.pace = Many.of(Indicator)
        this.subs = Many.of(Goal)
    }

    status() {
        if (cache && this._status) return this._status

        this._status = combine([
            ...this.subs.getAll(),
            ...this.pace.getAll(),
            ...this.coordinates.getAll()
                .filter(c => c.locked.get() && c.indicator.exists())
                .map(c => c.indicator.get())
        ])

        return this._status
    }

    isReached() {
        return !(this.coordinates.isEmpty() && this.subs.isEmpty())
            && this.coordinates.getAll().reduce((acc, i) => acc && !!i.locked.get(), true)
            && this.subs.getAll().reduce((acc, i) => acc && i.isReached(), true)
    }
}

class Coordinate {
    constructor() {
        this.locked = Value.of(Boolean)
        this.indicator = One.of(Indicator)
    }
}

class Indicator extends Signal {
    constructor() {
        super()
    }
}

class Target extends Indicator {
    constructor() {
        super()
        this.good = Value.of(Number)
        this.bad = Value.of(Number)

        this.metric = One.of(Metric)
    }

    status() {
        if (cache && this._status) return this._status

        if (!this.bad.exists() ||
            !this.good.exists() ||
            !this.metric.exists()) {
            this._status = super.status()
        } else {
            this._status = this.metric.get().data()
                .mapTo(Status, (i, o) =>
                    o.create(d => {
                        d.at.set(i.at.get())
                        d.score.set(this.score(i.value))
                    }))
        }

        return this._status
    }

    score(value) {
        return (value.get() - this.bad.get()) / (this.good.get() - this.bad.get())
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
        if (!this._datumOn) this._datumOn = {}
        if (cache && this._datumOn[date]) return this._datumOn[date]

        this._datumOn[date] = this.data()
            .select(l => l.get().at.get() <= date)
            .last()

        return this._datumOn[date]
    }

    dataBetween(start, end) {
        if (!this._dataBetween) this._dataBetween = {}
        if (cache && this._dataBetween[start + '-' + end]) return this._dataBetween[start + '-' + end]

        this._dataBetween[start + '-' + end] = this.data()
            .select(l =>
                l.get().at.get() > start
                && l.get().at.get() <= end)

        return this._dataBetween[start + '-' + end]
    }
}

class Datum {
    constructor() {
        this.at = Value.of(Date)
        this.value = Value.of(Number)
    }
}

class Derived extends Metric {
    constructor() {
        super()
        this.formula = Formula.for(Value.of(Number))
        this.inputs = Map.of(Metric)
    }

    data() {
        if (cache && this._data) return this._data

        this._data = Many.of(Datum)
        dates(this.inputs.values(), i => i.get().data()).forEach(date => {
            try {
                this.formula.execute(date, this._inputMap())
                    .ifThere(result =>
                        this._data.add().create(d => {
                            d.at.set(date)
                            d.value.set(result)
                        })
                    )
            } catch (e) {
                // console.error('Error in [' + this.name.get() + '] for [' + date.toISOString() + ']: ' + e)
            }
        })
        return this._data
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
        if (cache && this._data) return this._data

        this._data = Many.of(Datum)
        if (!this.input.exists() ||
            !this.window.exists()) return this._data

        const window = this.window.get().millis()

        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const begin = new Date(date.getTime() - window)

            const values = this.input.get().dataBetween(begin, date).getAll()
                .map(d => d.value.get())

            this._data.add().create(d => {
                d.at.set(date)
                d.value.set(values.reduce((sum, i) => sum + i, 0) / values.length)
            })
        })

        return this._data
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
        if (cache && this._data) return this._data

        this._data = Many.of(Datum)
        if (!this.input.exists() ||
            !this.window.exists() ||
            !this.unit.exists()) return this._data

        const window = this.window.get().millis()
        const unit = this.unit.get().millis()

        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const begin = new Date(date.getTime() - window)

            const sum = this.input.get().dataBetween(begin, date).getAll()
                .reduce((sum, d) => sum + d.value.get(), 0)

            this._data.add().create(d => {
                d.at.set(date)
                d.value.set(sum / window * unit)
            })
        })
        return this._data
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
        if (cache && this._data) return this._data

        this._data = Many.of(Datum)
        if (!this.input.exists() ||
            !this.window.exists()) return this._data

        const window = this.window.get().millis()

        this.input.get().data().getAll().forEach(datum => {
            const date = datum.at.get()
            const begin = new Date(date.getTime() - window)
            const then = this.input.get().datumOn(begin)

            if (!then.exists()) return

            const diff = this.input.get().datumOn(date).get().value.get() -
                then.get().value.get()

            this._data.add().create(d => {
                d.at.set(date)
                d.value.set(diff)
            })
        })
        return this._data
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
        this.frequency = One.of(Span)
        this.source = One.of(Source)
        this.facts = Many.of(Datum)
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



function combine(signals) {
    const status = Many.of(Status)
    dates(signals, s => s.status())
        .forEach(at => status.add().create(d => {
            d.at.set(at)
            d.score.set(Math.min(...signals
                .map(s => s.statusOn(at))
                .filter(s => s.exists())
                .map(s => s.get().score.get())))
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