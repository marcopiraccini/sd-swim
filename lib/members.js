const {differenceBy, find, remove} = require('lodash')
const {nodeStates: {ALIVE, FAULTY, SUSPECT}} = require('../lib/states')
const {EventEmitter} = require('events')

// Memebers list and operations on it
// Also, after an interval, move a SUSPECT node to FAULTY, remove the member and generate the updates
// Events:
// - updated-members
class Members extends EventEmitter {

  constructor(opts) {
    super()
    this.opts = opts
    this.sdswim = opts.sdswim
    this.update = opts.update
    this.logger = this.opts.logger

    // Members list options
    this.suspectTimeout = opts.suspectTimeout || 1000

    this.members = []
    this.getRandomMember = (arr) => (arr[Math.floor(Math.random() * arr.length)])
    this.isMe = ({host, port}) =>  (host === this.sdswim.me.host && port === this.sdswim.me.port)
    this.findMember = ({host, port}) => find(this.members, el => (el.node.host === host  && el.node.port === port))
  }

  get list() {
    return this.members
  }

  set list(list) {
    this.members = list
    this.emit('updated-members', this.members)
  }

  /**
   * If SUSPECT updates to ALIVE. Do nothing otherwise.
   * Creates also the related updates
   */
  updateToAlive(node) {
    const current = this.findMember(node)
    if (current.state === SUSPECT) {
      current.state = ALIVE
      current.setBy = this.sdswim.me
      this.update.addAliveUpdate(node, this.sdswim.me)
      this.logger.debug(node, 'updated to ALIVE FROM SUSPECT')
    }
  }

  /**
   * If ALIVE update to SUSPECT. Do nothing otherwise.
   * Creates also the related updates
   */
  updateToSuspect(node) {
    const current = this.findMember(node)
    if (current.state === ALIVE) {
      current.state = SUSPECT
      current.setBy = this.sdswim.me
      this.update.addSuspectUpdate(node, this.sdswim.me)

      // Suspect timeout: when triggered it check if the node is still SUSPECT.
      // If so, it's set to faulty.
      setTimeout(() => {
        if (current.STATE === SUSPECT) {
          this.updateToFaulty(current.node)
        }
      }, this.suspectTimeout)

      this.logger.debug(node, 'updated to SUSPECT FROM ALIVE')
    }
  }

  /**
   * Update to FAULTY (remove the moemebr from the list). Do nothing otherwise.
   * Creates also the related updates
   */
  updateToFaulty(node) {
    const removed = remove(this.members, el => (el.node.host === node.host  && el.node.port === node.port))
    this.update.addFaultyUpdate(node, this.sdswim.me)
    this.logger.debug(removed, 'updated to FAULTY (removed)')
  }

  /**
   * Update member list with a node and state and add the updates to be propagated.
   * The node is updated if already in list or added if not.
   * Default: add himself as ALIVE and setBy as himself
   */
  updateMember(node = this.sdswim.me, state = ALIVE,
      setBy = this.sdswim.me, incNumber = 0) {
    const current = this.findMember(node)
    if (current) {
      current.setBy = setBy
      current.state = state
      current.incNumber = incNumber
    } else {
      this.members.push({node, setBy, state, incNumber})
    }
    this.emit('updated-members', this.members)
    this.update.addUpdate(node, setBy, state)
  }

  /**
   * Return the member list, with the esclusion of myself and the optional`membersToSkip`
   * and kipping the FAULTY ones
   */
  getOtherNonFaultyMembers(membersToSkip = []) {
    membersToSkip.push(this.sdswim.me) // Esclude myself'node'
    // OK, I have to find a better way for a diff...
   return differenceBy(this.members, membersToSkip.map(el => ({node: el})), ({node: {host, port}}) => (`${host}:${port}`))
    .filter(({node: {state}}) => {
      return state !== FAULTY
    })
  }

  /**
   * Get the member target for the PING (random in this implementation, see README's TODO)
   */
  getPingableMember() {
    const pingableMembers = this.getOtherNonFaultyMembers()
    if (!pingableMembers.length) {
      return // no candidates
    }
    return this.getRandomMember(pingableMembers)
  }

  /**
   * Get the `pingReqGroupSize` members target for the PING-REQ (random in this implementation, see README's TODO).
   */
  getPingReqGroupMembers(target, pingReqGroupSize) {
    const pingableMembers = this.getOtherNonFaultyMembers([target])
    return pingableMembers.concat().sort(() =>  0.5 - Math.random()).slice(0, pingReqGroupSize)
  }

}

module.exports = Members
