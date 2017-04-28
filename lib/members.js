const {differenceBy, find} = require('lodash')
const {nodeStates: {ALIVE, FAULTY}} = require('../lib/states')
const {EventEmitter} = require('events')

// Memebers list and operations on it
// [TODO]: after an interval, move SUSPECT to FAULTY, remove the member and generate the updates
// Events:
// - updated-members
class Members extends EventEmitter {

  constructor(opts) {
    super()
    this.opts = opts
    this.sdswim = opts.sdswim
    this.update = opts.update
    this.members = []
    this.getRandomMember = (arr) => (arr[Math.floor(Math.random() * arr.length)])
  }

  get list() {
    return this.members
  }

  set list(list) {
    this.members = list
    this.emit('updated-members', this.members)
  }

  /**
   * Update member list with a node and state and add the updates to be propagated.
   * The node is updated if already in list or added if not.
   * Default: add himself as ALIVE and setBy as himself
   */
  updateMember(node = this.sdswim.me, state = ALIVE,
      setBy = this.sdswim.me, incNumber = 0) {
    const current = find(this.members, el => (el.node.host === node.host  && el.node.port === node.port))

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
   * Get the memember target for the ping (random in this implementation, see README's TODO)
   */
  getPingableMember() {
    const pingableMembers = this.getOtherNonFaultyMembers()
    if (!pingableMembers.length) {
      return // no candidates
    }
    return this.getRandomMember(pingableMembers)
  }
}

module.exports = Members
