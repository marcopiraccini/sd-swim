'use strict'

const fifo = require('fifo')
const {nodeStates: {ALIVE, SUSPECT}} = require('../lib/states')

// Manages the updates to be "disseminated"
// Current implementation stores the updates in a FIFO queue

class Update {

  constructor(opts) {
    this.opts = opts
    this.logger = this.opts.logger
    // Specific Update options
    this.updatesMaxSize = opts.updatesMaxSize || 50
    this._updates = fifo() // FIFO queue for updates
  }

  /**
   * Get the updates to be propagated, up to `this.updatesMaxSize`.
   * The messages are removed from the queue when returned.
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
    this._updates.push({node, setBy, state, incNumber})
  }

  // alias of addUpdate
  propagate(update) {
    this._updates.push(update)
  }

  processUpdates(updates) {
    for (const update of updates) {
      this.processUpdate(update)
    }
  }

  processUpdate(update) {
    switch(update.state) {
       case 0: this._processAlive(update)
       break
       case 1: this._processSuspect(update)
       break
       case 2: this._processFaulty(update)
       break
    }
  }

  // | Condition                                           |      Member List                    |  Updates                   |
  // |-----------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node not present                                    |   Member added as `ALIVE`           |     Propagated             |
  // | Node present and `ALIVE`, with incNumber <= i       |   Member updated (setBy, incNumber) |     Propagated             |
  // | Node present and `ALIVE`, with incNumber >  i       |                                     |     Drop                   |
  // | Node present and `SUSPECTED`, with incNumber <= i   |   Member updated as `ALIVE`         |     Propagated             |
  // | Node present and `SUSPECTED`, with incNumber >  i   |                                     |     Drop                   |
  _processAlive(update) {
    const {node, state, setBy, incNumber} = update
    const member = this.opts.members.findMember(node)

    // if node not present, is added as ALIVE
    if (!member) {
      this.logger.debug(update, 'adding new ALIVE member')
      return this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber)
    }

    // Node present and `ALIVE`, with incNumber < i
    if (member.state === ALIVE && member.incNumber <= incNumber) {
      this.logger.debug(update, 'update ALIVE member')
      return this.opts.members.addOrUpdateMember(node, state, setBy, incNumber)
    }

    // Node present and `SUSPECTED`, with incNumber <= i
    if (member.state === SUSPECT && member.incNumber <= incNumber) {
      this.logger.debug(update, 'update ALIVE member from SUSPECT')
      return this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber)
    }

    this.logger.debug(update, 'nothing to be done, message dropped')
  }


  // | Condition                                             |      Member List                    |  Updates                   |
  // |-------------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node is me                                            |   incNumber is incremented          |     new `ALIVE` update created   |
  // | Node not present                                      |   Member added as `SUSPECT`         |     Propagated                   |
  // | Member present and `ALIVE`, with incNumber <= i       |   Member changed to `SUSPECT`       |     Propagated                   |
  // | Member present and `ALIVE`, with incNumber  > i       |                                     |     Drop                         |
  // | Member present and `SUSPECTED`, with incNumber <=  i  |   Member updated (setBy, incNumber) |     Propagated                   |
  // | Member present and `SUSPECTED`, with incNumber >  i   |                                     |     Drop                         |
  _processSuspect(update) {
    const {node, state, setBy, incNumber} = update
    const member = this.opts.members.findMember(node)
    const isMe =  this.opts.members.isMe(node)

    // Node is me
    if (isMe) {
      this.logger.debug(update, 'node is me, incrementing incNumber and send ALIVE update')
      const me = this.opts.members.me()
      return this.opts.members.addOrUpdateMember(node, ALIVE, me, incNumber + 1)
    }

    // if node not present, is added as ALIVE
    if (!member) {
      this.logger.debug(update, 'adding new SUSPECT member')
      return this.opts.members.addOrUpdateMember(node, SUSPECT, setBy, incNumber)
    }

    // Node present and `ALIVE`, with incNumber <= i
    if (member.state === ALIVE && member.incNumber <= incNumber) {
      this.logger.debug(update, 'update to SUSPECT')
      return this.opts.members.addOrUpdateMember(node, SUSPECT, setBy, incNumber)
    }

    // Node present and `SUSPECTED`, with incNumber <= i
    if (member.state === SUSPECT && member.incNumber <= incNumber) {
      this.logger.debug(update, 'update SUSPECT member')
      return this.opts.members.addOrUpdateMember(node, state, setBy, incNumber)
    }

    this.logger.debug(update, 'nothing to be done, message dropped')
  }

  // | Condition                                           |      Member List                    |  Updates                   |
  // |-----------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node not present                                    |                                     |                                   |
  // | Node is me                                          |   incNumber is incremented          |     new `ALIVE` update created    |
  // | Node present and `ALIVE`, with incNumber <= i       |   remove from the alive nodes       |     Propagated                    |
  // | Node present,             with incNumber > i        |                                     |     Drop                          |
  _processFaulty(update) {
    const {node, setBy, incNumber} = update
    const member = this.opts.members.findMember(node)
    const isMe =  this.opts.members.isMe(node)

    // Node is me
    if (isMe) {
      this.logger.debug(update, 'node is me, incrementing incNumber and send ALIVE update')
      const me = this.opts.members.me()
      return this.opts.members.addOrUpdateMember(node, ALIVE, me, incNumber + 1)
    }

    // if node not present, it's just drop
    if (!member) {
      return
    }

    // Node present and `ALIVE`, with incNumber <= i
    if (member.incNumber <= incNumber) {
      this.logger.debug(update, 'update to FAULTY')
      return this.opts.members.updateToFaulty(node, setBy, incNumber)
    }

    this.logger.debug(update, 'nothing to be done, message dropped')
  }
}

module.exports = Update
