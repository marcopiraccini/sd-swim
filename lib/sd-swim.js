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

const nodeStates = {
  ALIVE: 'ALIVE',
  SUSPECT: 'SUSPECT',
  FAULTY: 'FAULTY'
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

  // TODO: Add all the algorithm parameters and joining timeout

  // initial state
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

  // messages
  this.server.on('join', (sender, msg) => this.joinReceived(sender, msg))
  this.server.on('update-join', (sender, msg) => this.updateJoinReceived(sender, msg))
  this.server.on('ping', (sender, msg) => this.pingReceived(sender, msg))
  this.server.on('ping-req', (sender, msg) => this.pingReqReceived(sender, msg))
  this.server.on('ack', (sender, msg) => this.ackReceived(sender, msg))
  this.server.on('unknown', (sender, msg) => this.unknownReceived(sender, msg))
}

util.inherits(SDSwim, EventEmitter)

SDSwim.prototype.whoami = function whoami() {
    return {
      host: this.host,
      port: this.port,
      state: this.state
    }
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

SDSwim.prototype.addMember = function getMembersList(node = {host: this.host, port: this.port}, state = nodeStates.ALIVE) {
  const setBy = {host: this.host, port: this.port}
  this.memberList.push({node, state, setBy})
  this.emit('updated-members', this.memberList)
}


/************** MESSAGES HANDLERS ************************/

SDSwim.prototype.join = function join() {
  // TODO: add a join timeout. If the timout is reached, the node must stop and an error must be thrown
  if (this.initialHosts) {
    this.client.sendJoin(this.port, this.initialHosts)
  }
}

SDSwim.prototype.joinReceived = function joinReceived({sender: {host, port}}, msg) {
  this.logger.debug(`Received JOIN message from ${host}:${port} of type: ${msg.type}`)
  // if I don't know my host yet, saves it and add myself to the current member list
  if (!this.host) {
    this.host = msg.target.host
    this.addMember()
  }
  const target = {host, port: msg.sender.port}
  this.addMember(target)  // the sender address if from UDP, the sender listener port from the message
  this.client.sendUpdateJoin(target, msg.token, this.memberList)
}

SDSwim.prototype.updateJoinReceived = function updateJoinReceived({sender: {host, port}}, msg) {
  this.logger.debug(`Received UPDATE_JOIN message from ${host}:${port} of type: ${msg.type}`)
  this.memberList = msg.memberList // set the whole memberList
  this.emit('updated-members', this.memberList)
}

SDSwim.prototype.pingReceived = function pingReceived() { /* TODO */}
SDSwim.prototype.pingReqReceived = function pingReqReceived() { /* TODO */}
SDSwim.prototype.ackReceived = function ackReceived() { /* TODO */}
SDSwim.prototype.unknownReceived = function unknownReceived() { /* TODO */}

module.exports = SDSwim
