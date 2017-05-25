const { find, remove, shuffle } = require('lodash')
const { nodeStates: { ALIVE, FAULTY, SUSPECT } } = require('../lib/states')
const { EventEmitter } = require('events')

// Memebers list and operations on it
// Also, after an interval, move a SUSPECT node to FAULTY, remove the member and generate the updates
// Events:
// - updated-members: when the whole list is set after a join
// - peerUp
// - peerDown

class Members extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts
    this.sdswim = opts.sdswim
    this.dissemination = opts.dissemination
    this.logger = this.opts.logger

    // Members list options
    this.suspectTimeout = opts.suspectTimeout || 1000

    this.members = [] // The actual member list. Contains all the current ALIVE and SUSPECT members
    this.last = 0 // Index of the "next" element returned

    this.getRandomMemberIndex = arr => Math.floor(Math.random() * arr.length)
  }

  get list () {
    return this.members
  }

  set list (list) {
    this.members = list
    this.emit('updated-members', this.members.map(({ node }) => node)) // only the nodes
  }

  /**
   * Add member to member list with a node and state
   * The node is updated if already in list or added if not.
   * Default: add himself as ALIVE, setBy as himself, incNumber = 0
   */
  addOrUpdateMember (
    node = this.sdswim.me,
    state = ALIVE,
    setBy = this.sdswim.me,
    incNumber = 0
  ) {
    const current = this.findMember(node)
    if (current) {
      current.setBy = setBy
      current.state = state
      current.incNumber = incNumber
    } else {
      // we add the element in a random position
      const index = this.getRandomMemberIndex(this.members)
      this.members.splice(index, 0, { node, setBy, state, incNumber })
      if (state === ALIVE) {
        // added ALIVE member, but emitting only if not myself
        if (this.isMe(node)) {
          return
        }
        this.emit('peerUp', node)
      }
    }
  }

  /**
   * Add member to member list when (same as addOrUpdateMember but propagate the updates).
   */
  addOrUpdateMemberWithPropagate (
    node = this.sdswim.me,
    state = ALIVE,
    setBy = this.sdswim.me,
    incNumber = 0
  ) {
    this.addOrUpdateMember.apply(this, arguments)
    this.dissemination.propagate({ node, setBy, state, incNumber })
  }

  /**
   * If SUSPECT updates to ALIVE. Do nothing otherwise.
   * Creates also the related updates
   */
  updateToAlive (member) {
    const current = this.findMember(member)
    if (!current) {
      return
    }
    const { node, state, incNumber } = current
    if (state === SUSPECT) {
      this.dissemination.addUpdate(node, this.sdswim.me, ALIVE, incNumber)
      this.logger.debug(node, 'updated to ALIVE FROM SUSPECT')
    }
  }

  /**
   * If ALIVE update to SUSPECT. Do nothing otherwise.
   * Creates also the related updates
   */
  updateToSuspect (member) {
    const current = this.findMember(member)
    if (!current) {
      return
    }
    const { node, state, incNumber } = current
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
  updateToFaulty (member, setBy, incNumber) {
    this.removeMember(member)
    this.dissemination.addUpdate(member, setBy, FAULTY, incNumber)
  }

  /**
   * Update to FAULTY (remove the member from the list). Do nothing otherwise.
   */
  removeMember (member) {
    remove(
      this.members,
      el => el.node.host === member.host && el.node.port === member.port
    )
    this.emit('peerDown', member)
  }

  // Get next `n` members for the ping/ping-req. The members array is traversed
  // circularly  and if traversal is completed i the process, is then shuffled
  // `membersToSkip` are excluded
  getNextMembers (membersToSkip, n) {
    const ret = []
    if (n <= 0 || this.members.length === 0) {
      return ret
    }
    let curr = this.last
    let exit = false
    let shuffleWhenDone = false
    while (!exit) {
      const current = this.members[curr]
      if (current) {
        const skip = membersToSkip.some(
          ({ host, port }) =>
            current.node.host === host && current.node.port === port
        )
        if (!skip) {
          ret.push(current)
        }
        curr++
        if (curr === this.members.length) {
          curr = 0
          shuffleWhenDone = true
        }
        // We exit if n is reached or we are back to the element from which we started
        if (ret.length === n || curr === this.last) {
          exit = true
          this.last = curr
        }
      } else {
        this.last = 0
        exit = true
      }
    }
    // Shuffle if in the process above we reached the end of the array
    if (shuffleWhenDone) {
      this.members = shuffle(this.members)
      this.last = 0
    }
    return ret
  }

  /**
   * Get the member target for the PING.
   */
  getPingableMember () {
    const pingableMembers = this.getNextMembers([this.sdswim.me], 1)
    if (!pingableMembers.length) {
      return // no candidates
    }
    return pingableMembers[0]
  }

  /**
   * Get the `pingReqGroupSize` members target for the PING-REQ.
   */
  getPingReqGroupMembers (target, pingReqGroupSize) {
    return this.getNextMembers([this.sdswim.me, target], pingReqGroupSize)
  }

  /**
   * Get the member, returns `null` if not found
   */
  findMember ({ host, port }) {
    return find(
      this.members,
      el => el.node.host === host && el.node.port === port
    )
  }

  isMe ({ host, port }) {
    return host === this.sdswim.me.host && port === this.sdswim.me.port
  }

  me () {
    return { host: this.sdswim.me.host, port: this.sdswim.me.port }
  }

  size () {
    return this.members.length
  }

  /**
   * Get the member target for the PING.
   */
  getOtherMembers () {
    return this.members.filter(el => !this.isMe(el.node))
  }
}

module.exports = Members
