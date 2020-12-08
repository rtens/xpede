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
        "good": 24,
        "status": []
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

    const i = m.indicators.add().pick(0).create()
    i.caption.set('Be Foo')
    i.description.set('Be a Foo not a Bar')
    i.ok.set(12)
    i.good.set(24)

    assert.equal(e.status().mountains[0].indicators, [{
        "caption": "Be Foo",
        "description": "Be a Foo not a Bar",
        "ok": 12,
        "good": 24,
        "status": []
    }])

    const me = i.metric.pick(0).createMeasured()
    me.caption.set('A Metric')
    me.description.set('Some Metric')

    assert.equal(e.status().mountains[0].indicators[0].metric, {
        "caption": "A Metric",
        "description": "Some Metric"
    })

    me.measure(new Date('2020-11-12'), 0)
    me.measure(new Date('2020-11-13'), 18)
    me.measure(new Date('2020-11-14'), 30)

    assert.equal(e.status().mountains[0].indicators[0].status, [
        {
            "at": "2020-11-12T00:00:00.000Z",
            "value": 0,
            "score": -1
        },
        {
            "at": "2020-11-13T00:00:00.000Z",
            "value": 18,
            "score": .5
        },
        {
            "at": "2020-11-14T00:00:00.000Z",
            "value": 30,
            "score": 1.5
        }
    ])
})

specify('Indicator without thresholds', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().pick(0).create(i => {
            i.metric.pick(0).createMeasured(m => {
                m.measure(new Date('2020-11-12'), 10)
                m.measure(new Date('2020-11-13'), 3)
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].status, [
        { at: '2020-11-12T00:00:00.000Z', value: 10, score: null },
        { at: '2020-11-13T00:00:00.000Z', value: 03, score: null }
    ])
})

specify('Combined Metric', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().pick(0).create(i => {
            i.good.set(20)
            i.ok.set(10)
            i.metric.pick(0).createCombined(m => {
                m.formula.set((value, { one, two }, date) => {
                    value.set(
                        one.datumOn(date).get().value.get()
                        + two.datumOn(date).get().value.get())
                })
                m.inputs.put('one').pick(0).createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 10)
                })
                m.inputs.put('two').pick(0).createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 3)
                    m.measure(new Date('2020-11-13'), 4)
                })
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].status, [
        { at: '2020-11-12T00:00:00.000Z', value: 13, score: 0.3 },
        { at: '2020-11-13T00:00:00.000Z', value: 14, score: 0.4 }
    ])
})

specify('Smoothed Metric', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().pick(0).create(i => {
            i.metric.pick(0).createSmoothed(m => {
                m.window.set(2 * 24 * 3600 * 1000)
                m.input.pick(0).createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 10)
                    m.measure(new Date('2020-11-13'), 11)
                    m.measure(new Date('2020-11-14'), 14)
                })
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].status, [
        { at: '2020-11-12T00:00:00.000Z', value: 10, score: null },
        { at: '2020-11-13T00:00:00.000Z', value: 10.5, score: null },
        { at: '2020-11-14T00:00:00.000Z', value: 12.5, score: null }
    ])
})

specify('Chunked Metric', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .indicators.add().pick(0).create(i => {
            i.metric.pick(0).createChunked(m => {
                m.start.set(new Date('2020-11-08'))
                m.size.set(7 * 24 * 3600 * 1000)
                m.input.pick(0).createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 10)
                    m.measure(new Date('2020-11-13'), 11)
                    m.measure(new Date('2020-11-18'), 14)
                })
            })
        })

    assert.equal(e.status().mountains[0].indicators[0].status, [
        { at: '2020-11-08T00:00:00.000Z', value: 00, score: null },
        { at: '2020-11-15T00:00:00.000Z', value: 21, score: null },
        { at: '2020-11-22T00:00:00.000Z', value: 14, score: null },
    ])
})

specify('Due Metrics', () => {
    const daysAgo = d => new Date(new Date().getTime() - d * 24 * 3600 * 1000)

    const e = new Expedition()
    const m1 = e.mountains.add().create()
        .indicators.add().pick(0).create()
        .metric.pick(0).createMeasured(m => {
            m.caption.set('One')
            m.frequency.set(2 * 24 * 3600 * 1000)
        })
    e.mountains.add().create()
        .goals.add().create()
        .criteria.add().create()
        .metric.pick(0).createSmoothed()
        .input.pick(0).createChunked()
        .input.pick(0).createCombined()
        .inputs.put('two').pick(0).createMeasured(m => {
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