'use strict'

const {sortBy, remove} = require('lodash')
const {nodeStates: {ALIVE, SUSPECT}} = require('../lib/states')

// Manages the updates to be "disseminated"
// Current implementation stores the updates in a FIFO queue

class Update {

  constructor(opts) {
    this.opts = opts
    this.logger = this.opts.logger
    // Specific Update options
    this.updatesMaxSize = opts.updatesMaxSize || 50
    this.disseminationFactor = opts.disseminationFactor || 15
    this._updates = []
    this.getLimit = (factor, size) => Math.ceil(factor * Math.log(size + 1) / Math.log(10))
  }

  /**
   * Get the updates to be propagated, up to `this.updatesMaxSize`.
   * The updates are the one less-gossiped, so first all the updates are ordered by
   * `gossiped` (ascending) and the first updatesMaxSize are returned (when returning,
   * `gossiped` is incremented). The updates for which `gossiped` is > currentLimit are removed
   */
  getUpdates() {
    // current gossip limit for each update. It dependes on the current group size.
    // TODO: could be calculated also for each membership change.
    const currentLimit =  Math.ceil(this.disseminationFactor * Math.log(this.opts.members.size() + 1) / Math.log(10))
    this._updates = sortBy(this._updates, 'gossiped')
    const ret = []

    for (let i = 0; i < this.updatesMaxSize && i < this._updates.length; i++) {
      this._updates[i].gossiped++
      const {node, setBy, state, incNumber} = this._updates[i]
      ret.push({node, setBy, state, incNumber})
    }
    // removes the updates for which `gossiped` is > currentLimit
    remove(this._updates, el => el.gossiped > currentLimit)
    return ret
  }

  addUpdate(node, setBy, state, incNumber) {
    this._updates.push({node, setBy, state, incNumber, gossiped: 0})
  }

  // alias of addUpdate
  propagate({node, setBy, state, incNumber}) {
    this.addUpdate(node, setBy, state, incNumber)
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
      this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber)
      return this.propagate(update)
    }
    if (member.incNumber > incNumber) {
      this.logger.debug(update, 'Incarnation number of the member greater than the one from the message, dropped')
      return
    }
    if (member.state === ALIVE) {
      this.logger.debug(update, 'update ALIVE member')
      this.opts.members.addOrUpdateMember(node, state, setBy, incNumber)
    }

    if (member.state === SUSPECT) {
      this.logger.debug(update, 'update ALIVE member from SUSPECT')
      this.opts.members.addOrUpdateMember(node, state, setBy, incNumber)
    }
    this.propagate(update)
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
      const newIncNumber = incNumber + 1
      this.opts.members.addOrUpdateMember(node, ALIVE, me, newIncNumber)
      return this.propagate({node, state: ALIVE, setBy: me, incNumber: newIncNumber})
    }

    // if node not present, is added as ALIVE
    if (!member) {
      this.logger.debug(update, 'adding new SUSPECT member')
      this.opts.members.addOrUpdateMember(node, SUSPECT, setBy, incNumber)
      return this.propagate(update)
    }
    if (member.incNumber > incNumber) {
      this.logger.debug(update, 'Incarnation number of the member greater than the one from the message, dropped')
      return
    }
    if (member.state === ALIVE) {
      this.logger.debug(update, 'update to SUSPECT')
      this.opts.members.addOrUpdateMember(node, SUSPECT, setBy, incNumber)
    }

    if (member.state === SUSPECT) {
      this.logger.debug(update, 'update SUSPECT member')
      this.opts.members.addOrUpdateMember(node, state, setBy, incNumber)
    }
    this.propagate(update)
    this.logger.debug(update, 'nothing to be done, message dropped')
  }

  // | Condition                                           |      Member List                    |  Updates                   |
  // |-----------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node not present                                    |                                     |     Propagated                    |
  // | Node is me                                          |   incNumber is incremented          |     new `ALIVE` update created    |
  // | Node present and `ALIVE`, with incNumber <= i       |   remove from the alive nodes       |     Propagated                    |
  // | Node present,             with incNumber > i        |                                     |     Drop                          |
  _processFaulty(update) {
    const {node, incNumber} = update
    const member = this.opts.members.findMember(node)
    const isMe =  this.opts.members.isMe(node)

    // Node is me, I'm ALIVE!
    if (isMe) {
      this.logger.debug(update, 'node is me, incrementing incNumber and send ALIVE update')
      const me = this.opts.members.me()
      const newIncNumber = incNumber + 1
      this.opts.members.addOrUpdateMember(node, ALIVE, me, newIncNumber)
      return this.propagate({node, state: ALIVE, setBy: me, incNumber: newIncNumber})
    }
    // if node not present, it's just propagated
    if (!member) {
      return
      //return this.propagate(update)
    }
    if (member.incNumber > incNumber) {
      this.logger.debug(update, 'Incarnation number of the member greater than the one from the message, dropped')
      return
    }
    // Node present and `ALIVE` or  `SUSPECT`, remove from the list and propagate the message
    this.opts.members.removeMember(node)
    this.propagate(update)
  }
}

module.exports = Update
