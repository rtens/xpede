let e = (() => {
    const Expedition = require('./src/expedition')
    const { Storing, Loading, Dashboard } = require('./src/persistence')

    const file = process.env.FILE
    const store = file => 'store/' + file + '.json'
    const out = (file) => 'out/' + file + ext

    let loaded
    try {
        loaded = Loading.fromFile(store(file)).inflated(new Expedition)
    } catch {
        loaded = new Expedition
    }

    loaded.save = as => {
        new Storing(e).toFile(store(as || file))
        new Dashboard(e).status(out(as || file, '_status.html'))
        new Dashboard(e).goals(out(as || file, '_goals.html'))
    }

    return loaded
})()