const fs = require('fs')
const { Loading } = require('./persistence')
const Expedition = require('./aggregates/expedition')

// Export function for testing
if (!process.env.FILES) return module.exports = toDashboard

runIt(() => readExpeditions(process.env.FILES),
    expeditions => toDashboard(expeditions),
    dashboard => createOutput(dashboard),
    file => console.log('Created ' + file))

function toDashboard(expeditions) {
    return {
        weeks: 8,
        expeditions: expeditions.map(mapExpedition)
    }
}

function mapExpedition(e) {
    return {
        name: e.name.get(),
        summit: mapIndicator(e.summit),
        waypoints: e.waypoints.all().map(mapIndicator),
        status: e.status().getAll().map(mapDatum)
    }
}

function mapIndicator(indicator) {
    if (!indicator.exists()) return null
    const i = indicator.get()

    const mapped = {
        type: i.constructor.name,
        name: i.name.get(),
        description: i.description.get(),
        status: i.status().getAll().map(mapDatum)
    }

    switch (mapped.type) {
        case 'Goal': return mapGoal(i, mapped)
        case 'Target': return mapTarget(i, mapped)
    }
}

function mapGoal(g, indicator) {
    return {
        ...indicator,
        location: g.location.all().map(mapIndicator),
        progress: g.progress.all().map(mapIndicator)
    }
}

function mapTarget(t, indicator) {
    return {
        ...indicator,
        bad: t.bad.get(),
        good: t.good.get()
    }
}

function mapDatum(d) {
    return {
        at: d.at.get().toISOString(),
        value: d.value.get()
    }
}

function readExpeditions(files) {
    return files
        .split('\n')
        .map(f => require(f))
        .map(f => Loading.fromFlat(f).inflated(new Expedition).withCaching(true))
}

function createOutput(dashboard) {
    const output = 'out/dashboard.html'
    const template = fs.readFileSync('dashboard.html', 'utf8')
    fs.writeFileSync('../' + output, template
        .replace(/\/\*\*DASHBOARD\*\/.*\/\*DASHBOARD\*\*\//, JSON.stringify(dashboard, null, 2)))
    return output
}

function runIt(...commands) {
    let result = null
    commands.forEach(c => result = c(result))
}