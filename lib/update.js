'use strict'

const {sortBy, remove, find, values, keys} = require('lodash')
const {nodeStates: {ALIVE, SUSPECT, FAULTY}} = require('../lib/states')
const uuidV4 = require('uuid/v4')

// Manages the updates to be "disseminated"

class Update {

  constructor(opts) {
    this.opts = opts
    this.logger = this.opts.logger
    // Specific Update options
    this.updatesMaxSize = opts.updatesMaxSize || 50
    this.disseminationFactor = opts.disseminationFactor || 15
    this._updates = []
    this._faulties = {} // recent faulties.
    this._expired = {}  // expired updates uuid
    this.getLimit = (factor, size) => Math.ceil(factor * Math.log(size + 1) / Math.log(10))
    this.key = ({host, port}) => `${host}:${port}`

    // Faulties / expired clean up
    setInterval(() => {
      const now = Date.now()
      const newExpired = {}
      const newFaulties = {}

      for (const key of keys(this._expired)) {
        if (now > (this._expired[key] + 10000)) { // TODO: EXTERNALIZE, OR CALCULATE FROM SUSPECT-TIMEOUT
          newExpired[key] = this._expired[key]
        }
      }

      for (const key of keys(this._faulties)) {
        if (now > (this._faulties[key] + 2000)) { // TODO: EXTERNALIZE, OR CALCULATE FROM SUSPECT-TIMEOUT
          newFaulties[key] = this._faulties[key]
        }
      }
      this._expired = newExpired
      this._faulties = newFaulties
    }, 2000)
  }

  /**
   * Get the updates to be propagated, up to `this.updatesMaxSize`.
   * The updates are the one less-gossiped, so first all the updates are ordered by
   * `gossiped` (ascending) and the first updatesMaxSize are returned (when returning,
   * `gossiped` is incremented). The updates for which `gossiped` is > currentLimit are removed
   */
  getUpdates() {
    this._updates = sortBy(this._updates, 'gossiped')
    const ret = []

    for (let i = 0; i < this.updatesMaxSize && i < this._updates.length; i++) {
      this._updates[i].gossiped = this._updates[i].gossiped + 1
      const {node, setBy, state, incNumber, uuid} = this._updates[i]
      ret.push({node, setBy, state, incNumber, uuid})
    }
    // current gossip limit for each update. It dependes on the current group size.
    const currentLimit =  Math.ceil(this.disseminationFactor * Math.log(this.opts.members.size() + 1) / Math.log(10))
    const expired = remove(this._updates, el => el.gossiped >= currentLimit)
    for (const exp of expired) {
      this._expired[exp.uuid] = Date.now()
    }

    return ret
  }

  /**
   * The update is added only if not present, otherwise it's updated.
   * If so if we have an SUSPECT update (same node, same incNumber) we can
   * change it to FAULT or ALIVE without having two concurrent updates on the same node
   * propagated from here.
   */
  addUpdate(node, setBy, state, incNumber, uuid) {

    if (uuid && this._expired[uuid]) {
      return  // update expired, must skip it
    }

    // TODO: find a more efficent way
    const update = find(this._updates,
      el => (el.node.host === node.host && el.node.port === node.port
        && el.state === state && el.incNumber === incNumber))
    if (!update) {
      if (!uuid) {
        this._updates.push({node, setBy, state, incNumber, gossiped: 0, uuid: uuidV4()})
      } else {
        this._updates.push({node, setBy, state, incNumber, gossiped: 0, uuid})
      }
    }

    if (state === FAULTY) {
      const key = this.key(node)
      if (!this._faulties[key]) {
        this._faulties[key] = Date.now()
      }
    }
  }

  // alias of addUpdate
  propagate({node, setBy, state, incNumber, uuid}) {
    this.addUpdate(node, setBy, state, incNumber, uuid)
  }

  /**
   * It's possible to have two different updates for the same node.
   * (typically an "old" ALIVE and then a FAULTY).
   * If the FAULTY is processed, the node is removed from the member list, but
   * the following ALIVE update will put it back! To avoid this, we must identify
   * between this batch of updates, the ones of the same node and then for each node,
   * removes the ALIVE / SUSPECT updates if a FAULTY is present.
   * Then we have to process the updates in this order: ALIVE - SUSPECT - FAULTY
   */
  processUpdates(updates) {
    const groupedUpdates = updates.reduce((prev, curr) => {
      const key = this.key(curr.node)
      if (!prev[key]) {
        prev[key] = {alive: [], suspect: [], faulty: []}
      }
      if (curr.state === ALIVE) {
        prev[key].alive.push(curr)
      }
      if (curr.state === SUSPECT) {
        prev[key].suspect.push(curr)
      }
      if (curr.state === FAULTY) {
        prev[key].faulty.push(curr)
      }
      return prev
    }, {})
    const alives = []
    const suspects = []
    const faulties = []
    for (const el of values(groupedUpdates)) {
      if (el.faulty.length !== 0) {
        faulties.push(...el.faulty)
      } else {
        suspects.push(...el.suspect)
        alives.push(...el.alive)
      }
    }
    const filteredAndOrdered = alives.concat(suspects, faulties)
    for (const update of filteredAndOrdered) {
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
    const key = this.key(node)
    const member = this.opts.members.findMember(node)
    // if node not present, is added as ALIVE
    if (!member) {
      if (!this._faulties[key]) {
        this.logger.debug(update, 'adding new ALIVE member')
        this.opts.members.addOrUpdateMember(node, ALIVE, setBy, incNumber)
        return this.propagate(update)
      }
      return
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
    const key = this.key(node)

    // Node is me
    if (isMe) {
      this.logger.debug(update, 'node is me, incrementing incNumber and send ALIVE update')
      const me = this.opts.members.me()
      const newIncNumber = incNumber + 1
      this.opts.members.addOrUpdateMember(node, ALIVE, me, newIncNumber)
      return this.propagate({node, state: ALIVE, setBy: me, incNumber: newIncNumber})
    }

    // if node not present, is added as SUSPECT
    if (!member) {
      if (!this._faulties[key]) {
        this.logger.debug(update, 'adding new SUSPECT member')
        this.opts.members.addOrUpdateMember(node, SUSPECT, setBy, incNumber)
        return this.propagate(update)
      }
      return
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

  }

  // | Condition                                           |      Member List                    |  Updates                   |
  // |-----------------------------------------------------|:-----------------------------------:|---------------------------:|
  // | Node not present                                    |                                     |     Propagated                    |
  // | Node is me                                          |   incNumber is incremented          |     new `ALIVE` update created    |
  // | Node present                                        |   remove from the alive nodes       |     Propagated                    |
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
    // if node is present, removes it
    if (member) {
      this.opts.members.removeMember(node)
    }
    this.propagate(update)
  }
}

module.exports = Update
