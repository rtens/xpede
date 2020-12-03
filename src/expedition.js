const { Value, One, Many, Map, Reference, Formula, extend } = require('./model')

class Expedition {
    constructor() {
        this.mountains = Many.of(Mountain)
    }

    dueMetrics() {
        return this.mountains.getAll()
            .reduce((acc, m) => [
                ...acc,
                ...m.summit.get().dimensions.getAll()
                    .filter(d => d instanceof Metric)
                    .filter(d => d.isDue())
            ], [])
    }

    status() {
        return this.mountains.getAll()
            .map(m => m.status())
    }

    goals() {
        return this.mountains.getAll()
            .map(m => m.goals())
    }
}

class Mountain {
    constructor() {
        this.name = Value.of(String)
        this.reason = Value.of(String)

        this.summit = One.of(Goal)
        this.indicators = Many.of(Indicator)
    }

    status() {
        return {
            name: this.name.get(),
            summit: this.summit.get().description.get(),
            indicators: this.indicators.getAll()
                .map(i => i.status())
        }
    }

    goals() {
        return {
            name: this.name.get(),
            reason: this.reason.get(),
            summit: this.summit.get().status()
        }
    }
}

class Goal {
    constructor() {
        this.summary = Value.of(String)
        this.description = Value.of(String)

        this.coordinates = Many.of(Coordinate)

        this.dimensions = Many.of(Dimension)
    }

    status() {
        return {
            summary: this.summary.get(),
            description: this.description.get(),
            coordinates: this.coordinates.getAll()
                .map(c => c.status())
        }
    }
}

class Coordinate {
    constructor() {
        this.summary = Value.of(String)
        this.description = Value.of(String)
        this.targets = Many.of(LocationTarget)
    }

    status() {
        return {
            summary: this.summary.get(),
            description: this.description.get(),
            target: this.targets.last().get().status()
        }
    }
}

class Indicator {

    status() {
        return 'Not implemented for ' + this.constructor.name
    }
}

class CoordinateIndicator extends Indicator {
    constructor() {
        super()
        this.coordinate = Reference.to(Coordinate)
    }

    status() {
        return {
            type: this.constructor.name,
            ...this.coordinate.get().status()
        }
    }
}
extend(CoordinateIndicator, Indicator)

class TargetIndicator extends Indicator {
    constructor() {
        super()
        this.summary = Value.of(String)
        this.description = Value.of(String)

        this.targets = Many.of(Target)
    }

    status() {
        return {
            type: this.constructor.name,
            summary: this.summary.get(),
            description: this.description.get(),
            target: this.targets.last().get().status()
        }
    }
}
extend(TargetIndicator, Indicator)

class Target {
    constructor() {
        this.since = Value.of(Date)
    }

    status() {
        return 'Not implemented for ' + this.constructor.name
    }
}

class LocationTarget extends Target {
    constructor() {
        super()
        this.good = Value.of(Number)
        this.great = Value.of(Number)

        this.dimension = Reference.to(Dimension)
    }

    status() {
        return {
            type: this.constructor.name,
            dimension: this.dimension.get(d => d.info()),
            good: this.good.get(),
            great: this.great.get(),
            history: this.dimension.get(d => d.locations().all(), () => [])
                .map(l => this.statusOf(l))
        }
    }

    statusOf(location) {
        if (!location.exists()) return {}
        location = location.get()

        const good = this.good.get()
        const great = this.great.get()

        const date = location.at.get()
        const value = location.value.get()

        const score = (value - good) / (great - good)

        return { date, value, score }
    }
}
extend(LocationTarget, Target)

class ArrivalTarget extends Target {
    constructor() {
        super()
        this.good = Value.of(Date)
        this.great = Value.of(Date)

        this.coordinate = Reference.to(Coordinate)
    }

    status() {
        const coordinate = this.coordinate.get()
        const target = coordinate.targets.last().get()
        const dimension = target.dimension.get()
        const locations = dimension.locations()

        return {
            type: this.constructor.name,
            dimension: dimension.info(),
            value: target.good.get(),
            good: this.good.get(),
            great: this.great.get(),
            history: locations.all()
                .map((l, i) => this.statusOf(locations.at(i - 1), l))
        }
    }

