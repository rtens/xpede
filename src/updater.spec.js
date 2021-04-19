const { specify, assert } = require('./spec')
const Expedition = require('./aggregates/expedition')
const Updater = require('./updater')
const spec = require('./spec')

specify('Find due metrics', () => {
    assert.equal(new Updater({ all: () => ({}) }).findDueMetrics(), [])

    const foo = new Expedition()
    let metric;
    foo.summit.create(s => {
        s.coordinates.add().create(c => {
            c.indicator.createTarget(t => {
                t.metric.createMeasured(m => {
                    metric = m
                    m.name.set('Foo Metric')
                    m.description.set('I am Foo')
                    m.source.createManual(w => {
                        w.instructions.set('Get the number')
                    })
                    m.facts.add().create(f => {
                        f.at.set(new Date('2011-12-13'))
                        f.value.set(42)
                    })
                })
            })
        })
    })

    const updater = new Updater({ all: () => ({ foo }) })

    foo.withCurrentDate(new Date('2011-12-20'))
    assert.equal(updater.findDueMetrics(), [{
        expedition: 'foo',
        path: ['summit', 'coordinates', 0],
        name: 'Foo Metric',
        description: 'I am Foo',
        source: {
            type: 'Manual',
            instructions: 'Get the number',
            hint: 'Value'
        },
        facts: [{
            at: new Date('2011-12-13'),
            value: 42
        }]
    }])

    metric.frequency.create(s => s.days.set(7))
    assert.equal(updater.findDueMetrics().length, 1)

    metric.facts.add().create(f => f.at.set(new Date('2011-12-14')))
    assert.equal(updater.findDueMetrics().length, 0)

    metric.facts.add().create(f => f.at.set(new Date('2011-12-15')))
    assert.equal(updater.findDueMetrics().length, 0)

    metric.frequency.create(s => s.days.set(3))
    assert.equal(updater.findDueMetrics().length, 1)
})

specify('Find due metrics inside metrics', () => {
    const foo = new Expedition()
    foo.waypoints.add().create(s => {
        s.subs.add().create(s => {
            s.pace.add().createTarget(t => {
                t.metric.createDerived(m => {
                    m.inputs.put('one').createSmoothed(m => {
                        m.input.createAveraged(m => {
                            m.input.createDifference(m => {
                                m.input.createMeasured()
                            })
                        })
                    })
                })
            })
        })
    })

    const updater = new Updater({ all: () => ({ foo }) })

    assert.equal(updater.findDueMetrics().map(m => m.path), [
        ['waypoints', 0, 'subs', 0, 'pace', 0, 'one']
    ])
})

specify('Deduplicate metrics', () => {
    const foo = new Expedition()
    let metric;
    foo.summit.create(s => {
        s.pace.add().createTarget(t => {
            metric = t.metric.createMeasured()
        })
        s.pace.add().createTarget(t => t.metric.set(metric))
    })

    const updater = new Updater({ all: () => ({ foo }) })

    assert.equal(updater.findDueMetrics().map(m => m.path), [
        ['summit', 'pace', 0]
    ])
})

specify('Add a fact', () => {
    const foo = new Expedition()
    foo.name.set('Foo')
    let metric;
    foo.summit.create(s => {
        s.pace.add().createTarget(t => {
            t.metric.createMeasured(m => {
                metric = m
                m.facts.add().create(f => f.at.set(new Date('2011-12-13')))
            })
        })
    })

    let saved
    const updater = new Updater({
        all: () => ({ foo }),
        save: (key, value) => saved = { key, value: value.name.get() }
    })

    updater.addFact({
        expedition: 'foo',
        path: ['summit', 'pace', 0],
        at: '2011-12-14',
        value: 42
    })

    assert.equal(metric.facts.getAll().map(f => [f.at.get(), f.value.get()]), [
        [new Date('2011-12-13'), null],
        [new Date('2011-12-14'), 42]
    ])

    assert.equal(saved, {
        key: 'foo',
        value: 'Foo'
    })
})

specify('Parse value', () => {
    test('Number', '42.3', 42.3)
    test('Number', '42,3', 42.3)
    test('Date', '2011-12-13', new Date('2011-12-13'))
    test('DateTime', '2011-12-13 14:15', new Date('2011-12-13T14:15:00'))
    test('Hours', '14:15:36', 14.26)
    test('Minutes', '14:15', 14.25)

    function test(valueType, inputValue, expectedValue) {
        const foo = new Expedition()
        let metric;
        foo.summit.create(s => {
            s.pace.add().createTarget(t => {
                metric = t.metric.createMeasured()
                metric.source.createManual(s => {
                    s.type.set(valueType)
                })
            })
        })

        const updater = new Updater({
            all: () => ({ foo }),
            save: () => null
        })

        updater.addFact({
            expedition: 'foo',
            path: ['summit', 'pace', 0],
            at: '2011-12-14',
            value: inputValue
        })

        assert.equal(metric.facts.getAll().map(f => f.value.get()), [
            expectedValue
        ])
    }
})