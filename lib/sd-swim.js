'use strict'

// SD-SWIM main module. Starts the protocols

const {EventEmitter} = require('events')
const pino = require('pino')
const propagate = require('propagate')
const Net = require('./net')
const Dissemination = require('./dissemination')
const Failure = require('./failure')
const Join = require('./join')
const Metadata = require('./metadata')
const Members = require('./members')
const {states: {STARTED, STOPPED, JOINED}} = require('./states')

class SDSwim extends EventEmitter {
  constructor (opts) {
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
    this.opts.joinTimeout = this.joinTimeout = opts.joinTimeout || 2000
    this.opts.interval = this.interval = opts.interval || 100
    this.opts.pingTimeout = this.pingTimeout = opts.pingTimeout || 20
    this.opts.pingReqTimeout = this.pingReqTimeout = opts.pingReqTimeout || 60
    this.opts.pingReqGroupSize = this.pingReqGroupSize = opts.pingReqGroupSize || 3
    this.opts.updatesMaxSize = this.updatesMaxSize = opts.updatesMaxSize || 50
    this.opts.suspectTimeout = this.suspectTimeout = opts.suspectTimeout || 1000
    this.opts.disseminationFactor = this.disseminationFactor = opts.disseminationFactor || 15

    // Metadata distribution sub-protocol
    this.metadataDistributionTimeout = opts.metadataDistributionTimeout || 500

    // states and initial state
    this.state = STOPPED
    this.opts.initialHosts = this.initialHosts = opts.hosts

    // internal modules
    this.opts.dissemination = this.dissemination = new Dissemination(opts)     // dissemination module
    this.opts.net = this.net = new Net(opts)                // network comm
    this.opts.members = this.members = new Members(opts)    // members list
    this.opts.metadata = this.metadata = new Metadata(opts) // metadata distribution sub-protocol

    // protocols modules
    this.opts.join = this.join = new Join(opts)         // join protocol
    this.opts.failure = this.failure = new Failure(opts)   // failure detector

    // NET messages managed explicitly
    this.net.on('unknown', (sender, msg) => this.logger.debug(`Unknown Message received ${sender}: ${msg}`))

    this.net.on('up', port => {
      this.port = port
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
    propagate(this.failure, this)
    propagate(this.members, this)
  }

  // return the ALIVE and SUSPECT nodes
  get memberList () {
    return this.members.list.map(({node}) => node)
  }

  get me () {
    return {host: this.host, port: this.port}
  }

  whoami () {
    return {host: this.host, port: this.port, state: this.state}
  }

  start (cb) {
    const callback = cb || (() => {})
    return new Promise((resolve, reject) => {
      this.net.start((err, port) => {
        if (err) {
          this.emit('error', err)
          callback(err)
          return reject(err)
        }
        this.join.start()    // start join protocol
        this.failure.start() // start failure detector
        this.metadata.start() // start failure detector
        this.state = STARTED
        callback(null, port)
        return resolve(port)
      })
    })
  }

  stop (cb) {
    const callback = cb || (() => {})
    return new Promise((resolve, reject) => {
      this.join.stop()    // stop join protocol
      this.failure.stop() // stop failure detector
      this.metadata.stop() // start failure detector
      this.net.stop(err => {
        if (err) {
          callback(err)
          return reject(err)
        }
        this.state = STOPPED
        callback()
        return resolve()
      })
    })
  }
}
module.exports = SDSwim
