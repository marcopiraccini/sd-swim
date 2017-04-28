'use strict'

const fifo = require('fifo')
const {nodeStates: {ALIVE, SUSPECT, FAULTY}} = require('../lib/states')

// Updates FIFO queue.
class Update {

  constructor(opts) {
    this.opts = opts
    this.logger = this.opts.logger

    // Specific Update options
    this.updatesMaxSize = opts.updatesMaxSize || 50

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

  addUpdate(node, setBy, state) {
    this._add({node, setBy, state})
  }

  addAliveUpdate(node, setBy) {
    this._add({node, setBy, state: ALIVE})
  }

  addFaultyUpdate(node, setBy) {
    this._add({node, setBy, state: FAULTY})
  }

  addSuspectUpdate(node, setBy) {
    this._add({node, setBy, state: SUSPECT})
  }

  /**
   * If SUSPECT update to ALIVE. Do nothing otherwise.
   */
  updateToAlive(node) {
    // TODO
    this.logger.debug('updateToAlive', node)
  }

  updateToSuspect(node) {
    // TODO
    this.logger.debug('updateToSuspect', node)
  }

  updateToFaulty(node) {
    // TODO
    this.logger.debug('updateToFaulty', node)
  }


  processUpdates(updates) {
    for (const update of updates) {
      this.processUpdate(update)
    }
  }

  processUpdate(update) {
    switch(update.state) {
       case 0: this.processAlive(update)
       break
       case 1: this.processSuspect(update)
       break
       case 2: this.processFaulty(update)
       break
    }
  }

  processAlive(update) {
    // TODO
    this.logger.debug('processAlive', update)
  }

  processSuspect(update) {
    // TODO
    this.logger.debug('processSuspect', update)
  }

  processFaulty(update) {
    // TODO
    this.logger.debug('processFaulty', update)
  }
}

module.exports = Update
