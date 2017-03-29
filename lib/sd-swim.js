'use strict'

const {EventEmitter} = require('events')
const util = require('util')
const pino = require('pino')
const Client = require('./client')
const Server = require('./server')
const Messages = require('./messages')

function SDSwim(opts) {
  if (!(this instanceof SDSwim)) {
    return new SDSwim(opts)
  }
  this.opts = opts

  this.port = opts.port
  this.hosts = opts.hosts
  this.logger = opts.logger ? opts.logger : pino()
  if (!opts.logger) {
    this.logger.level = opts.logLevel || 'info'
  }

  this.server = new Server(opts)
  this.messages = new Messages(opts)
  this.client = new Client(opts)
  this.memberList = []

  // There's a better way for event propagation?
  this.server.on('error', err => {
    this.emit('error', err)
  })
  this.server.on('up', ({port}) => { // not interested in host
    this.emit('up', port)
  })
}

util.inherits(SDSwim, EventEmitter)

SDSwim.prototype.whoami = function whoami() {
    return {
      host: this.host,
      port: this.port
    }
}

SDSwim.prototype.start = function start() {
  this.server.start()
}

SDSwim.prototype.getMembers = function getMembersList() {
  return this.memberList
}

module.exports = SDSwim
