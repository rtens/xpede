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

function combine(indicators) {
    const ats = [...new Set(indicators.reduce((acc, i) => [
        ...acc,
        ...i.status().getAll().map(s => s.at.get().toISOString())
    ], []))]
    ats.sort()

    const status = Many.of(Datum)
    ats
        .map(at => new Date(at))
        .forEach(at => status.add().create(d => {
            d.at.set(at)
            d.value.set(Math.min(...indicators
                .map(i => i.statusOn(at))
                .filter(s => s.exists())
                .map(s => s.get().value.get())))
        }))

    return status
}

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
        if (!this.ok.exists()) return super.status()
        if (!this.good.exists()) return super.status()
        if (!this.metric.exists()) return super.status()

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
}

class Derived extends Metric {
    constructor() {
        super()
        this.formula = Formula.for(Value.of(Number))
        this.inputs = Map.of(Metric)
    }
}
extend(Derived, Metric)

class Measured extends Metric {
    constructor() {
        super()
        this.facts = Many.of(Datum)
        this.frequency = Value.of(Number)
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