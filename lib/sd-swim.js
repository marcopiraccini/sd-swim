'use strict'

const events = require('events')
const util = require('util')
const pino = require('pino')
const Client = require('./client')

function SDSwim(opts) {
    this._opts = opts;
    this.port = opts.port
    this.host = opts.host
    // this.status 
    this.client = new Client(opts)
    this.memberList = []
    this.logger = opts.logger ? opts.logger : pino()
    if (!opts.logger) {
      this.logger.level = opts.logLevel || 'info'
    }
}

util.inherits(SDSwim, events.EventEmitter);

SDSwim.prototype.getMembers = function getMembersList() {
  return this.memberList
}

module.exports = SDSwim;
