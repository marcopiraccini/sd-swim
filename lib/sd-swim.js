'use strict'

const {EventEmitter} = require('events')
const util = require('util')
const pino = require('pino')
const Client = require('./client')
const Server = require('./server')
const Messages = require('./messages')

const states = {
    STARTED: 'STARTED',
    JOINED: 'JOINED',
    STOPPED: 'STOPPED',
}

function SDSwim(opts) {
  if (!(this instanceof SDSwim)) {
    return new SDSwim(opts)
  }

  this.opts = opts

  // Default port and logger
  if (opts.port === 0) { // 0 is a valid value (use random port)
    this.port = 0
  } else {
    this.port = opts.port || 11000
  }

  this.logger = opts.logger ? opts.logger : pino()
  if (!opts.logger) {
    this.logger.level = opts.logLevel || 'info'
  }
  opts.port = this.port
  opts.logger = this.logger

  // TODO: Add all the algorithm parameters
  // TODO: Add joining timeout
  this.state = states.STOPPED

  this.server = new Server(opts)
  this.messages = new Messages(opts)
  this.client = new Client(opts)

  this.initialHosts = opts.hosts
  this.memberList = []

  this.server.on('up', port => {
    this.port = port
    this.state = states.STARTED
    this.emit('up', port)
  })
  this.server.on('error', err => this.emit('error', err))
  this.server.on('message', this.processMessage)
}

util.inherits(SDSwim, EventEmitter)

SDSwim.prototype.whoami = function whoami() {
    return {
      host: this.host,
      port: this.port,
      state: this.state
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
    const messages = this.messages.joinMessages(this.initialHosts)
  //  this.client.sendJoinMessages(messages)
  }
}

SDSwim.prototype.stop = function stop(cb) {
  const self = this
  this.server.stop(() => {
    self.state = states.STOPPED
    return cb()
  })
}

SDSwim.prototype.getMembers = function getMembersList() {
  return this.memberList
}

module.exports = SDSwim