    statusOf(first, second) {
        if (!first.exists() || !second.exists()) return {}
        first = first.get()
        second = second.get()

        const good = this.good.get()
        const great = this.great.get()

        const date = second.at.get()
        const value = this.eta(first, second)
        const score = value ? (value - good) / (great - good) : null

        return { date, value, score }
    }

    eta(first, second) {
        const target = this.coordinate.get().targets.last().get()

        const timeDiff = second.at.get() - first.at.get()
        const valueDiff = second.value.get() - first.value.get()
        const valueLeft = target.good.get() - second.value.get()

        const slope = valueDiff / timeDiff
        const timeLeft = valueLeft / slope

        if (timeLeft < 0) return null
        return new Date(second.at.get().getTime() + timeLeft)
    }
}
extend(ArrivalTarget, Target)

class Dimension {
    constructor() {
        this.summary = Value.of(String)
        this.description = Value.of(String)
    }

    info() {
        return {
            summary: this.summary.get(),
            description: this.description.get()
        }
    }

    locations() {
        return Many.of(Location)
    }

    locationOn(date) {
        return this.locations()
            .select(l => l.get().at.get() <= date)
            .last()
    }

    locationsBetween(start, end) {
        return this.locations()
            .select(l =>
                l.get().at.get() > start
                && l.get().at.get() <= end)
    }

    history() {
        return this.locations().getAll()
            .reduce((acc, l) => ({
                ...acc,
                [l.at.get().toISOString()]: l.value.get()
            }), {})
    }
}

class Derivative extends Dimension {
    constructor() {
        super()
        this.input = Map.of(Reference.to(Dimension))
        this.formula = Formula.of(Value.of(Number))
    }

    dates() {
        const dates = []
        this.input.values().forEach(d => d.get().locations().getAll()
            .forEach(l => dates.push(l.at.get())))
        dates.sort((a, b) => a - b)
        return dates.filter((e, i) =>
            dates.map(d => d.toISOString()).indexOf(e.toISOString()) == i)
    }

    locations() {
        const locations = Many.of(Location)
        this.dates().forEach(date => {
            try {
                const result = this.formula.result(this.input.all(), date)

                if (!result.exists()) return
                locations.add().create(l => {
                    l.at.set(date)
                    l.value.set(result.get())
                })
            } catch { }
        })
        return locations
    }
}
extend(Derivative, Dimension)

class Aggregator extends Derivative {
    constructor() {
        super()
        this.start = Value.of(Date)
        this.frequency = Value.of(Number)
    }

    dates() {
        const dates = []
        let date = this.start.get()
        while (date < new Date()) {
            dates.push(date)
            date = new Date(date.getTime() + this.frequency.get())
        }
        return dates
    }
}
extend(Aggregator, Dimension)

class Metric extends Dimension {
    constructor() {
        super()
        this.frequency = Value.of(Number)
        this.source = One.of(Source)
        this.measurements = Many.of(Measurement)
    }

    addMeasurement(value, date) {
        const m = this.measurements.add().create()
        m.at.set(date || new Date())
        m.value.set(value)
    }

    locations() {
        return this.measurements
    }

    isDue() {
        if (!this.frequency.exists()) return false

        const last = this.measurements.last()
        if (!last.exists()) return true

        return new Date(last.get().at.get().getTime() + this.frequency.get()) < new Date()
    }
}
extend(Metric, Dimension)

class Location {
    constructor() {
        this.at = Value.of(Date)
        this.value = Value.of(Number)
    }
}

class Measurement extends Location {
    constructor() {
        super()
    }
}

class Source {
    constructor() {
        this.name = Value.of(String)
    }
}

class App extends Source { }
extend(App, Source)

class Website extends Source {
    constructor() {
        super()
        this.url = Value.of(String)
    }
}
extend(Website, Source)

module.exports = Expedition

// const re = () => {delete require.cache[require.resolve('./expedition.js')]; delete require.cache[require.resolve('./model.js')]; return new (require('./expedition.js'))}