'use strict'

const {EventEmitter} = require('events')

// Metadata distribution subprotocol module.
// Events emitted:
// - TODO

class Metadata extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts

    this.members = opts.members
    this.logger = opts.logger
    this.net = opts.net

    // Specific Metadata subprotocol options
    this.metadataDistributionTimeout = opts.metadataDistributionTimeout || 500

    // Metadata
    this.metadata = {}     // all metadata
    this.myMetadata = {}   // my metadata
  }

  start () {
    this.logger.debug('Starting Metadata Distrubtion sub-protocol')
    this.sendInterval = setInterval(this._send.bind(this), this.interval)
  }

  stop () {
    clearInterval(this.sendInterval)
  }

  /**
   * Get all the metadata.
   */
  get data () {
    return Object.freeze(this.metadata)
  }

  set mydata (data) {
    // TODO: add validation
    this.myMetadata = data
  }

  _send () {
    const member = this.members.getPingableMember()
    if (!member) { return } // no candidates
    const targetNode = member.node
    this.logger.debug(targetNode, 'Member selected for sending metadata')
    // TODO: Implement
  }
}
module.exports = Metadata
