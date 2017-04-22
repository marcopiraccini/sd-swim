'use strict'

const fifo = require('fifo')
const {nodeStates: {ALIVE, SUSPECT, FAULTY}} = require('../lib/states')

// Updates FIFO queue.
class Update {

  constructor(opts) {
    this.opts = opts
    this.sdswim = opts.sdswim
    this.nodeStates = this.sdswim.nodeStates

    // Specific Update options
    this.updatesMaxSize = this.sdswim.updatesMaxSize || 50

    // FIFO queue for updates
    this._updates = fifo()
  }

  /**
   * Add an updated to be propagated
   */
  _add(update) {this._updates.push(update)}

  /**
   * Add a updates to be propagated, up to `this.updatesMaxSize`
   */
  getUpdates() {
    const ret = []
    var count = 0
    while (this._updates.node && count < this.updatesMaxSize) {
      const val = this._updates.shift()
      count++
      ret.push(val)
    }
    return ret
  }

  addUpdate(target, setBy, state) {
    this._add({target, setBy, claim: state})
  }

  addAliveUpdate(target, setBy) {
    this._add({target, setBy, claim: ALIVE})
  }

  addFaultyUpdate(target, setBy) {
    this._add({target, setBy, claim: FAULTY})
  }

  addSuspectUpdate(target, setBy) {
    this._add({target, setBy, claim: SUSPECT})
  }

}

module.exports = Update
