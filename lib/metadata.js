'use strict'

const { EventEmitter } = require('events')
const { find, remove, isBuffer, isString } = require('lodash')

// Metadata distribution subprotocol module.
//
// Each metadata entry must be in the form:
// {owner: {host, port}, entries: [{key, value}], version}
// The entries structure `[{key, value}]` is set by protobuf messages (this module doesen't care about the entry content)
//
// Logic:
// - When a node changes metadata, it sends that change to all nodes (not caring about acks), increasing the version
// - On `peerUp` the node sends his metadata to the new peer
// - On `peerDown` the failing node metadata are removed
// - Every `metadataDistributionTimeout`, a member is chosen and all the metadata are sent
// - If a `all-meta` message is received, all the metadata are returned to the sender
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
    this.metadataDistributionTimeout = opts.metadataDistributionTimeout || 1000

    // Metadata
    this.all = [] // all metadata
    this.entries = [] // my metadata  [{key, value}]
    this.version = 0 // my metadata version

    // Events managed
    this.members.on('peerUp', node => this._notifyMyMetaToNode(node))
    this.members.on('peerDown', node => this._removeNodeMetadata(node))

    // Messages received
    this.net.on('meta', (sender, msg) => this._onMeta(sender, msg))
    this.net.on('all-meta', (sender, msg) => this._onAllMeta(sender, msg))

    // Notify my data to everyone, triggering only if I know myself
    this.notifyToAll = () => {
      if (this.sdswim.whoami().host) {
        return this._notifyMetaToAll([this.my])
      }
    }
  }

  start () {
    this.logger.debug('Starting Metadata Distrubtion sub-protocol')
    this.sendInterval = setInterval(
      this._send.bind(this),
      this.metadataDistributionTimeout
    )
  }

  stop () {
    clearInterval(this.sendInterval)
    this.all = []
    this.entries = []
    this.version = 0
  }

  /**
   * Get all the metadata, including mine.
   */
  get data () {
    return this.all.concat([this.my])
  }

  /**
   * Change my data.
   * // TODO: add validation? entries must be in the form [{key, value}]
   */
  set my (entries) {
    // Validation, throw an error if key/value is of the wrong type
    for (const { key, value } of entries) {
      if (!isString(key) || !isBuffer(value)) {
        throw new Error(
          `Wrong type for ${key}. Key must be a String, value must be a Buffer`
        )
      }
    }
    this.entries = entries
    this.version++
    this.notifyToAll()
  }

  /**
   * Add a single entry. If there's a key with the same value, it's replaced
   */
  add (key, value) {
    if (!isBuffer(value)) {
      throw new Error('value must be a Buffer')
    }
    remove(this.entries, el => el.key === key)
    this.entries.push({ key, value })
    this.version++
    this.notifyToAll()
  }

  /**
   * Remove a single entry
   */
  remove (key) {
    remove(this.entries, el => el.key === key)
    this.version++
    this.notifyToAll()
  }

  /**
   * Get my metadata.
   */
  get my () {
    return {
      owner: this.members.me(),
      version: this.version,
      entries: this.entries
    }
  }

  _notifyMetaToAll (metadata) {
    this.net.sendMeta(
      this.members.getOtherMembers().map(({ node }) => node),
      metadata
    )
  }

  _notifyMyMetaToNode (node) {
    this.net.sendMeta([node], [this.my])
  }

  _notifyAllMetaToNode (node) {
    this.net.sendMeta([node], this.data)
  }

  _removeNodeMetadata ({ host, port }) {
    this.all = this.all.filter(
      meta => !(meta.owner.host === host && meta.owner.port === port)
    )
    this.emit('new-metadata', this.data)
  }

  /**
   * RECEIVED META MESSAGE. Updates metadata if the version is >
   */
  _onMeta ({ sender: { host, port } }, msg) {
    this.logger.debug(
      `Received META message from ${host}:${port} of type: ${msg.type}`
    )
    let changes
    for (const updated of msg.metadata) {
      const meta = find(
        this.all,
        el => updated.owner.host === host && updated.owner.port === port
      )
      if (!meta) {
        this.all.push(updated)
        changes = true
      } else if (updated.version > meta.version) {
        meta.entries = updated.entries
        meta.version = updated.version
        changes = true
      }
    }
    if (changes) {
      this.emit('new-metadata', this.data)
    }
  }

  /**
   * RECEIVED ALL_META MESSAGE. Sends back all the metadata I know.
   */
  _onAllMeta ({ sender }, msg) {
    this.logger.debug(
      `Received META message from ${sender.host}:${sender.port} of type: ${msg.type}`
    )
    this._notifyAllMetaToNode(sender)
  }

  _send () {
    const member = this.members.getPingableMember()
    if (!member) {
      // no candidates
      return
    }
    this._notifyMyMetaToNode(member.node)
  }
}
module.exports = Metadata
