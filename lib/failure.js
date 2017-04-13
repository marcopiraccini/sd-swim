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

    // Current member list
    this.members = this.sdswim.members

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

  /**
   * - Check if member list is empty. If so, exit
   * - Select a random member, between the ones in state "ALIVE" & "SUSPECT" (not FAULTY)
   */
  _ping() {

    const pingableMembers = this.sdswim._getOtherMembers().filter(({node: {state}}) => {
      return state !== this.sdswim.nodeStates.FAULTY
    })
    if (!pingableMembers.length) {
      return
    }
    const member = pingableMembers[Math.floor(Math.random() * pingableMembers.length)]
    this.logger.debug(`Memebr selected for ping ${member}`)

    // Maintain the timeouts for each member of the group. If not received, sent pingReq.
    // Change the memberlist accordingly, and register updates to be propagated.
  }

  /************** MESSAGES HANDLERS ************************/
  pingReceived() { /* TODO */}
  pingReqReceived() { /* TODO */}
  ackReceived() { /* TODO */}

}
module.exports = Failure
