const { specify, assert } = require('./spec')
const { Value, One, Many, Map, Reference, Formula, extend } = require('./model')

specify('Value', () => {
    assert.equal(Value.of(String).set("foo").get(), "foo")
    assert.equal(Value.of(String).exists(), false)
    assert.equal(Value.of(String).set("foo").exists(), true)

    assert.same(Value.of(String),
        Value.of(String),
        null)
    assert.same(Value.of(String),
        Value.of(String).set("foo"),
        "foo")
    assert.same(Value.of(String),
        Value.of(Number).set(42),
        42)
    assert.same(Value.of(String),
        Value.of(Boolean).set(true),
        true)
    assert.same(Value.of(String),
        Value.of(Date).set(new Date('2011-12-13T14:15:16.017Z')),
        '2011-12-13T14:15:16.017Z')
})

specify('One', () => {
    class A {
        constructor() {
            this.foo = Value.of(String)
        }
    }

    assert.equal((o => o.create(a => a.foo.set('bar')) && o.get().foo.get())(One.of(A)), "bar")
    assert.equal((a => a.exists())(One.of(A)), false)
    assert.equal((a => a.create() && a.exists())(One.of(A)), true)

    assert.same(One.of(A), One.of(A), null)
    assert.same(One.of(A),
        One.of(A).create(),
        { "type": "A", "fields": { "foo": null } })

    class Abstract { }

    class Concrete { }
    extend(Concrete, Abstract)

    assert.same(One.of(Abstract),
        One.of(Abstract).createConcrete(),
        { "type": "Concrete", "fields": {} })

    class HasOne {
        constructor() {
            this.a = One.of(A)
        }
    }

    assert.equal(One.of(HasOne)
        .or(ho => ho.a.create(a => a.foo.set('bar')))
        .get().a.get().foo.get(),
        'bar')

    assert.equal(
        (o =>
            o.create(ho => ho.a.create(a => a.foo.set('foo')))
            && o.or(ho => ho.a.create(a => a.foo.set('bar')))
        )(One.of(HasOne))
            .get().a.get().foo.get(),
        'foo')

    assert.same(new HasOne,
        new HasOne,
        { "type": "HasOne", "fields": { "a": null } })
    assert.same(new HasOne,
        (ho => ho.a.create() && ho)(new HasOne),
        { "type": "HasOne", "fields": { "a": { "type": "A", "fields": { "foo": null } } } })

    class HasFunction {
        constructor() {
            this.function = () => null
        }
    }

    assert.same(new HasFunction,
        new HasFunction,
        { "type": "HasFunction", "fields": {} })
})

specify('Many', () => {
    class A { }

    assert.same(Many.of(Value.of(String)),
        Many.of(Value.of(String)),
        [])
    assert.same(Many.of(Value.of(String)),
        (m => m.add().set('foo') && m)(Many.of(Value.of(String))),
        ["foo"])

    assert.equal(Many.of(Value.of(String)).all(), [])
    assert.equal(Many.of(Value.of(String)).at(0).get(), null)

    assert.equal((m => m.add().set("foo") && m.add().set("bar") && m.all().map(i => i.get()))(Many.of(Value.of(String))), ["foo", "bar"])
    assert.equal((m => m.add().set("foo") && m.add().set("bar") && m.getAll())(Many.of(Value.of(String))), ["foo", "bar"])
    assert.equal((m => m.add().set("foo") && m.add().set("bar") && m.at(0).get())(Many.of(Value.of(String))), "foo")
    assert.equal((m => m.add().set("foo") && m.add().set("bar") && m.last().get())(Many.of(Value.of(String))), "bar")
    assert.equal((m => m.add().set("foo") && m.add().set("bar") && m.last(1).get())(Many.of(Value.of(String))), "foo")

    assert.same(Many.of(One.of(A)), Many.of(One.of(A)), [])
    assert.same(Many.of(One.of(A)),
        (m => m.add() && m)(Many.of(One.of(A))),
        [null])
    assert.same(Many.of(One.of(A)),
        (m => m.add().create() && m)(Many.of(One.of(A))),
        [{ "type": "A", "fields": {} }])
    assert.same(Many.of(One.of(A)),
        (m => m.add().create() && m)(Many.of(A)),
        [{ "type": "A", "fields": {} }])
    assert.same(Many.of(One.of(A)),
        (m => m.add().create() && m.add().create() && m)(Many.of(One.of(A))),
        [{ "type": "A", "fields": {} }, { "type": "A", "fields": {} }])

    assert.same(Many.of(Many.of(One.of(A))),
        Many.of(Many.of(One.of(A))),
        [])
    assert.same(Many.of(Many.of(One.of(A))),
        (m => m.add() && m)(Many.of(Many.of(One.of(A)))),
        [[]])
    assert.same(Many.of(Many.of(One.of(A))),
        (m => m.add().add().create() && m)(Many.of(Many.of(One.of(A)))),
        [[{ "type": "A", "fields": {} }]])
})

