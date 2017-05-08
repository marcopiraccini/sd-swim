'use strict'

// Join Protocol Implementation
// Events explicitely emitted:
// - joined: when join protocols succeded, no args
// - join-timeout: when join timeout occurs

const {EventEmitter} = require('events')
const {states: {JOINED}} = require('./states')

class Join extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts
    this.sdswim = opts.sdswim

    // Needed objects
    this.net = this.opts.net
    this.members = this.opts.members
    this.logger = this.opts.logger

    // Specific JOIN Protocol options
    this.initialHosts = this.opts.initialHosts
    this.joinTimeout = this.opts.joinTimeout

    // NET messages managed by this module
    this.net.on('join', (sender, msg) => this._joinReceived(sender, msg))
    this.net.on('join-ack', (sender, msg) => this._joinAckReceived(sender, msg))
  }

  start () {
    this._join() // Starts the protocol
  }

  stop () {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer)
    }
  }

  /**
   * SEND JOIN MESSAGE(S) TO EACH `initialHosts`
   */
  _join () {
    const self = this
    if (this.initialHosts && this.initialHosts.length > 0) {
      this.net.sendJoin(this.initialHosts)
      this.currentTimer = setTimeout(function checkJoinTimeout () {
        if (self.sdswim.state !== JOINED) {
          self.emit('join-timeout', new Error(`Timeout triggered in joining with ${JSON.stringify(self.initialHosts)}`))
        }
      }, this.joinTimeout)
    }
  }

  /**
   * RECEIVED JOIN MESSAGE.
   */
  _joinReceived ({sender: {host, port}}, msg) {
    this.logger.debug(`Received JOIN message from ${host}:${port} of type: ${msg.type}`)
    // if I don't know my host yet, saves it and add myself to the current member list
    if (!this.sdswim.host) {
      this.sdswim.host = msg.destination.host
      this.members.addOrUpdateMemberWithPropagate()
    }
    const destination = {host, port} // The new node
    this.members.addOrUpdateMemberWithPropagate(destination)
    this.net.sendJoinAckMessage(destination, this.members.list)
  }

  /**
   * RECEIVE JOIN_ACK MESSAGE. In general we will receive more tha one message. Only one is
   * enough to change the state to JOINED, but we process the answer updating the members list
   * list for each message.
   */
  _joinAckReceived ({sender: {host, port}}, msg) {
    this.logger.debug(`Received JOIN_ACK message from ${host}:${port} of type: ${msg.type}`)
    // We process only first join ack, the others are silently ignored
    if (!this.sdswim.host) {   // First join ack received
      this.sdswim.host = msg.destination.host
      this.members.list = msg.members // The full list is replaced by the new one.
      this.emit('joined')
    }
  }
}
module.exports = Join
