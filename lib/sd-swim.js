'use strict'

const events = require('events')
const util = require('util')
const pino = require('pino')
const Client = require('./client')
const Server = require('./server')
const Messages = require('./messages')

function SDSwim(opts) {
    this._opts = opts
    this.port = opts.port
    this.hosts = opts.hosts
    // this.status
    this.memberList = []
    this.logger = opts.logger ? opts.logger : pino()
    if (!opts.logger) {
      this.logger.level = opts.logLevel || 'info'
    }

    this.server = new Server(opts)
    this.messages = new Messages(opts)
    this.client = new Client(opts)
}

util.inherits(SDSwim, events.EventEmitter)

SDSwim.prototype.start = function start() {
}

SDSwim.prototype.getMembers = function getMembersList() {
  return this.memberList
}

module.exports = SDSwim
