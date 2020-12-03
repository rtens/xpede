const { specify, assert } = require('./spec')
const Expedition = require('./expedition')

specify('Sum of Metrics', () => {
    const goal = new Expedition()
        .mountains.add().create()
        .summit.create()

    let metric1 = goal.dimensions.add().createMetric()
    let metric2 = goal.dimensions.add().createMetric()

    const derivative = goal.dimensions.add().createDerivative(d => {
        d.input.put('one').point(metric1)
        d.input.put('two').point(metric2)

        d.formula.create((value, { one, two }, date) => {
            const location = m => m.get().locationOn(date)
                .get(l => l.value.get(), () => 0)

            value.set(location(one) + location(two))
        })
    })

    metric1.addMeasurement(21, new Date('2011-12-11'))
    metric2.addMeasurement(12, new Date('2011-12-12'))
    metric1.addMeasurement(33, new Date('2011-12-13'))
    metric1.addMeasurement(14, new Date('2011-12-14'))
    metric2.addMeasurement(25, new Date('2011-12-15'))

    assert.equal(derivative.locations().getAll().map(l => [l.at.get(), l.value.get()]), [
        ['2011-12-11T00:00:00.000Z', 21 + 0],
        ['2011-12-12T00:00:00.000Z', 21 + 12],
        ['2011-12-13T00:00:00.000Z', 33 + 12],
        ['2011-12-14T00:00:00.000Z', 14 + 12],
        ['2011-12-15T00:00:00.000Z', 14 + 25],
    ])
})

specify('Sum of locations', () => {
    const goal = new Expedition()
        .mountains.add().create()
        .summit.create()

    let metric = goal.dimensions.add().createMetric()

    const derivative = goal.dimensions.add().createDerivative(d => {
        d.summary.set('foo')
        d.input.put('one').point(metric)

        d.formula.create((value, { one }, date) => {
            const start = new Date(date - 3 * 24 * 3600 * 1000)

            value.set(
                one.get().locationsBetween(start, date)
                    .getAll().reduce((acc, l) => acc + l.value.get(), 0))
        })
    })

    metric.addMeasurement(1, new Date('2011-12-11'))
    metric.addMeasurement(2, new Date('2011-12-12'))
    metric.addMeasurement(3, new Date('2011-12-13'))
    metric.addMeasurement(4, new Date('2011-12-14'))
    metric.addMeasurement(5, new Date('2011-12-15'))

    assert.equal(derivative.locations().getAll().map(l => [l.at.get(), l.value.get()]), [
        ['2011-12-11T00:00:00.000Z', 1],
        ['2011-12-12T00:00:00.000Z', 1 + 2],
        ['2011-12-13T00:00:00.000Z', 1 + 2 + 3],
        ['2011-12-14T00:00:00.000Z', 2 + 3 + 4],
        ['2011-12-15T00:00:00.000Z', 3 + 4 + 5],
    ])
})