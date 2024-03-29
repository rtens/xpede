const { specify, assert } = require('./spec')
const { Value, One, Many, Map, Reference, Formula, Either, extend } = require('./model')

const a = (a, fn) => fn(a)

specify('Value', () => {
    assert.equal(
        a(Value.of(String), v =>
            v.set("foo") ||
            v.get()),
        "foo")
    assert.equal(
        a(Value.of(String), v =>
            v.set(0) ||
            v.get()),
        0
    )
    assert.equal(
        a(Value.of(String), v =>
            v.exists()),
        false)
    assert.equal(
        a(Value.of(String), v =>
            v.set("foo") ||
            v.exists()),
        true)

    assert.same(Value.of(String),
        Value.of(String),
        null)
    assert.same(Value.of(String),
        a(Value.of(String), v =>
            v.set("foo") || v),
        "foo")
    assert.same(Value.of(Number),
        a(Value.of(Number), v =>
            v.set(42) || v),
        42)
    assert.same(Value.of(Boolean),
        a(Value.of(Boolean), v =>
            v.set(true) || v),
        true)
    assert.same(Value.of(Date),
        a(Value.of(Date), v =>
            v.set(new Date('2011-12-13T14:15:16.017Z')) || v),
        '2011-12-13T14:15:16.017Z')
})

specify('One', () => {
    class A {
        constructor() {
            this.foo = Value.of(String)
        }
    }

    assert.equal(
        a(One.of(A), o =>
            o.create(a => a.foo.set('bar')) &&
            o.get().foo.get()),
        "bar")
    assert.equal(
        a(One.of(A), a =>
            a.exists()),
        false)
    assert.equal(
        a(One.of(A), a =>
            a.create() &&
            a.exists()),
        true)

    assert.equal(
        a(One.of(A), a =>
            a.ifNot(() => 'foo')),
        'foo')
    assert.equal(
        a(One.of(A), a =>
            a.create(o => o.foo.set('bar')) &&
            a.ifNot(() => 'foo').foo.get()),
        'bar')

    assert.equal(
        a(One.of(A), a =>
            a.ifThere(o => o.foo.get())),
        null)
    assert.equal(
        a(One.of(A), a =>
            a.create(o => o.foo.set('bar')) &&
            a.ifThere(o => o.foo.get())),
        'bar')

    assert.equal(
        a(One.of(A), a =>
            a.ifEither(o => o.foo.get(), () => 'not')),
        'not')
    assert.equal(
        a(One.of(A), a =>
            a.create(o => o.foo.set('bar')) &&
            a.ifEither(o => o.foo.get(), () => 'not')),
        'bar')

    assert.same(One.of(A),
        One.of(A),
        null)
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

    class TransientProperties {
        constructor() {
            this.foo = Value.of(String)
            this._bar = Value.of(String)

            this.foo.set('one')
            this._bar.set('two')
        }
    }

    assert.same(new TransientProperties,
         new TransientProperties,
         {"type":"TransientProperties","fields":{"foo":"one"}})
})

specify('Many', () => {
    assert.same(Many.of(Value.of(String)),
        Many.of(Value.of(String)),
        [])
    assert.same(Many.of(Value.of(String)),
        a(Many.of(Value.of(String)), m =>
            m.add().set('foo') || m),
        ["foo"])

    assert.equal(Many.of(Value.of(String)).all(), [])
    assert.equal(Many.of(Value.of(String)).at(0), Value.of(String))

    assert.equal(
        a(Many.of(Value.of(String)), m =>
            m.add().set("foo") ||
            m.add().set("bar") ||
            m.all().map(i => i.get())),
        ["foo", "bar"])
    assert.equal(
        a(Many.of(Value.of(String)), m =>
            m.add().set("foo") ||
            m.add().set("bar") ||
            m.getAll()),
        ["foo", "bar"])
    assert.equal(
        a(Many.of(Value.of(String)), m =>
            m.add().set("foo") ||
            m.add().set("bar") ||
            m.at(0).get()),
        "foo")
    assert.equal(
        a(Many.of(Value.of(String)), m =>
            m.add().set("foo") ||
            m.add().set("bar") ||
            m.last().get()),
        "bar")
    assert.equal(
        a(Many.of(Value.of(String)), m =>
            m.add().set("foo") ||
            m.add().set("bar") ||
            m.add().set("baz") ||
            m.last(1).get()),
        "bar")

    class A { }

    assert.same(Many.of(One.of(A)),
        Many.of(One.of(A)),
        [])
    assert.same(Many.of(One.of(A)),
        a(Many.of(One.of(A)), m =>
            m.add() && m),
        [null])
    assert.same(Many.of(One.of(A)),
        a(Many.of(One.of(A)), m =>
            m.add().create() && m),
        [{ "type": "A", "fields": {} }])
    assert.same(Many.of(One.of(A)),
        a(Many.of(A), m =>
            m.add().create() && m),
        [{ "type": "A", "fields": {} }])
    assert.same(Many.of(One.of(A)),
        a(Many.of(One.of(A)), m =>
            m.add().create() &&
            m.add().create() && m),
        [{ "type": "A", "fields": {} }, { "type": "A", "fields": {} }])

    assert.same(Many.of(Many.of(One.of(A))),
        Many.of(Many.of(One.of(A))),
        [])
    assert.same(Many.of(Many.of(One.of(A))),
        a(Many.of(Many.of(One.of(A))), m =>
            m.add() && m),
        [[]])
    assert.same(Many.of(Many.of(One.of(A))),
        a(Many.of(Many.of(One.of(A))), m =>
            m.add().add().create() && m),
        [[{ "type": "A", "fields": {} }]])
})

