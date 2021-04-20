const fs = require('fs')
const { Loading } = require('./persistence')
const Expedition = require('./aggregates/expedition')

module.exports = { toDashboard, updateDashboard }

function updateDashboard() {
    runIt(() => readExpeditions(process.env.FILES),
        expeditions => toDashboard(expeditions),
        dashboard => createOutput(dashboard),
        file => console.log('Updated ' + file))
}

function readExpeditions(files) {
    return files
        .split('\n')
        .map(f => Loading.fromFile(f)
            .inflated(new Expedition)
            .withCaching(true))
}

function toDashboard(expeditions) {
    return {
        weeks: 12,
        expeditions: expeditions.map(mapExpedition)
    }
}

function mapExpedition(e) {
    return {
        name: e.name.get(),
        summit: mapSignal(e.summit),
        waypoints: e.waypoints.all().map(mapSignal),
        status: e.status().getAll().map(mapStatus)
    }
}

function mapSignal(signal) {
    if (!signal.exists()) return null
    const s = signal.get()

    const mapped = {
        type: s.constructor.name,
        name: s.name.get(),
        description: s.description.get(),
        status: s.status().getAll().map(mapStatus)
    }

    switch (mapped.type) {
        case 'Goal': return mapGoal(s, mapped)
        case 'Target': return mapTarget(s, mapped)
    }
}

function mapGoal(g, indicator) {
    return {
        ...indicator,
        reached: g.isReached(),
        coordinates: g.coordinates.all().map(mapCoordinate),
        pace: g.pace.all().map(mapSignal),
        subs: g.subs.all().map(mapSignal)
    }
}

function mapCoordinate(coordinate) {
    return {
        locked: coordinate.get().locked.get(false),
        indicator: mapSignal(coordinate.get().indicator)
    }
}

function mapTarget(t, indicator) {
    return {
        ...indicator,
        bad: t.bad.get(),
        good: t.good.get()
    }
}

function mapStatus(d) {
    return {
        at: d.at.get().toISOString(),
        score: d.score.get()
    }
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