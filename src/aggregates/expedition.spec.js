const { specify, assert } = require('../spec')
const Expedition = require('./expedition')

specify('Expedition uses Goal status', () => {
    const e = new Expedition()
    assert.equal(e.status().getAll(), [])

    const g = e.summit.create()
    assert.equal(e.status().getAll(), [])

    const t = g.location.add().createTarget()
    assert.equal(e.status().getAll(), [])

    const m = t.metric.createMeasured()
    assert.equal(e.status().getAll(), [])

    m.facts.add().create(d => {
        d.at.set(new Date('2011-12-13'))
        d.value.set(42)
    })

    assert.equal(e.status().getAll(), [])

    t.good.set(42)
    assert.equal(e.status().getAll(), [])

    t.ok.set(21)
    assert.equal(e.status().getAll(), [{
        at: { object: new Date('2011-12-13') },
        value: { object: 1 }
    }])

    m.facts.add().create(d => {
        d.at.set(new Date('2011-12-14'))
        d.value.set(42 + 10.5)
    })
    assert.equal(e.status().getAll(), [
        {
            at: { object: new Date('2011-12-13') },
            value: { object: 1 }
        },
        {
            at: { object: new Date('2011-12-14') },
            value: { object: 1.5 }
        }
    ])
})

specify('Expedition uses worst Goal status', () => {
    const e = new Expedition()
    e.summit.create(g =>
        g.location.add().createTarget(t => {
            t.good.set(20)
            t.ok.set(10)
            t.metric.createMeasured(m =>
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-13'))
                    d.value.set(15)
                })
            )
        })
    )

    e.waypoints.add().create(g =>
        g.location.add().createTarget(t => {
            t.good.set(20)
            t.ok.set(10)
            t.metric.createMeasured(m => {
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-14'))
                    d.value.set(16)
                })
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-15'))
                    d.value.set(14)
                })
            })
        })
    )

    e.waypoints.add().create(g =>
        g.location.add().createTarget(t => {
            t.good.set(20)
            t.ok.set(10)
            t.metric.createMeasured(m => {
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-15'))
                    d.value.set(16)
                })
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-16'))
                    d.value.set(16)
                })
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-17'))
                    d.value.set(13)
                })
            })
        })
    )

    assert.equal(e.status().getAll().map(s => s.at.get()), [
        new Date('2011-12-13'),
        new Date('2011-12-14'),
        new Date('2011-12-15'),
        new Date('2011-12-16'),
        new Date('2011-12-17'),
    ])

    assert.equal(e.status().getAll().map(s => s.value.get()), [
        0.5,
        0.5,
        0.4,
        0.4,
        0.3
    ])
})

specify('Use worst Location status', () => {
    const e = new Expedition()
    const g = e.summit.create()

    g.location.add().createTarget(t => {
        t.good.set(20)
        t.ok.set(10)
        t.metric.createMeasured(m =>
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-13'))
                d.value.set(15)
            })
        )
    })

    g.location.add().createTarget(t => {
        t.good.set(20)
        t.ok.set(10)
        t.metric.createMeasured(m => {
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-14'))
                d.value.set(16)
            })
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-15'))
                d.value.set(14)
            })
        })
    })

    g.location.add().createTarget(t => {
        t.good.set(20)
        t.ok.set(10)
        t.metric.createMeasured(m => {
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-15'))
                d.value.set(16)
            })
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-16'))
                d.value.set(16)
            })
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-17'))
                d.value.set(13)
            })
        })
    })

    assert.equal(e.status().getAll().map(s => s.at.get()), [
        new Date('2011-12-13'),
        new Date('2011-12-14'),
        new Date('2011-12-15'),
        new Date('2011-12-16'),
        new Date('2011-12-17'),
    ])

    assert.equal(e.status().getAll().map(s => s.value.get()), [
        0.5,
        0.5,
        0.4,
        0.4,
        0.3
    ])
})

