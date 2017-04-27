'use strict'

// SD-SWIM main module. Starts the protocols

const {EventEmitter} = require('events')
const pino = require('pino')
const propagate = require('propagate')
const Net = require('./net')
const Update = require('./update')
const Failure = require('./failure')
const Join = require('./join')
const Members = require('./members')
const {states: {STARTED, STOPPED, JOINED}} = require('./states')

class SDSwim extends EventEmitter {
  constructor(opts) {
    super()
    this.opts = opts
    this.opts.sdswim = this

    // port
    if (opts.port === 0) { // 0 is a valid value (use random port)
      this.port = 0
    } else {
      this.port = opts.port || 11000
    }
    opts.port = this.port

    // logger
    this.logger = opts.logger ? opts.logger : pino()
    if (!opts.logger) {
      this.logger.level = opts.logLevel || 'info'
    }
    opts.logger = this.logger

    // algorithm parameters and their defaults
    this.opts.joinTimeout = this.joinTimeout = opts.joinTimeout || 5000
    this.opts.interval = this.interval  = opts.interval || 100
    this.opts.pingTimeout = this.pingTimeout = opts.pingTimeout || 20
    this.opts.pingReqTimeout = this.pingReqTimeout  = opts.pingReqTimeout || 60
    this.opts.pingReqGroupSize = this.pingReqGroupSize  = opts.pingReqGroupSize || 3
    this.opts.updatesMaxSize = this.updatesMaxSize = opts.updatesMaxSize || 50
    this.opts.suspectTimeout = this.suspectTimeout = opts.suspectTimeout || 100

    // states and initial state
    this.state = STOPPED
    this.opts.initialHosts = this.initialHosts = opts.hosts

    // internal modules
    this.opts.update = this.update = new Update(opts)     // updates queue
    this.opts.net = this.net = new Net(opts)           // network comm
    this.opts.members = this.members = new Members(opts)   // members list

    // protocols modules
    this.opts.join = this.join = new Join(opts)         // join protocol
    this.opts.failure = this.failure = new Failure(opts)   // failure detector

    // NET messages managed explicitly
    this.net.on('unknown', (sender, msg) => this.unknownReceived(sender, msg))
    this.net.on('up', port => {
      this.port = port
      this.state = STARTED
      this.emit('up', port)
    })

    // JOIN events
    this.join.on('join-timeout', err => this.emit('error', err))
    this.join.on('joined', () => {
      this.state = JOINED
      this.logger.debug(`The node is now in state ${this.state}`)
      this.emit('joined')
    })

    // Bubble up events from the protocol modules
    propagate(['error'], this.net, this)
    propagate(this.failure, this)
    propagate(this.members, this)
  }

  get memberList() {
    return this.members.list;
  }

  get me() {
    return {host: this.host, port: this.port}
  }

  whoami() {
    return {host: this.host, port: this.port, state: this.state}
  }

  start(cb) {
    this.net.start(cb)   // start socket
    this.join.start()    // start join protocol
    this.failure.start() // start failure detector
  }

  stop(cb) {
    const self = this
    this.net.stop(() => {
      self.join.stop()
      self.failure.stop()
      self.state = STOPPED
      return cb()
    })
  }

  /************** MESSAGES HANDLERS ************************/
  unknownReceived(sender, msg) {
    this.logger.debug(`Unknown Message received ${sender}: ${msg}`)
  }
}

module.exports = SDSwim
