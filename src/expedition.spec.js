const { specify, assert } = require('./spec')
const Expedition = require('./expedition')

specify('Expedition with Goals', () => {
    const e = new Expedition()
    e.name.set('Foo')

    const m = e.mountains.add().create()
    m.name.set('Bar')
    m.reason.set('Because foo')

    const g = m.goals.add().create()
    g.caption.set('Goal one')
    g.description.set('This is goal one')

    assert.equal(e.status().mountains, [
        {
            "name": "Bar",
            "reason": "Because foo",
            "goals": [{
                "caption": "Goal one",
                "description": "This is goal one",
                "criteria": []
            }],
            "indicators": []
        }
    ])

    const i = g.criteria.add().create()
    i.caption.set('Be Foo')
    i.description.set('Be a Foo not a Bar')
    i.ok.set(12)
    i.good.set(24)

    assert.equal(e.status().mountains[0].goals[0].criteria, [{
        "caption": "Be Foo",
        "description": "Be a Foo not a Bar",
        "ok": 12,
        "good": 24
    }])
})

specify('Expedition with Indicators', () => {
    const e = new Expedition()
    e.name.set('Foo')

    assert.equal(e.status(), {
        "name": "Foo",
        "mountains": []
    })

    const m = e.mountains.add().create()
    m.name.set('Bar')
    m.reason.set('Because foo')

    assert.equal(e.status().mountains, [
        {
            "name": "Bar",
            "reason": "Because foo",
            "goals": [],
            "indicators": []
        }
    ])

    const i = m.indicators.add().create()
    i.caption.set('Be Foo')
    i.description.set('Be a Foo not a Bar')
    i.ok.set(12)
    i.good.set(24)

    assert.equal(e.status().mountains[0].indicators, [{
        "caption": "Be Foo",
        "description": "Be a Foo not a Bar",
        "ok": 12,
        "good": 24
    }])

    const me = i.metric.createMeasured()
    me.caption.set('A Metric')
    me.description.set('Some Metric')
    me.source.createWebsite(s => s.url.set('example.com'))

    assert.equal(e.status().mountains[0].indicators[0].metric, {
        "caption": "A Metric",
        "description": "Some Metric",
        "data": []
    })

    me.measure(new Date('2020-11-12'), 0)
    me.measure(new Date('2020-11-13'), 18)
    me.measure(new Date('2020-11-14'), 30)

    assert.equal(e.status().mountains[0].indicators[0].metric.data, [
        { "at": "2020-11-12T00:00:00.000Z", "value": 0 },
        { "at": "2020-11-13T00:00:00.000Z", "value": 18 },
        { "at": "2020-11-14T00:00:00.000Z", "value": 30 }
    ])
})

specify('Indicator without thresholds', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().create(i => {
            i.metric.createMeasured(m => {
                m.measure(new Date('2020-11-12'), 10)
                m.measure(new Date('2020-11-13'), 3)
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].metric.data, [
        { at: '2020-11-12T00:00:00.000Z', value: 10 },
        { at: '2020-11-13T00:00:00.000Z', value: 3 },
    ])
})

specify('Combined Metric', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().create(i => {
            i.good.set(20)
            i.ok.set(10)
            i.metric.createDerived(m => {
                m.formula.set((value, { one, two }, date) => {
                    value.set(
                        one.datumOn(date).get().value.get()
                        + two.datumOn(date).get().value.get())
                })
                m.inputs.put('one').createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 10)
                })
                m.inputs.put('two').createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 3)
                    m.measure(new Date('2020-11-13'), 4)
                })
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].metric.data, [
        { at: '2020-11-12T00:00:00.000Z', value: 13 },
        { at: '2020-11-13T00:00:00.000Z', value: 14 },
    ])
})

specify('Smoothed Metric', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().create(i => {
            i.metric.createSmoothed(m => {
                m.window.set(2 * 24 * 3600 * 1000)
                m.input.createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 10)
                    m.measure(new Date('2020-11-13'), 11)
                    m.measure(new Date('2020-11-14'), 14)
                })
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].metric.data, [
        { at: '2020-11-12T00:00:00.000Z', value: 10 },
        { at: '2020-11-13T00:00:00.000Z', value: 10.5 },
        { at: '2020-11-14T00:00:00.000Z', value: 12.5 },
    ])
})

specify('Chunked Metric', () => {
    const daysAgo = d => new Date(new Date(new Date().getTime() - d * 24 * 3600 * 1000).toISOString().substring(0, 10))
    let measured

    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().create(i => {
            i.metric.createChunked(m => {
                m.start.set(daysAgo(24))
                m.size.set(7 * 24 * 3600 * 1000)
                measured = m.input.createMeasured()
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].metric.data, [
        { at: daysAgo(24), value: 0 },
        { at: daysAgo(17), value: 0 },
        { at: daysAgo(10), value: 0 },
        { at: daysAgo(3), value: 0 },
    ])

    measured.measure(daysAgo(23), 1)
    measured.measure(daysAgo(17), 2)
    measured.measure(daysAgo(9), 4)

    assert.equal(e.status().mountains[0].indicators[0].metric.data, [
        { at: daysAgo(24), value: 0 },
        { at: daysAgo(17), value: 3 },
        { at: daysAgo(10), value: 0 },
        { at: daysAgo(3), value: 4 },
    ])
})

specify('Due Metrics', () => {
    const daysAgo = d => new Date(new Date().getTime() - d * 24 * 3600 * 1000)

    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().create()
    e.mountains.add().create()
        .indicators.add().create()
        .metric.createSmoothed()

    const m1 = e.mountains.add().create()
        .indicators.add().create()
        .metric.createMeasured(m => {
            m.caption.set('One')
            m.frequency.set(2 * 24 * 3600 * 1000)
        })
    e.mountains.add().create()
        .goals.add().create()
        .criteria.add().create()
        .metric.createSmoothed()
        .input.createChunked()
        .input.createDerived()
        .inputs.put('two').createMeasured(m => {
            m.caption.set('Two')
            m.frequency.set(2 * 24 * 3600 * 1000)
        })

    assert.equal(e.dueMetrics().map(m => m.caption.get()),
        ['One', 'Two'])

    m1.measure(daysAgo(3), 1)

    assert.equal(e.dueMetrics().map(m => m.caption.get()),
        ['One', 'Two'])

    m1.measure(daysAgo(1), 1)

    assert.equal(e.dueMetrics().map(m => m.caption.get()),
        ['Two'])
})
