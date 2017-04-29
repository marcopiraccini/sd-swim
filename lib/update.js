'use strict'

const fifo = require('fifo')
const {nodeStates: {ALIVE, SUSPECT}} = require('../lib/states')

// Updates FIFO queue.
class Update {

  constructor(opts) {
    this.opts = opts
    this.logger = this.opts.logger
    // Specific Update options
    this.updatesMaxSize = opts.updatesMaxSize || 50
    this._updates = fifo() // FIFO queue for updates
  }

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

  addUpdate(node, setBy, state, incNumber) {
    this._updates.push ({node, setBy, state, incNumber})
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

  // | Condition                                           |      Member List                    |  Updates                   |
  // |-----------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node not present                                    |   Member added as `ALIVE`           |     Propagated             |
  // | Node present and `ALIVE`, with incNumber < i        |   Member updated (setBy, incNumber) |     Propagated             |
  // | Node present and `ALIVE`, with incNumber >= i       |                                     |                            |
  // | Node present and `SUSPECTED`, with incNumber <= i   |   Member updated as `ALIVE`         |     Propagated             |
  // | Node present and `SUSPECTED`, with incNumber >  i   |                                     |                            |
  processAlive(update) {
    const {node, state, setBy, incNumber} = update
    const member = this.opts.members.findMember(node)

    // if node not present, is added as ALIVE
    if (!member) {
      this.logger.debug(update, 'adding new ALIVE member')
      return this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber)
    }

    // Node present and `ALIVE`, with incNumber < i
    if (member.state === ALIVE && member.incNumber < incNumber) {
      this.logger.debug(update, 'update ALIVE member')
      return this.opts.members.addOrUpdateMember(node, state, setBy, incNumber)
    }

    // Node present and `SUSPECTED`, with incNumber <= i
    if (member.state === SUSPECT && member.incNumber <= incNumber) {
      this.logger.debug(update, 'update ALIVE member from SUSPECT')
      return this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber)
    }

    this.logger.debug(update, 'no update to be done, message dropped')
  }


  // | Condition                                             |      Member List                    |  Updates                   |
  // |-------------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node not present                                      |   Member added as `SUSPECT`         |     Propagated                   |
  // | Node is me                                            |   incNumber is incremented          |     new `ALIVE` update created   |
  // | Member present and `ALIVE`, with incNumber < i        |   Member changed to `SUSPECT`       |     Propagated                   |
  // | Member present and `ALIVE`, with incNumber >= i       |                                     |                                  |
  // | Member present and `SUSPECTED`, with incNumber <=  i  |   Member updated (setBy, incNumber) |     Propagated                   |
  // | Member present and `SUSPECTED`, with incNumber >  i   |                                     |                                  |
  processSuspect(update) {
    const {node, state, setBy, incNumber} = update
    const member = this.opts.members.findMember(node)
    const isMe =  this.opts.members.isMe(node)

    // if node not present, is added as ALIVE
    if (!member) {
      this.logger.debug(update, 'adding new SUSPECT member')
      return this.opts.members.addOrUpdateMember(node, SUSPECT, setBy, incNumber)
    }

    // Node is me
    if (isMe) {
      this.logger.debug(update, 'node is me, incrementing incNumebr and send ALIVE update')
      return this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber + 1)
    }

    // Node present and `ALIVE`, with incNumber < i
    if (member.state === ALIVE && member.incNumber < incNumber) {
      this.logger.debug(update, 'update to SUSPECT')
      return this.opts.members.addOrUpdateMember(node, SUSPECT, setBy, incNumber)
    }

    // Node present and `SUSPECTED`, with incNumber <= i
    if (member.state === SUSPECT && member.incNumber <= incNumber) {
      this.logger.debug(update, 'update SUSPECT member')
      return this.opts.members.addOrUpdateMember(node, state, setBy, incNumber)
    }

    this.logger.debug(update, 'no update to be done, message dropped')
  }

  // | Condition                                           |      Member List                    |  Updates                   |
  // |-----------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node not present                                    |                                     |                                   |
  // | Node is me                                          |   incNumber is incremented          |     new `ALIVE` update created    |
  // | Node present and `ALIVE`, with incNumber < i        |   remove from the alive nodes       |     Propagated                    |
  // | Node present and `ALIVE`, with incNumber >= i       |                                     |                                   |
  processFaulty(update) {
    const {node, setBy, incNumber} = update
    const member = this.opts.members.findMember(node)
    const isMe =  this.opts.members.isMe(node)

    // if node not present, is added as ALIVE
    if (!member) {
      this.logger.debug(update, 'no update to be done, message dropped')
      return
    }

    // Node is me
    if (isMe) {
      this.logger.debug(update, 'node is me, incrementing incNumebr and send ALIVE update')
      return this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber + 1)
    }

    // Node present and `ALIVE`, with incNumber < i
    if (member.state === ALIVE && member.incNumber < incNumber) {
      this.logger.debug(update, 'update to FAULTY')
      return this.opts.members.updateToFaulty(node, incNumber)
    }

    this.logger.debug(update, 'no update to be done, message dropped')
  }
}

module.exports = Update