specify('Map', () => {
    assert.same(Map.of(Value.of(String)), Map.of(Value.of(String)), {})
    assert.same(Map.of(Value.of(String)),
        (m => m.put('foo').set(42) && m)(Map.of(Value.of(Number))),
        { foo: 42 })
})

specify('Reference', () => {
    class ReferencedObject { }

    class ObjectFirst {
        constructor(fn) {
            this.first = One.of(ReferencedObject)
            this.second = Reference.to(ReferencedObject)
            if (fn) fn(this)
        }
    }

    assert.equal((o =>
        o.first.create(f => f.foo = 42) &&
        o.second.point(o.first.get()) &&
        o.second.get())(new ObjectFirst()),
        { "foo": 42 })

    assert.same(new ObjectFirst,
        new ObjectFirst(o => o.first.create() && o.second.point(o.first.get())),
        { "type": "ObjectFirst", "fields": { "first": { "id": "@1", "type": "ReferencedObject", "fields": {} }, "second": "@1" } })

    class ReferenceFirst {
        constructor(fn) {
            this.first = Reference.to(ReferencedObject)
            this.second = One.of(ReferencedObject)
            if (fn) fn(this)
        }
    }

    assert.same(new ReferenceFirst,
        new ReferenceFirst(o =>
            o.second.create() &&
            o.first.point(o.second.get())),
        { "type": "ReferenceFirst", "fields": { "first": "@1", "second": { "id": "@1", "type": "ReferencedObject", "fields": {} } } })

    class TwoReferences {
        constructor(fn) {
            this.first = One.of(ReferencedObject)
            this.second = Reference.to(ReferencedObject)
            this.third = Reference.to(ReferencedObject)
            if (fn) fn(this)
        }
    }

    assert.same(new TwoReferences,
        new TwoReferences(o =>
            o.first.create() &&
            o.second.point(o.first.get()) &&
            o.third.point(o.first.get())),
        { "type": "TwoReferences", "fields": { "first": { "id": "@1", "type": "ReferencedObject", "fields": {} }, "second": "@1", "third": "@1" } })

    class ManyReferences {
        constructor(fn) {
            this.first = One.of(ReferencedObject)
            this.second = Many.of(Reference.to(ReferencedObject))
            if (fn) fn(this)
        }
    }

    assert.same(new ManyReferences,
        new ManyReferences(o =>
            o.first.create() &&
            o.second.add().point(o.first.get()) &&
            o.second.add().point(o.first.get())),
        { "type": "ManyReferences", "fields": { "first": { "id": "@1", "type": "ReferencedObject", "fields": {} }, "second": ["@1", "@1"] } })
})

specify('Formula', () => {
    const formula = Formula.of(Value.of(String))

    assert.equal(formula.result().exists(), false)

    formula.create((result, foo, bar) =>
        result.set(foo.toUpperCase() + bar.toUpperCase()))

    assert.equal(formula.result("foo", "bar").get(), "FOOBAR")
    assert.roundtrip(Formula.of(Value.of(String)),
        formula, f => f.result("one", "two").get(),
        "ONETWO")
})