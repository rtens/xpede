const { Value, Many } = require('../model')

class Party {
    constructor() {
        this.name = Value.of(String)
        this.members = Many.of(Party)
    }
}
module.exports = Party