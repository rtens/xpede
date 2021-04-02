class Exporting {
    constructor(expedition) {
        this.expedition = expedition
    }

    generate(filename) {
        this._insert('src/dashboard.html', this.expedition.status(), filename)
    }

    _insert(input, model, output) {
        const template = fs.readFileSync(input, 'utf8')
        fs.writeFileSync(output, template
            .replace(/\/\*\*STATUS\*\/.*\/\*STATUS\*\*\//, JSON.stringify(model)))
    }
}

module.exports = {
    Exporting
}