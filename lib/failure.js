'use strict'

// Failure Detector Module

const {EventEmitter} = require('events')
class Failure extends EventEmitter {

  constructor(opts) {
    super()
    this.sdswim = opts.sdswim
    this.net = this.sdswim.net

    // Failure detector options
    this.interval = this.sdswim.interval || 100
    this.pingTimeout = this.sdswim.pingTimeout || 20
    this.pingReqTimeout  = this.sdswim.pingReqTimeout || 60
    this.pingReqGroupSize  = this.sdswim.pingReqGroupSize || 3

    // NET messages managed by this module
    this.net.on('ping', (sender, msg) => this.failure.pingReceived(sender, msg))
    this.net.on('ping-req', (sender, msg) => this.failure.pingReqReceived(sender, msg))
    this.net.on('ack', (sender, msg) => this.failure.ackReceived(sender, msg))
  }

  /**
   * Starts the failure detection algorithm
   */
  start() {
    this.pingInterval = setInterval(this._ping.bind(this), this.interval)
  }

  stop() {
    clearInterval(this.pingInterval);
  }

  _ping() {
    // TODO
    // Check if member list is present. If not, do nothing
    // From the member list, esclude myself
    // Select the random group for the ping
    // Maintain the timouts for each memebr of the group. If not received, sent pingReq.
    // Change the memberlist accordingly, and register updates to be propagated. 
  }

  /************** MESSAGES HANDLERS ************************/
  pingReceived() { /* TODO */}
  pingReqReceived() { /* TODO */}
  ackReceived() { /* TODO */}

}
module.exports = Failure
