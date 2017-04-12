'use strict'

// Join Protocol Implementation

const {EventEmitter} = require('events')
class Join extends EventEmitter {

  constructor(opts) {
    super()
    this.sdswim = opts.sdswim

    // Get all the properties from SDSWIM
    this.net = this.sdswim.net
    this.logger = this.sdswim.logger

    // Specific JOIN Protocol options
    this.initialHosts = this.sdswim.initialHosts
    this.joinTimeout = this.sdswim.joinTimeout

    // NET messages managed by this module
    this.sdswim.net.on('join', (sender, msg) => this._joinReceived(sender, msg))
    this.sdswim.net.on('update-join', (sender, msg) => this._updateJoinReceived(sender, msg))
  }

  start() {
    this._join() // Starts the protocol
  }

  stop() {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer)
    }
  }

  /**
   * SEND JOIN MESSAGE(S) TO EACH `initialHosts`
   */
  _join() {
    const self = this
    if (this.initialHosts && this.initialHosts.length > 0) {
      this.net.sendJoin(this.initialHosts)
      this.currentTimer = setTimeout(function checkJoinTimeout() {
        if (self.sdswim.state !== self.sdswim.states.JOINED) {
          self.sdswim.emit('error', new Error(`Timeout triggered in joining with ${JSON.stringify(self.initialHosts)}`))
        }
      }, this.joinTimeout)
    }
  }

  /************** MESSAGES HANDLERS ************************/
  /**
   * RECEIVED JOIN MESSAGE.
   */
  _joinReceived({sender: {host, port}}, msg) {
    const self = this
    self.logger.debug(`Received JOIN message from ${host}:${port} of type: ${msg.type}`)
    // if I don't know my host yet, saves it and add myself to the current member list
    if (!self.sdswim.host) {
      this.sdswim.host = msg.target.host
      this.sdswim._updateMember()
    }
    const target = {host, port} // The new node
    this.sdswim._updateMember(target)
    this.net.sendUpdateJoin(target, this.sdswim.members)
  }

  /**
   * RECEIVE UPDATE_JOIN MESSAGE. In general we will receive more tha one message. Only one is
   * enough to change the state to JOINED, but we process the answer updating the members list
   * list for each message.
   */
  _updateJoinReceived ({sender: {host, port}}, msg) {
    this.logger.debug(`Received UPDATE_JOIN message from ${host}:${port} of type: ${msg.type}`)
    // We process only first update join the others are silently ignored
    if (!this.sdswim.host) {   // First update join received
      this.sdswim.host = msg.target.host
      // The full list is replaced by the new one.
      this.sdswim._members = msg.members
      this.sdswim.state = this.sdswim.states.JOINED
      this.sdswim.emit('updated-members', this.sdswim.members)
      this.logger.debug(`The node is now in state ${this.state}`)
    }
  }

}
module.exports = Join
