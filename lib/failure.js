'use strict'

// Failure Detector Module
// Events emitted:
// - ping:           when ping is sent.     Arg: target
// - ack:            when ack is received.   Arg: sender

const {EventEmitter} = require('events')

class Failure extends EventEmitter {

  constructor(opts) {
    super()
    this.sdswim = opts.sdswim
    this.net = this.sdswim.net
    this.members = this.sdswim.members
    this.logger = this.sdswim.logger

    // Failure detector options
    this.interval = this.sdswim.interval || 100
    this.pingTimeout = this.sdswim.pingTimeout || 20
    this.pingReqTimeout  = this.sdswim.pingReqTimeout || 60
    this.pingReqGroupSize  = this.sdswim.pingReqGroupSize || 3

    // NET messages managed by this module
    this.net.on('ping', (sender, msg) => this.pingReceived(sender, msg))
    this.net.on('ping-req', (sender, msg) => this.pingReqReceived(sender, msg))
    this.net.on('ack', (sender, msg) => this.ackReceived(sender, msg))

    // Active timers
    this.pingTimers = {}
    this.pingReqTimers = {}

    this.getRandomMember = (arr) => (arr[Math.floor(Math.random() * arr.length)])
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

  _key({host, port}) {
    return `${host}:${port}`
  }

  /**
   * - Check if member list is empty. If so, exit
   * - Select a random member, between the ones in state "ALIVE" & "SUSPECT" (not FAULTY)
   */
  _ping() {
    const pingableMembers = this.members.getOtherNonFaultyMembers()
    if (!pingableMembers.length) {
      return // no candidates
    }
    const member = this.getRandomMember(pingableMembers)
    this.logger.debug(`Member selected for ping: ${member}`)
    const key = this._key(member)

    this.pingTimers[key] = (function pingTimeout() {
      delete this.pingTimers[key]                   // remove ping timer
      this._pingReq(member)   // trigger ping-req
    }, this.pingTimeout)

    const updates = [] // TODO: populate
    this.net.sendPing(member.node, updates)
    this.emit('ping', member)
  }

 /**
  *  Trigger the ping req (after a ping timeout)
  */
  _pingReq(target) {
    this.logger.debug(`ping-req to ${target}`)
    // Get pingable members, escluding the the target
   const pingableMembers = this.members.getOtherNonFaultyMembers([target])

   // Random targets for pingReq
   var targets = [];
   for (var i = 0; i < this.pingReqGroupSize; i++) {
      targets.push(this.getRandomMember(pingableMembers))
   }

    // TODO: for each target, sends a ping-req
  }

  /************** MESSAGES HANDLERS ************************/
  pingReceived({sender: {host, port}}, msg) {
    const self = this
    self.logger.debug(`Received PING message from ${host}:${port} of type: ${msg.type}`)
    // TODO: Change the memberlist accordingly, and register updates to be propagated.
  }

  pingReqReceived({sender: {host, port}}, msg) {
    const self = this
    self.logger.debug(`Received PING-REQ message from ${host}:${port} of type: ${msg.type}`)
    // TODO: Relay the ping
  }

  ackReceived({sender}, msg) {
    const self = this
    self.logger.debug(`Received ACK message from ${sender.host}:${sender.port} of type: ${msg.type}`)
    const key = this._key(sender)

    if (this.pingTimers[key]) {
      clearInterval(this.pingTimers[key])
      delete this.pingTimers[key]
      // TODO: PING ACK: Change the memberlist accordingly, and register updates to be propagated.
      return
    }

    // ACK from ping-req:
    clearInterval(this.pingReqTimers[key])
    delete this.pingReqTimers[key]
    // Sends an ack to original target
    // If the timout ids reaced, sends a "failure" message. Alive otherwise
    // TODO: implement "Suspect" algorithm
  }

}
module.exports = Failure
