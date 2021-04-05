const { specify, assert } = require('./spec')
const Expedition = require('./aggregates/expedition')
const dashboard = require('./dashboard')

specify('Minimal Expedition', () => {
    const e = new Expedition()
    e.name.set('Foo')

    assert.equal(dashboard([e]), {
        weeks: 8,
        expeditions: [
            {
                name: 'Foo',
                summit: null,
                waypoints: [],
                status: []
            }
        ]
    })
})

specify('Summit location', () => {
    const e = new Expedition()
    e.name.set('Foo')
    e.summit.create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.location.add().createTarget(t => {
            t.name.set('A Target')
            t.description.set('Something about the target')
            t.good.set(20)
            t.bad.set(10)
            t.metric.createMeasured(m =>
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-13T14:15:16.017Z'))
                    d.value.set(18)
                })
            )
        })
    })

    const d = dashboard([e])
    assert.equal(d.expeditions[0].summit, {
        "type": "Goal",
        "name": "Bar",
        "description": "Something about the bar",
        "status": [
            {
                "at": "2011-12-13T14:15:16.017Z",
                "value": 0.8
            }
        ],
        "location": [
            {
                "type": "Target",
                "name": "A Target",
                "description": "Something about the target",
                "status": [
                    {
                        "at": "2011-12-13T14:15:16.017Z",
                        "value": 0.8
                    }
                ],
                "bad": 10,
                "good": 20
            }
        ],
        "progress": []
    })

    assert.equal(d.expeditions[0].status, [{
        "at": "2011-12-13T14:15:16.017Z",
        "value": 0.8
    }])
})

specify('Summit progress', () => {
    const e = new Expedition()
    e.summit.create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.progress.add().createTarget(t => {
            t.name.set('A Target')
            t.description.set('Something about the target')
            t.good.set(20)
            t.bad.set(10)
            t.metric.createMeasured(m =>
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-13T14:15:16.017Z'))
                    d.value.set(18)
                })
            )
        })
    })

    assert.equal(dashboard([e]).expeditions[0].summit, {
        "type": "Goal",
        "name": "Bar",
        "description": "Something about the bar",
        "status": [
            {
                "at": "2011-12-13T14:15:16.017Z",
                "value": 0.8
            }
        ],
        "location": [],
        "progress": [
            {
                "type": "Target",
                "name": "A Target",
                "description": "Something about the target",
                "status": [
                    {
                        "at": "2011-12-13T14:15:16.017Z",
                        "value": 0.8
                    }
                ],
                "bad": 10,
                "good": 20
            }
        ]
    })
})

specify('Nested goals', () => {
    const e = new Expedition()
    e.summit.create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.location.add().createGoal(g => {
            g.name.set('Baz')
            g.description.set('Something about the baz')
            g.location.add().createTarget(t => {
                t.name.set('A Target')
                t.description.set('Something about the target')
                t.good.set(20)
                t.bad.set(10)
                t.metric.createMeasured(m =>
                    m.facts.add().create(d => {
                        d.at.set(new Date('2011-12-13T14:15:16.017Z'))
                        d.value.set(18)
                    })
                )
            })
        })
    })
    assert.equal(dashboard([e]).expeditions[0].summit, {
        "type": "Goal",
        "name": "Bar",
        "description": "Something about the bar",
        "status": [{
            "at": "2011-12-13T14:15:16.017Z",
            "value": 0.8
        }],
        "location": [{
            "type": "Goal",
            "name": "Baz",
            "description": "Something about the baz",
            "status": [{
                "at": "2011-12-13T14:15:16.017Z",
                "value": 0.8
            }],
            "location": [{
                "type": "Target",
                "name": "A Target",
                "description": "Something about the target",
                "status": [{
                    "at": "2011-12-13T14:15:16.017Z",
                    "value": 0.8
                }],
                "bad": 10,
                "good": 20
            }],
            "progress": []
        }],
        "progress": []
    })
})

specify('Waypoints', () => {
    const e = new Expedition()
    e.waypoints.add().create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.location.add().createTarget(t => {
            t.name.set('A Target')
            t.description.set('Something about the target')
            t.good.set(20)
            t.bad.set(10)
            t.metric.createMeasured(m =>
                m.facts.add().create(d => {
                    d.at.set(new Date('2011-12-13T14:15:16.017Z'))
                    d.value.set(18)
                })
            )
        })
    })

    assert.equal(dashboard([e]).expeditions[0].waypoints, [{
        "type": "Goal",
        "name": "Bar",
        "description": "Something about the bar",
        "status": [{
            "at": "2011-12-13T14:15:16.017Z",
            "value": 0.8
        }],
        "location": [{
            "type": "Target",
            "name": "A Target",
            "description": "Something about the target",
            "status": [{
                "at": "2011-12-13T14:15:16.017Z",
                "value": 0.8
            }],
            "bad": 10,
            "good": 20
        }],
        "progress": []
    }])
})