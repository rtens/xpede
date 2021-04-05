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

    t.bad.set(21)
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
            t.bad.set(10)
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
            t.bad.set(10)
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
            t.bad.set(10)
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

    assert.equal(e.status().getAll().map(s => [s.at.get(), s.value.get()]), [
        [new Date('2011-12-13'), 0.5],
        [new Date('2011-12-14'), 0.5],
        [new Date('2011-12-15'), 0.4],
        [new Date('2011-12-16'), 0.4],
        [new Date('2011-12-17'), 0.3],
    ])
})

specify('Use worst Location status', () => {
    const e = new Expedition()
    const g = e.summit.create()

    g.location.add().createTarget(t => {
        t.good.set(20)
        t.bad.set(10)
        t.metric.createMeasured(m =>
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-13'))
                d.value.set(15)
            })
        )
    })

    g.location.add().createTarget(t => {
        t.good.set(20)
        t.bad.set(10)
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
        t.bad.set(10)
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

    assert.equal(e.status().getAll().map(s => [s.at.get(), s.value.get()]), [
        [new Date('2011-12-13'), 0.5],
        [new Date('2011-12-14'), 0.5],
        [new Date('2011-12-15'), 0.4],
        [new Date('2011-12-16'), 0.4],
        [new Date('2011-12-17'), 0.3],
    ])
})

specify('Progress status trumps Location status', () => {

    const e = new Expedition()
    const summit = e.summit.create()

    summit.location.add().createTarget(t => {
        t.good.set(42)
        t.bad.set(21)
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
    t.bad.set(0)
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
        t.bad.set(10)
        t.metric.createMeasured(m =>
            m.facts.add().create(d => {
                d.at.set(new Date('2011-12-13'))
                d.value.set(15)
            })
        )
    })

    g.progress.add().createTarget(t => {
        t.good.set(20)
        t.bad.set(10)
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
        t.bad.set(10)
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

    assert.equal(e.status().getAll().map(s => [s.at.get(), s.value.get()]), [
        [new Date('2011-12-13'), 0.5],
        [new Date('2011-12-14'), 0.5],
        [new Date('2011-12-15'), 0.4],
        [new Date('2011-12-16'), 0.4],
        [new Date('2011-12-17'), 0.3],
    ])
})

specify('Derived Metric', () => {
    const e = new Expedition()
    e.summit.create(s =>
        s.location.add().createTarget(t => {
            t.good.set(10)
            t.bad.set(0)
            t.metric.createDerived(m => {
                m.formula.set((value, at, { one, two }) => {
                    value.set(
                        one.datumOn(at).get().value.get()
                        + two.datumOn(at).get().value.get())
                })

                m.inputs.put('one').createMeasured(input =>
                    input.facts.add().create(d => {
                        d.at.set(new Date('2011-12-13'))
                        d.value.set(3)
                    })
                )
                m.inputs.put('two').createMeasured(input => {
                    input.facts.add().create(d => {
                        d.at.set(new Date('2011-12-14'))
                        d.value.set(4)
                    })
                    input.facts.add().create(d => {
                        d.at.set(new Date('2011-12-16'))
                        d.value.set(6)
                    })
                })
            })
        })
    )

    assert.equal(e.status().getAll().map(s => [s.at.get(), s.value.get()]), [
        [new Date('2011-12-14'), 0.7],
        [new Date('2011-12-16'), 0.9],
    ])
})

specify('Smoothed Metric', () => {
    const e = new Expedition()
    e.summit.create(s =>
        s.location.add().createTarget(t => {
            t.good.set(10)
            t.bad.set(0)
            t.metric.createSmoothed(m => {
                m.window.create(w => w.days.set(3))
                m.input.createMeasured(m => {
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-13')); d.value.set(4) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-14')); d.value.set(8) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-15')); d.value.set(12) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-16')); d.value.set(7) })
                })
            })
        })
    )

    assert.equal(e.status().getAll().map(s => [s.at.get(), s.value.get()]), [
        [new Date('2011-12-13'), 0.4],
        [new Date('2011-12-14'), 0.6],
        [new Date('2011-12-15'), 0.8],
        [new Date('2011-12-16'), 0.9],
    ])
})

specify('Averaged Metric', () => {
    const e = new Expedition()
    e.summit.create(s =>
        s.location.add().createTarget(t => {
            t.good.set(10)
            t.bad.set(0)
            t.metric.createAveraged(m => {
                m.window.create(w => w.days.set(4))
                m.unit.create(u => u.days.set(1))
                m.input.createMeasured(m => {
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-13')); d.value.set(12) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-15')); d.value.set(12) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-16')); d.value.set(12) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-18')); d.value.set(8) })
                })
            })
        })
    )

    assert.equal(e.status().getAll().map(s => [s.at.get(), s.value.get()]), [
        [new Date('2011-12-13'), 0.3],
        [new Date('2011-12-15'), 0.6],
        [new Date('2011-12-16'), 0.9],
        [new Date('2011-12-18'), 0.8],
    ])
})

specify('Difference Metric', () => {
    const e = new Expedition()
    e.summit.create(s =>
        s.location.add().createTarget(t => {
            t.good.set(10)
            t.bad.set(0)
            t.metric.createDifference(m => {
                m.window.create(w => w.days.set(3))
                m.input.createMeasured(m => {
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-13')); d.value.set(6) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-15')); d.value.set(7) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-16')); d.value.set(8) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-17')); d.value.set(9) })
                    m.facts.add().create(d => { d.at.set(new Date('2011-12-19')); d.value.set(9) })
                })
            })
        })
    )

    assert.equal(e.status().getAll().map(s => [s.at.get(), s.value.get()]), [
        [new Date('2011-12-16'), 0.2],
        [new Date('2011-12-17'), 0.3],
        [new Date('2011-12-19'), 0.1],
    ])
})