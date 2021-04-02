
function save(as) {
    const { Storing } = require('./src/persistence')

    new Storing($).toFile(as || process.env.FILE)
}

const $ = (() => {
    const { Loading } = require('./src/persistence')
    const Aggregate = require('./src/aggregates/' + process.env.AGGREGATE)

    console.log()
    console.log('Assigning ' + Aggregate.name + ' to $')
    try {
        return Loading.fromFile(process.env.FILE).inflated(new Aggregate)
    } catch {
        console.log('Created a new ' + Aggregate.name)
        return new Aggregate
    }
})()