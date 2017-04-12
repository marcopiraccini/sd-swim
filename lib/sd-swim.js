'use strict'

// SD-SWIM main module. Starts the protocls and maintain the members list.

const {EventEmitter} = require('events')
const pino = require('pino')
const _ = require('lodash')
const Net = require('./net')
const NodeStates = require('./nodeStates')
const Update = require('./update')
const Failure = require('./failure')
const Join = require('./join')

const states = {
  STARTED: 'STARTED',
  JOINED: 'JOINED',
  STOPPED: 'STOPPED'
}

class SDSwim extends EventEmitter {
  constructor(opts) {
    super()
    this.opts = opts
    this.opts.sdswim = this

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

    // states and initial state
    this.states = states
    this.state = states.STOPPED
    this.initialHosts = opts.hosts

    // Internal Modules
    this.net = new Net(opts)           // network comm
    this.update = new Update(opts)     // updates queue
    this.join = new Join(opts)         // join protocol
    this.failure = new Failure(opts)   // failure detector

    // member list
    this._members = []

    // NET messages managed directly by this module
    this.net.on('unknown', (sender, msg) => this.unknownReceived(sender, msg))
    this.net.on('up', port => {
      this.port = port
      this.state = states.STARTED
      this.emit('up', port)
    })
    this.net.on('error', err => this.emit('error', err))
  }

  get members() {
    return this._members;
  }

  whoami() {
    return {host: this.host, port: this.port, state: this.state}
  }

  start(cb) {
    this.net.start(cb)
    this.join.start()  // start join protocol
  }

  stop(cb) {
    const self = this
    this.net.stop(() => {
      this.join.stop()
      self.state = states.STOPPED
      return cb()
    })
  }

  /**
   * Update member list with a node and state and add the updates to be propagated.
   * The node is updated if already in list or added if not.
   * // TODO: after an interval, clear the FAULTY nodes
   * Default: add himself as ALIVE and setBy as himself
   */
  _updateMember(node = {host: this.host, port: this.port}, state = NodeStates.ALIVE, setBy = {host: this.host, port: this.port}) {
    const current = _.find(this._members, el => (el.node.host === node.host  && el.node.port === node.port))

    if (current) {
      current.setBy = setBy
      current.state = state
    } else {
      this._members.push({node, setBy, state})
    }
    this.emit('updated-members', this._members)
    this.update.addUpdate(node, setBy, state)
  }

  /************** MESSAGES HANDLERS ************************/
  unknownReceived(sender, msg) {
    this.logger.debug(`Unknown Message received ${sender}: ${msg}`)
  }
}

module.exports = SDSwim
