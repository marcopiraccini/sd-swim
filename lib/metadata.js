'use strict'

const {EventEmitter} = require('events')
const {find} = require('lodash')

// Metadata distribution subprotocol module.
// Each metadata entry must be in the form:
// {owner: {host, port}, entries: [{key, value}], version}
// The entries structure `[{key, value}]` is set by protobuf messages (this module doesen't care)
//
// Logic:
// - When a node changes metadata, it sensds that change to all nodes (not caring about acks), increasing the version
// - On `peerUp` the node sends his metadata
// - On `peerDown` the failing node metadata are removed
// - Every `metadataDistributionTimeout`, I choose a member and send him all the metadata.
// - If a `all-meta` message is received, all the metadata are returned to the sender.
//
// - Events emitted:
// - `new-metadata`

class Metadata extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts

    this.members = opts.members
    this.logger = opts.logger
    this.net = opts.net
    this.sdswim = opts.sdswim

    // Specific Metadata subprotocol options
    this.metadataDistributionTimeout = opts.metadataDistributionTimeout || 500

    // Metadata
    this.all = []          // all metadata
    this.entries = []      // my metadata  [{key, value}]
    this.version = 0       // my metadata version

    // Events managed
    this.members.on('peerUp', node => this._notifyMyMetaToNode(node))
    this.members.on('peerDown', node => this._removeNodeMetadata(node))

    //
    this.net.on('meta', (sender, msg) => this._onMeta(sender, msg))
    this.net.on('all-meta', (sender, msg) => this._onAllMeta(sender, msg))
  }

  start () {
    this.logger.debug('Starting Metadata Distrubtion sub-protocol')
    this.sendInterval = setInterval(this._send.bind(this), this.metadataDistributionTimeout)
  }

  stop () {
    clearInterval(this.sendInterval)
  }

  /**
   * Get all the metadata, including mine.
   */
  get data () {
    return Object.freeze(this.all.concat([this.my]))
  }

  /**
   * Change my data.
   * // TODO: add validation? data must be in the form [{key, value}]
   */
  set my (entries) {
    this.version++
    this.entries = entries
    this._notifyMetaToAll([this.my])
  }

  /**
   * Get my metadata.
   */
  get my () {
    return {owner: this.members.me, version: this.version, entries: this.entries}
  }

  _notifyMetaToAll (metadata) {
    this.net.sendMeta(this.members.list.map(({node}) => node), metadata)
  }

  _notifyMyMetaToNode (node) {
    this.net.sendMeta([node], this.my)
  }

  _notifyAllMetaToNode (node) {
    this.net.sendMeta([node], this.data)
  }

  _removeNodeMetadata ({host, port}) {
    this.all = this.all.filter(meta => !(meta.owner === host && meta.owner === port))
  }

  /**
   * RECEIVED META MESSAGE. Updates metadata if the version is >
   */
  _onMeta ({sender: {host, port}}, msg) {
    this.logger.debug(`Received META message from ${host}:${port} of type: ${msg.type}`)
    for (const updated in msg.metadata) {
      const meta = find(this.all, el => (updated.owner.host === host && updated.owner.port === port))
      if (updated.version > meta.version) {
        meta.entries = updated.entries
      }
    }
  }

  /**
   * RECEIVED ALL_META MESSAGE. Sends back all the metadata I know.
   */
  _onAllMeta ({sender}, msg) {
    this.logger.debug(`Received META message from ${sender.host}:${sender.port} of type: ${msg.type}`)
    this._notifyAllMetaToNode(sender)
  }

  _send () {
    const member = this.members.getPingableMember()
    if (!member) { return } // no candidates
    this._notifyMyMetaToNode(member.node)
  }
}
module.exports = Metadata
