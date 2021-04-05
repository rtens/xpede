
function save(as) {
    const { Storing } = require('./persistence')

    new Storing($).toFile(as || process.env.FILE)
}

function quit(saveAs) {
    save(saveAs)
    process.exit()
}

const $ = (() => {
    const { Loading } = require('./persistence')
    const Aggregate = require('./aggregates/' + process.env.AGGREGATE)

    console.log('You are editing ' + process.env.FILE.substr(3))
    console.log('Use save() and quit()')
    console.log('$ = ' + Aggregate.name)
    console.log()
    try {
        return Loading.fromFile(process.env.FILE).inflated(new Aggregate)
    } catch {
        console.log('Created a new ' + Aggregate.name)
        console.log()
        return new Aggregate
    }
})()