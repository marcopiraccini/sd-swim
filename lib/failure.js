'use strict'

// Failure Detector Module

const {EventEmitter} = require('events')
class Failure extends EventEmitter {

  constructor(opts) {
    super()
    this.sdswim = opts.sdswim
    this.net = this.sdswim.net

    // NET messages managed by this module
    this.net.on('ping', (sender, msg) => this.failure.pingReceived(sender, msg))
    this.net.on('ping-req', (sender, msg) => this.failure.pingReqReceived(sender, msg))
    this.net.on('ack', (sender, msg) => this.failure.ackReceived(sender, msg))
  }

  start() {
    // TODO
  }

  stop() {
    // TODO: We have to disable all the timeouts
  }

  /************** MESSAGES HANDLERS ************************/
  pingReceived() { /* TODO */}
  pingReqReceived() { /* TODO */}
  ackReceived() { /* TODO */}

}
module.exports = Failure
