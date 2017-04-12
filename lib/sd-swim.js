'use strict'

const {EventEmitter} = require('events')
const pino = require('pino')
const Net = require('./net')
const NodeStates = require('./nodeStates')
const Update = require('./update')

const states = {
  STARTED: 'STARTED',
  JOINED: 'JOINED',
  STOPPED: 'STOPPED'
}

class SDSwim extends EventEmitter {
  constructor(opts) {
    super()

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

    // Algorithm parameters and their defaults
    this.joinTimeout = opts.joinTimeout || 5000
    this.interval  = opts.interval || 100
    this.disseminationFactor = opts.disseminationFactor || 15
    this.pingTimeout = opts.pingTimeout || 20
    this.pingReqTimeout  = opts.pingReqTimeout || 60
    this.pingReqGroupSize  = opts.pingReqGroupSize || 3

    // initial state
    this.state = states.STOPPED

    this.net = new Net(opts)
    this.update = new Update(opts)

    this.initialHosts = opts.hosts
    this._members = []

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

  get members() {
    return this._members;
  }

  whoami() {
    return {host: this.host, port: this.port, state: this.state}
  }

  start(cb) {
    this.net.start(cb)
    this.join()
  }

  stop(cb) {
    const self = this
    this.net.stop(() => {
      self.state = states.STOPPED
      return cb()
    })
  }

  /**
   * Add ALIVE node to member list and add the updates to be propagated
   */
  _addAliveMember(node = {host: this.host, port: this.port}, state = NodeStates.ALIVE) {
    const setBy = {host: this.host, port: this.port}
    this._members.push({node, setBy, state})
    this.emit('updated-members', this._members)
    this.update.addAliveUpdate(node, setBy)
  }

  /************** MESSAGES HANDLERS ************************/

  /**
   * RECEIVED JOIN MESSAGE(S) TO EACH `this.intialHosts`
   */
  join() {
    const self = this
    if (this.initialHosts && this.initialHosts.length > 0) {
      this.net.sendJoin(this.initialHosts)
      setTimeout(function checkJoinTimeout() {
        if (this.state !== states.JOINED) {
          self.emit('error', new Error(`Timeout triggered in joining with ${JSON.stringify(self.initialHosts)}`))
        }
      }, this.joinTimeout)
    }
  }

  /**
   * RECEIVED JOIN MESSAGE.
   */
  joinReceived({sender: {host, port}}, msg) {
    this.logger.debug(`Received JOIN message from ${host}:${port} of type: ${msg.type}`)
    // if I don't know my host yet, saves it and add myself to the current member list
    if (!this.host) {
      this.host = msg.target.host
      this._addAliveMember()
    }
    const target = {host, port} // The new node
    this._addAliveMember(target)
    this.net.sendUpdateJoin(target, this._members)
  }

  /**
   * RECEIVE UPDATE_JOIN MESSAGE. In general we will receive more tha one message. Only one is
   * enough to change the state to JOINED, but we process the answer updating the members list
   * list for each message.
   */
  updateJoinReceived ({sender: {host, port}}, msg) {
    this.logger.debug(`Received UPDATE_JOIN message from ${host}:${port} of type: ${msg.type}`)
    // We process only first update join the others are silently ignored
    if (!this.host) {   // First update join received
      this.host = msg.target.host
      // The full list is replaced by the new one.
      this._members = msg.members //
      this.state = states.JOINED
      this.emit('updated-members', this._members)
      this.logger.debug(`The node is now in state ${this.state}`)
    }
  }

  pingReceived() { /* TODO */}
  pingReqReceived() { /* TODO */}
  ackReceived() { /* TODO */}
  unknownReceived() { /* TODO */}
}

module.exports = SDSwim
