'use strict'

const {EventEmitter} = require('events')
const util = require('util')
const pino = require('pino')
const Client = require('./client')
const Server = require('./server')

const states = {
  STARTED: 'STARTED',
  JOINED: 'JOINED',
  STOPPED: 'STOPPED'
}

function SDSwim(opts) {
  if (!(this instanceof SDSwim)) {
    return new SDSwim(opts)
  }

  this.opts = opts

  // Port
  if (opts.port === 0) { // 0 is a valid value (use random port)
    this.port = 0
  } else {
    this.port = opts.port || 11000
  }
  opts.port = this.port

  // Logger
  this.logger = opts.logger ? opts.logger : pino()
  if (!opts.logger) {
    this.logger.level = opts.logLevel || 'info'
  }
  opts.logger = this.logger

  // TODO: Add all the algorithm parameters
  // TODO: Add joining timeout
  this.state = states.STOPPED

  this.server = new Server(opts)
  this.client = new Client(opts)

  this.initialHosts = opts.hosts
  this.memberList = []

  this.server.on('up', port => {
    this.port = port
    this.state = states.STARTED
    this.emit('up', port)
  })
  this.server.on('error', err => this.emit('error', err))
  this.server.on('join', (sender, msg) => this.joinReceived(sender, msg))
}

util.inherits(SDSwim, EventEmitter)

SDSwim.prototype.whoami = function whoami() {
    return {
      host: this.host,
      port: this.port,
      state: this.state
    }
}

SDSwim.prototype.join = function join() {
  // TODO: add a join timeout
  if (this.initialHosts) {
    this.client.sendJoin(this.port, this.initialHosts)
  }
}

SDSwim.prototype.joinReceived = function processMessage({sender: {host, port}}, msg) {
  this.logger.debug(`Received message from ${host}:${port} of type: ${msg.type}`)
  // if I don't know my host yes, saves it
  if (!this.host) {
    this.host = msg.target.host
  }

  // // TODO: Update member list with the new member
  //
  // const target = {host}
  // this.client.sendUpdateJoin(target, msg.token, this.memberList)
}

SDSwim.prototype.start = function start(cb) {
  this.server.start(cb)
  this.join()
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
