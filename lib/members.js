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
    this.dissemination = opts.dissemination
    this.logger = this.opts.logger

    // Members list options
    this.suspectTimeout = opts.suspectTimeout || 1000

    this.members = []     // The actual member list. Contains all the current ALIVE and SUSPECT members

    this.getRandomMember = (arr) => (arr[Math.floor(Math.random() * arr.length)])
  }

  get list() {
    return this.members
  }

  set list(list) {
    this.members = list
    this.emit('updated-members', this.members.map(({node}) => node)) // only the nodes
  }

  /**
   * Add member to member list with a node and state
   * The node is updated if already in list or added if not.
   * Default: add himself as ALIVE, setBy as himself, incNumber = 0
   */
  addOrUpdateMember(node = this.sdswim.me, state = ALIVE,
      setBy = this.sdswim.me, incNumber = 0) {
    const current = this.findMember(node)
    if (current) {
      current.setBy = setBy
      current.state = state
      current.incNumber = incNumber
    } else {
      this.members.push({node, setBy, state, incNumber})
      this.emit('updated-members', this.members.map(({node}) => node)) // only the nodes
    }
  }

  /**
   * Add member to member list when (same as addOrUpdateMember but propagate the updates).
   */
  addOrUpdateMemberWithPropagate(node = this.sdswim.me, state = ALIVE,
      setBy = this.sdswim.me, incNumber = 0) {
    this.addOrUpdateMember.apply(this, arguments)
    this.dissemination.propagate({node, setBy, state, incNumber})
  }

  /**
   * If SUSPECT updates to ALIVE. Do nothing otherwise.
   * Creates also the related updates
   */
  updateToAlive(member) {
    const current = this.findMember(member)
    if (!current) { return }
    const {node, state, incNumber} = current
    if (state === SUSPECT) {
      this.dissemination.addUpdate(node, this.sdswim.me, ALIVE, incNumber)
      this.logger.debug(node, 'updated to ALIVE FROM SUSPECT')
    }
  }

  /**
   * If ALIVE update to SUSPECT. Do nothing otherwise.
   * Creates also the related updates
   */
  updateToSuspect(member) {
    const current = this.findMember(member)
    if (!current) { return }
    const {node, state, incNumber} = current
    if (state === ALIVE) {
      current.state = SUSPECT

      this.dissemination.addUpdate(node, this.sdswim.me, SUSPECT, incNumber)

      // Suspect timeout: when triggered it check if the node is still SUSPECT.
      // If so, it's set to faulty.
      setTimeout(() => {
        const current = this.findMember(member)
        if (current && current.state === SUSPECT) {
          this.updateToFaulty(node, this.me(), incNumber)
        }
      }, this.suspectTimeout)

      this.logger.debug(node, 'updated to SUSPECT FROM ALIVE')
    }
  }

  /**
   * Update to FAULTY (remove the moemebr from the list). Do nothing otherwise.
   * Creates also the related updates
   */
  updateToFaulty(member, setBy, incNumber) {
    remove(this.members, el => (el.node.host === member.host  && el.node.port === member.port))
    this.dissemination.addUpdate(member, setBy, FAULTY, incNumber)
    this.emit('updated-members', this.members.map(({node}) => node)) // only the nodes
  }

  /**
   * Update to FAULTY (remove the member from the list). Do nothing otherwise.
   */
  removeMember(member) {
    remove(this.members, el => (el.node.host === member.host  && el.node.port === member.port))
    this.emit('updated-members', this.members.map(({node}) => node)) // only the nodes
  }

  /**
   * Return the member list, with the esclusion of myself and the optional`membersToSkip`
   * and skipping the FAULTY ones
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

  /**
   * Get the member, returns `null` if not found
   */
  findMember({host, port}) {
    return find(this.members, el => (el.node.host === host  && el.node.port === port))
  }

  isMe({host, port}) {
    return host === this.sdswim.me.host && port === this.sdswim.me.port
  }

  me() {
    return {host: this.sdswim.me.host, port: this.sdswim.me.port}
  }

  size() {
    return this.members.length
  }

}

module.exports = Members
