const { Storing, Loading } = require('./persistence')

function specify(name, tests) {
    try {
        tests()
    } catch (e) {
        if (e.message.startsWith('Expected')) {
            const line = e.stack.split('\n').find(l => l.trim().startsWith('at ') && !l.split(':')[0].endsWith('/spec.js'))
            console.error('\n[' + name + '] failed ' + line.trim() + '\n' + e.message)
        } else {
            console.error('\n[' + name + '] failed\n\n' + e.stack)
        }
    }
}

specify.skip = name => console.log('\n[' + name + '] skipped')

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