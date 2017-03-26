'use strict';

function Member(opts) {
    this.meta = opts.meta || undefined
    this.host = opts.host
    this.port = opts.port
    this.state = opts.state || Member.State.Alive
}

Member.State = {
    Alive: 0,
    Suspect: 1,
    Faulty: 2
}

module.exports = Member;
