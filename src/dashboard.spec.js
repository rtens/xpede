const { specify, assert } = require('./spec')
const Expedition = require('./aggregates/expedition')
const dashboard = require('./dashboard')

specify('Minimal Expedition', () => {
    const e = new Expedition()
    e.name.set('Foo')

    assert.equal(dashboard([e]), {
        weeks: 12,
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

specify('Summit coordinates', () => {
    const e = new Expedition()
    e.name.set('Foo')
    e.summit.create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.coordinates.add().create(c => {
            c.locked.set(true)
            c.indicator.createTarget(t => {
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
        "status": [
            {
                "at": "2011-12-13T14:15:16.017Z",
                "score": 0.8
            }
        ],
        "reached": true,
        "coordinates": [
            {
                "locked": true,
                "indicator": {
                    "type": "Target",
                    "name": "A Target",
                    "description": "Something about the target",
                    "status": [
                        {
                            "at": "2011-12-13T14:15:16.017Z",
                            "score": 0.8
                        }
                    ],
                    "bad": 10,
                    "good": 20
                }
            }
        ],
        "pace": [],
        "subs": []
    })

    assert.equal(dashboard([e]).expeditions[0].status, [{
        "at": "2011-12-13T14:15:16.017Z",
        "score": 0.8
    }])
})

specify('Summit pace', () => {
    const e = new Expedition()
    e.summit.create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.pace.add().createTarget(t => {
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
                "score": 0.8
            }
        ],
        "reached": false,
        "coordinates": [],
        "pace": [
            {
                "type": "Target",
                "name": "A Target",
                "description": "Something about the target",
                "status": [
                    {
                        "at": "2011-12-13T14:15:16.017Z",
                        "score": 0.8
                    }
                ],
                "bad": 10,
                "good": 20
            }
        ],
        "subs": []
    })
})

specify('Sub goals', () => {
    const e = new Expedition()
    e.summit.create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.subs.add().create(g => {
            g.name.set('Baz')
            g.description.set('Something about the baz')
            g.coordinates.add().create(c => {
                c.locked.set(true)
                c.indicator.createTarget(t => {
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
    })

    assert.equal(dashboard([e]).expeditions[0].summit, {
        "type": "Goal",
        "name": "Bar",
        "description": "Something about the bar",
        "status": [{
            "at": "2011-12-13T14:15:16.017Z",
            "score": 0.8
        }],
        "reached": true,
        "coordinates": [],
        "pace": [],
        "subs": [{
            "type": "Goal",
            "name": "Baz",
            "description": "Something about the baz",
            "status": [{
                "at": "2011-12-13T14:15:16.017Z",
                "score": 0.8
            }],
            "reached": true,
            "coordinates": [{
                "locked": true,
                "indicator": {
                    "type": "Target",
                    "name": "A Target",
                    "description": "Something about the target",
                    "status": [{
                        "at": "2011-12-13T14:15:16.017Z",
                        "score": 0.8
                    }],
                    "bad": 10,
                    "good": 20
                }
            }],
            "pace": [],
            "subs": []
        }]
    })
})

specify('Waypoints', () => {
    const e = new Expedition()
    e.waypoints.add().create(g => {
        g.name.set('Bar')
        g.description.set('Something about the bar')
        g.coordinates.add().create(c => {
            c.locked.set(true)
            c.indicator.createTarget(t => {
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

    assert.equal(dashboard([e]).expeditions[0].waypoints, [{
        "type": "Goal",
        "name": "Bar",
        "description": "Something about the bar",
        "status": [{
            "at": "2011-12-13T14:15:16.017Z",
            "score": 0.8
        }],
        "reached": true,
        "coordinates": [{
            "locked": true,
            "indicator": {
                "type": "Target",
                "name": "A Target",
                "description": "Something about the target",
                "status": [{
                    "at": "2011-12-13T14:15:16.017Z",
                    "score": 0.8
                }],
                "bad": 10,
                "good": 20
            }
        }],
        "pace": [],
        "subs": []
    }])
})