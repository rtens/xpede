const { Storing, Loading } = require('./persistence')

function specify(name, tests) {
    if (!tests) return console.log('\n? ' + name)

    try {
        tests()
        console.log('\n✓ ' + name)
    } catch (e) {
        if (e.message.startsWith('Expected')) {
            const line = e.stack.split('\n').find(l => l.trim().startsWith('at ') && !l.split(':')[0].endsWith('/spec.js'))
            console.error('\n❌ ' + name + '\n' + line.trim() + '\n\n' + e.message + '\n')
        } else {
            console.error('\n❌ ' + name + '\n\n' + e.stack + '\n')
        }
    }
}

specify.skip = name => console.log('\n> ' + name)

function equal(actual, expected) {
    if (JSON.stringify(actual) != JSON.stringify(expected))
        throw new Error("Expected: " + JSON.stringify(expected) + "\n but got: " + JSON.stringify(actual))
}

function same(object, actual, expected) {
    const deflated = new Storing(actual).asString()
    equal(JSON.parse(deflated), expected)

    const reDeflated = new Storing(Loading.fromString(deflated).inflated(object)).asString()
    equal({re: JSON.parse(reDeflated)}, {re: expected})
}

function roundtrip(object, actual, fn, expected) {
    const inflated = Loading.fromString(new Storing(actual).asString()).inflated(object)
    equal(fn(inflated), expected)
}

module.exports = {
    specify,
    assert: {
        same,
        equal,
        roundtrip
    }
}