specify('Progress status trumps Location status', () => {

    const e = new Expedition()
    const summit = e.summit.create()

    summit.location.add().createTarget(t => {
        t.good.set(42)
        t.ok.set(21)
        t.metric.createMeasured(m =>
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-13'))
                d.value.set(42)
            })
        )
    })

    const t = summit.progress.add().createTarget()
    assert.equal(e.status().getAll(), [])

    t.good.set(21)
    t.ok.set(0)
    t.metric.createMeasured(m =>
        m.facts.add().create(d => {
            d.at.set(new Date('2011-12-14'))
            d.value.set(42)
        })
    )

    assert.equal(e.status().getAll(), [{
        at: { object: new Date('2011-12-14') },
        value: { object: 2 }
    }])
})

specify('Use worst Progress status', () => {
    const e = new Expedition()
    const g = e.summit.create()

    g.progress.add().createTarget(t => {
        t.good.set(20)
        t.ok.set(10)
        t.metric.createMeasured(m =>
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-13'))
                d.value.set(15)
            })
        )
    })

    g.progress.add().createTarget(t => {
        t.good.set(20)
        t.ok.set(10)
        t.metric.createMeasured(m => {
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-14'))
                d.value.set(16)
            })
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-15'))
                d.value.set(14)
            })
        })
    })

    g.progress.add().createTarget(t => {
        t.good.set(20)
        t.ok.set(10)
        t.metric.createMeasured(m => {
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-15'))
                d.value.set(16)
            })
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-16'))
                d.value.set(16)
            })
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-17'))
                d.value.set(13)
            })
        })
    })

    assert.equal(e.status().getAll().map(s => s.at.get()), [
        new Date('2011-12-13'),
        new Date('2011-12-14'),
        new Date('2011-12-15'),
        new Date('2011-12-16'),
        new Date('2011-12-17'),
    ])

    assert.equal(e.status().getAll().map(s => s.value.get()), [
        0.5,
        0.5,
        0.4,
        0.4,
        0.3
    ])
})

specify.skip('Derived Metric', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .progress.add().createGauge(i => {
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

    assert.equal(e.status().mountains[0].progress[0].metric.data, [
        { at: '2020-11-12T00:00:00.000Z', value: 13 },
        { at: '2020-11-13T00:00:00.000Z', value: 14 },
    ])
})

specify.skip('Smoothed Metric', () => {
    const e = new Expedition()
    e.mountains.add().create()
        .progress.add().createGauge(i => {
            i.metric.createSmoothed(m => {
                m.window.set(2 * 24 * 3600 * 1000)
                m.input.createMeasured(m => {
                    m.measure(new Date('2020-11-12'), 10)
                    m.measure(new Date('2020-11-13'), 11)
                    m.measure(new Date('2020-11-14'), 14)
                })
            })
        })

    assert.equal(e.status().mountains[0].progress[0].metric.data, [
        { at: '2020-11-12T00:00:00.000Z', value: 10 },
        { at: '2020-11-13T00:00:00.000Z', value: 10.5 },
        { at: '2020-11-14T00:00:00.000Z', value: 12.5 },
    ])
})

specify.skip('Chunked Metric', () => {
    const daysAgo = d => new Date(new Date(new Date().getTime() - d * 24 * 3600 * 1000).toISOString().substring(0, 10))
    let measured

    const e = new Expedition()
    e.mountains.add().create()
        .progress.add().createGauge(i => {
            i.metric.createChunked(m => {
                m.start.set(daysAgo(24))
                m.size.set(7 * 24 * 3600 * 1000)
                measured = m.input.createMeasured()
            })
        })

    assert.equal(e.status().mountains[0].progress[0].metric.data, [
        { at: daysAgo(24), value: 0 },
        { at: daysAgo(17), value: 0 },
        { at: daysAgo(10), value: 0 },
        { at: daysAgo(3), value: 0 },
    ])

    measured.measure(daysAgo(23), 1)
    measured.measure(daysAgo(17), 2)
    measured.measure(daysAgo(9), 4)

    assert.equal(e.status().mountains[0].progress[0].metric.data, [
        { at: daysAgo(24), value: 0 },
        { at: daysAgo(17), value: 3 },
        { at: daysAgo(10), value: 0 },
        { at: daysAgo(3), value: 4 },
    ])
})