specify('Map', () => {
    assert.same(Map.of(Value.of(String)),
        Map.of(Value.of(String)),
        {})
    assert.same(Map.of(Value.of(String)),
        a(Map.of(Value.of(Number)), m =>
            m.put('foo').set(42) || m),
        { foo: 42 })
})

specify('Reference', () => {
    class ReferencedObject { }

    class TwoReferences {
        constructor(fn) {
            this.first = One.of(ReferencedObject)
            this.second = One.of(ReferencedObject)
            if (fn) fn(this)
        }
    }

    assert.equal(
        a(new TwoReferences(), o =>
            o.first.create(f => f.foo = 42) &&
            o.second.set(o.first.get()) &&
            o.second.get()),
        { "foo": 42 })

    assert.same(new TwoReferences,
        new TwoReferences(o =>
            o.first.create() &&
            o.second.set(o.first.get())),
        {
            "type": "TwoReferences", "fields": {
                "first": { "id": "@1", "type": "ReferencedObject", "fields": {} },
                "second": "@1"
            }
        })

    class ThreeReferences {
        constructor(fn) {
            this.first = One.of(ReferencedObject)
            this.second = One.of(ReferencedObject)
            this.third = One.of(ReferencedObject)
            if (fn) fn(this)
        }
    }

    assert.same(new ThreeReferences,
        new ThreeReferences(o =>
            o.first.create() &&
            o.second.set(o.first.get()) &&
            o.third.set(o.first.get())),
        {
            "type": "ThreeReferences", "fields": {
                "first": { "id": "@1", "type": "ReferencedObject", "fields": {} },
                "second": "@1",
                "third": "@1"
            }
        })

    class ManyReferences {
        constructor(fn) {
            this.first = One.of(ReferencedObject)
            this.second = Many.of(One.of(ReferencedObject))
            if (fn) fn(this)
        }
    }

    assert.same(new ManyReferences,
        new ManyReferences(o =>
            o.first.create() &&
            o.second.add().set(o.first.get()) &&
            o.second.add().set(o.first.get())),
        { "type": "ManyReferences", "fields": { "first": { "id": "@1", "type": "ReferencedObject", "fields": {} }, "second": ["@1", "@1"] } })
})

specify('Formula', () => {
    const formula = Formula.for(Value.of(String))

    assert.equal(formula.execute().exists(), false)

    formula.set((result, foo, bar) =>
        result.set(foo.toUpperCase() + bar.toUpperCase()))

    assert.equal(formula.execute("foo", "bar").get(), "FOOBAR")
    assert.roundtrip(Formula.for(Value.of(String)),
        formula, f => f.execute("one", " two").get(),
        "ONE TWO")
})

specify('Either', () => {
    class A { }

    assert.same(Either.of(One.of(A), Value.of(String)),
        Either.of(One.of(A), Value.of(String)),
        { "picked": null, "object": null })

    assert.same(Either.of(One.of(A), Value.of(String)),
        a(Either.of(One.of(A), Value.of(String)), e =>
            e.pickOneOfA().create() && e),
        { "picked": "OneOfA", "object": { "type": "A", "fields": {} } })

    assert.same(Either.of(One.of(A), Value.of(String)),
        a(Either.of(One.of(A), Value.of(String)), e =>
            e.pickValueOfString().set('foo') || e),
        { "picked": "ValueOfString", "object": "foo" })
})