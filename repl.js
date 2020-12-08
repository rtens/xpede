let e = (() => {
    const Expedition = require('./src/expedition')
    const { Storing, Loading, Dashboard } = require('./src/persistence')

    const file = process.env.FILE
    const store = file => 'store/' + file + '.json'
    const out = (file, ext) => 'out/' + file + ext

    let loaded
    try {
        loaded = Loading.fromFile(store(file)).inflated(new Expedition)
    } catch {
        loaded = new Expedition
    }

    loaded.save = as => {
        new Storing(e).toFile(store(as || file))
        new Dashboard(e).generate(out(as || file, '.html'))
    }

    return loaded
})()