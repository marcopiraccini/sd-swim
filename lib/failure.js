'use strict'

// Failure Detector Module.
// Events emitted:
// - ping:           when ping is sent.                                 Arg: target
// - ping-req:       when ping is triggered (multiple messages sent).   Arg: target
// - ack:            when ack is received.                              Arg: sender

const {EventEmitter} = require('events')
const {values} = require('lodash')

class Failure extends EventEmitter {

  constructor(opts) {
    super()
    this.members = opts.members
    this.logger = opts.logger
    this.net = opts.net

    // Failure detector options
    this.interval = opts.interval || 100
    this.pingTimeout = opts.pingTimeout || 20
    this.pingReqTimeout  = opts.pingReqTimeout || 60
    this.pingReqGroupSize  = opts.pingReqGroupSize || 3

    // NET messages managed by this module
    this.net.on('ping', (sender, msg) => this.pingReceived(sender, msg))
    this.net.on('ping-req', (sender, msg) => this.pingReqReceived(sender, msg))
    this.net.on('ack', (sender, msg) => this.ackReceived(sender, msg))

    // Active timers
    this.pingTimers = {}
    this.pingReqTimers = {}
  }

  /**
   * Starts the failure detection algorithm
   */
  start() {
    this.pingInterval = setInterval(this._ping.bind(this), this.interval)
  }

  stop() {
    clearInterval(this.pingInterval)
    values(this.pingTimers).forEach(timer => clearInterval(timer))
    values(this.pingReqTimers).forEach(timer => clearInterval(timer))
  }

  _key({host, port}) {
    return `${host}:${port}`
  }

  /**
   * - Check if member list is empty. If so, exit
   */
  _ping() {
    const member = this.members.getPingableMember()
    if (!member) { return } // no candidates
    const targetNode = member.node
    this.logger.debug(targetNode, 'Member selected for ping')
    const key = this._key(targetNode)

    this.pingTimers[key] = setTimeout(() => {
      delete this.pingTimers[key]            // remove ping timer
      this._pingReq(targetNode)              // trigger ping-req
    }, this.pingTimeout)

    this.net.sendPing(targetNode)
    this.emit('ping', targetNode)
  }

 /**
  * Trigger the ping-req and set a timeout. If this timeout expires, the node is
  * then
  */
  _pingReq(target) {
    this.logger.debug(target, `ping-req`)
    // Get pingable members, escluding the the target
    const pingableMembers = this.members.getPingReqGroupMembers(target, this.pingReqGroupSize)

    // NOTE: the ping req protocol make sense only if pingableMembers.length !== 0
    // If 0 (this WILL happen when two nodes), we will worngly mark directy as SUSPECT
    if (pingableMembers.length === 0)  {
      this.logger.debug(target, `Pingable members list empty, so marking the node as SUSPECT directly without any timer`)
      return this.members.updateToSuspect(target)
    }

     // We set only one timeout for all the requests
     const key = this._key(target)
     this.pingReqTimers[key] = setTimeout(() => {
       delete this.pingReqTimers[key]
       this.members.updateToSuspect(target) // NO ACK RECEIVED YET => UPDATE TO SUSPECT
     }, this.pingReqTimeout)
     for (const {node} of pingableMembers) {
       this.net.sendPingReq(node, target, this.members.me)
     }
     this.emit('ping-req', target)
  }

  // Receive a PING message, simply answer with ACK
  // `msg.request` is populated if it a ping subsequent to a ping-req
  pingReceived({sender}, msg) {
    this.logger.debug(`Received PING message from ${sender.host}:${sender.port} of type: ${msg.type}, answering ACK`)
    if (!msg.request) {
      return this.net.sendAck(sender)
    }
    this.net.sendAck(sender, msg.request.target, msg.request.requester)
  }

  // Receive a PING-REQ message. Send a PING to TARGET.
  // In this case, no timeout is needed. If an answer is received is then propagated
  // back to the requester
  pingReqReceived({sender: {host, port}}, msg) {
    this.logger.debug(msg, `Received PING-REQ message from ${host}:${port} of type: ${msg.type}`)
    const target = msg.request.target
    const requester = msg.request.requester
    this.net.sendPing(target, target, requester) // in this case destination === target. This can be optimized
  }

  /**
   * When an ack is received, if it's for a PING, the related timer must be deleted,
   * abd if the member is SUSPECT, it mus be changed to ALIVE.
   * If the ack is from PING-REQ, two cases:
   * - I'm the requester of the ping-req, so the final destination of the ack =>
   *     - clear the interval for the ping-req
   *     - if suspect, update to alive
   * - I'm not the requester of the ping-req, the ack is rerouted to the original requester
   */
  ackReceived({sender}, msg) {
    this.logger.debug(msg, `Received ACK message from ${sender.host}:${sender.port} of type: ${msg.type}`)
    this.emit('ack', sender)
    const key = this._key(sender)

    // ACK from PING
    if (this.pingTimers[key]) {
      clearTimeout(this.pingTimers[key])
      delete this.pingTimers[key]
      this.members.updateToAlive(sender)
      return
    }

    // ACK from PING-REQ
    if (msg.request) {
      if (this.members.isMe(msg.request.requester)) {
        // I'm the original requester
        const key = this._key(msg.request.target)
        if (this.pingReqTimers[key]) {
          clearTimeout(this.pingReqTimers[key])
          delete this.pingReqTimers[key]
          this.members.updateToAlive(sender)
          return
        }
      }
      // If target !== me => we reroute the ack to the original requester
      this.net.sendAck(msg.request.requester, msg.request.target, msg.request.requester)
    }
  }

}
module.exports = Failure
