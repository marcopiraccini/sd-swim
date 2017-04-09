'use strict'

const {EventEmitter} = require('events')
const util = require('util')
const pino = require('pino')
const Net = require('./net')

const states = {
  STARTED: 'STARTED',
  JOINED: 'JOINED',
  STOPPED: 'STOPPED'
}

const nodeStates = {
  ALIVE: 0,
  SUSPECT: 1,
  FAULTY: 2
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

  // Algorithm parameters. TODO: Complete
  this.joinTimeout = opts.joinTimeout || 30000

  // initial state
  this.state = states.STOPPED

  this.net = new Net(opts)

  this.initialHosts = opts.hosts
  this.memberList = []

  this.net.on('up', port => {
    this.port = port
    this.state = states.STARTED
    this.emit('up', port)
  })
  this.net.on('error', err => this.emit('error', err))

  // messages
  this.net.on('join', (sender, msg) => this.joinReceived(sender, msg))
  this.net.on('update-join', (sender, msg) => this.updateJoinReceived(sender, msg))
  this.net.on('ping', (sender, msg) => this.pingReceived(sender, msg))
  this.net.on('ping-req', (sender, msg) => this.pingReqReceived(sender, msg))
  this.net.on('ack', (sender, msg) => this.ackReceived(sender, msg))
  this.net.on('unknown', (sender, msg) => this.unknownReceived(sender, msg))
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
  this.net.start(cb)
  this.join()
}

SDSwim.prototype.stop = function stop(cb) {
  const self = this
  this.net.stop(() => {
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

SDSwim.prototype.updateMembers = function getMembersList(memberList) {
  // TODO: first naive implementation: here the full list is replaced by the new one.
  this.memberList = memberList //
  this.emit('updated-members', this.memberList)
}

/************** MESSAGES HANDLERS ************************/

/**
 * RECEIVED JOIN MESSAGE(S) TO EACH `this.intialHosts`
 */
SDSwim.prototype.join = function join() {
  if (this.initialHosts) {
    this.net.sendJoin(this.initialHosts)
    setTimeout(function checkJoinTimeout() {
      if (!this.state === states.JOINED) {
        throw new Error(`Timeout triggered in joining with ${this.initialHosts}`)
      }
    }, this.joinTimeout)
  }
}

/**
 * RECEIVED JOIN MESSAGE.
 */
SDSwim.prototype.joinReceived = function joinReceived({sender: {host, port}}, msg) {
  this.logger.debug(`Received JOIN message from ${host}:${port} of type: ${msg.type}`)
  // if I don't know my host yet, saves it and add myself to the current member list
  if (!this.host) {
    this.host = msg.target.host
    this.addMember()
  }
  const target = {host, port}
  this.addMember(target)
  this.net.sendUpdateJoin(target, msg.token, this.memberList)
}

/**
 * RECEIVE UPDATE_JOIN MESSAGE. In general we will receive more tha one message. Only one is
 * enough to change the state to JOINED, but we process the answer updating the memberList
 * list for each message
 */
SDSwim.prototype.updateJoinReceived = function updateJoinReceived({sender: {host, port}}, msg) {
  this.logger.debug(`Received UPDATE_JOIN message from ${host}:${port} of type: ${msg.type}`)
  if (!this.host) {   // if I don't know my host yet, saves it.
    this.host = msg.target.host
  }
  this.updateMembers(msg.memberList)
  this.state = states.JOINED
}

SDSwim.prototype.pingReceived = function pingReceived() { /* TODO */}
SDSwim.prototype.pingReqReceived = function pingReqReceived() { /* TODO */}
SDSwim.prototype.ackReceived = function ackReceived() { /* TODO */}
SDSwim.prototype.unknownReceived = function unknownReceived() { /* TODO */}

/***************************************************************/

module.exports = SDSwim
