'use strict'

const _ = require('lodash')
const fifo = require('fifo')
const NodeStates = require('./nodeStates')

// Manages the updates to be propagated, using a FIFO queue.
class Update {

  constructor(opts) {
    this.opts = opts
    this._updatesMaxSize = opts.updatesMaxSize || 50
    this._updates = fifo()
  }

  /**
   * Add an updated to be propagated
   */
  _add(update) {
    let updates =_.isArray(update) ? update : [update]
    for (const up of updates) {
      this._updates.push(up)
    }
  }

  /**
   * Add a updates to be propagated, up to `this._updatesMaxSize`
   */
  getUpdates() {
    const ret = []
    var count = 0
    while (this._updates.node && count < this._updatesMaxSize) {
      const val = this._updates.shift()
      count++
      ret.push(val)
    }
    return ret
  }

  addAliveUpdate(target, setBy) {
    this._add({target, setBy, claim: NodeStates.ALIVE})
  }

  addFaultyUpdate(target, setBy) {
    this._add({target, setBy, claim: NodeStates.FAULTY})
  }

  addSuspectUpdate(target, setBy) {
    this._add({target, setBy, claim: NodeStates.SUSPECT})
  }

}

module.exports = Update
