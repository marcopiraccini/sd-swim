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

  // Default port and logger
  this.opts = opts
  this.port = opts.port || 11000    // We could also assume that the default is 0 => random port
  this.logger = opts.logger ? opts.logger : pino()
  if (!opts.logger) {
    this.logger.level = opts.logLevel || 'info'
  }
  opts.port = this.port
  opts.logger = this.logger

  // TODO: Add all the algorithm parameters
  // TODO: Add joining timeout
  // TODO: Add goobal state: STARTED, JOINED, STOPPED

  this.server = new Server(opts)
  this.messages = new Messages(opts)
  this.client = new Client(opts)

  this.initialHosts = opts.hosts
  this.memberList = []

  this.server.on('up', port => {
    this.port = port
    this.emit('up', port)
  })
  this.server.on('error', err => this.emit('error', err))
  this.server.on('message', this.processMessage)
}

util.inherits(SDSwim, EventEmitter)

SDSwim.prototype.whoami = function whoami() {
    return {
      host: this.host,
      port: this.port
    }
}

SDSwim.prototype.processMessage = function processMessage({host, port}, msg) {
  const message = this.messages.decodeMessage(msg)
  this.logger.debug(`Received message from ${host}:${port} of type: ${message.type}`)
}

SDSwim.prototype.start = function start(cb) {
  this.server.start(cb)
  this.join()
}

SDSwim.prototype.join = function join() {
  // TODO: add a join timeout
  if (this.initialHosts) {
  //  const messages = this.messages.joinMessages(this.initialHosts)
  //  this.client.sendJoinMessages(messages)
  }
}

SDSwim.prototype.stop = function stop(cb) {
  this.server.stop(cb)
}

SDSwim.prototype.getMembers = function getMembersList() {
  return this.memberList
}

module.exports = SDSwim
