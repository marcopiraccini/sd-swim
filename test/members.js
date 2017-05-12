const assert = require('power-assert')
const Lab = require('lab')
const {compareMemberLists} = require('./common')
const lab = exports.lab = Lab.script()
const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')
const {nodeStates: {ALIVE, SUSPECT, FAULTY}} = require('../lib/states')

describe('Members', () => {
  let node
  const nodePort = 12345

  beforeEach(done => {
    node = new SDSwim({port: nodePort})
    node.host = '1.1.1.0'
    node.start(done)
  })

  afterEach(done => {
    node.stop(done)
  })

  it('should update the member list correctly', done => {
    const members = node.members

    const host1 = {host: '1.1.1.1', port: 1111}
    const host2 = {host: '1.1.1.2', port: 1112}
    const host3 = {host: '1.1.1.3', port: 1112}
    const setBy = {host: node.host, port: node.port}

    const expected1 = {node: host1, state: ALIVE, setBy, incNumber: 0}
    const expected2 = {node: host2, state: ALIVE, setBy, incNumber: 0}
    const expected3 = {node: host1, state: FAULTY, setBy, incNumber: 0}
    const expected4 = {node: host1, state: SUSPECT, setBy: host3, incNumber: 0}

    assert.deepEqual([], members.list)
    members.addOrUpdateMember(host1, ALIVE)
    members.addOrUpdateMember(host2, ALIVE)
    compareMemberLists([expected1, expected2], members.list)

    members.addOrUpdateMember(host1, FAULTY)
    compareMemberLists([expected3, expected2], members.list)

    members.addOrUpdateMember(host1, SUSPECT, host3) // set by a different host
    compareMemberLists([expected4, expected2], members.list)

    done()
  })

  it('should get the correct ping member with two members', done => {
    const members = node.members
    const host1 = {host: '1.1.1.1', port: 1111}
    members.addOrUpdateMember(host1, ALIVE)
    const pingable = members.getPingableMember()
    assert.deepEqual(pingable.node, host1)
    done()
  })

  it('should get the correct ping member with tree members', done => {
    const members = node.members
    const host1 = {host: '1.1.1.1', port: 1111}
    const host2 = {host: '1.1.1.2', port: 1112}
    const me = members.me()
    members.addOrUpdateMember(host1, ALIVE)
    members.addOrUpdateMember(host2, ALIVE)
    const pingable = members.getPingableMember()
    assert.notDeepEqual(pingable.node, me)
    done()
  })

  it('should get the correct ping-req target whit zero group size', done => {
    const members = node.members
    const host1 = {host: '1.1.1.1', port: 1111}
    const host2 = {host: '1.1.1.2', port: 1112}
    const host3 = {host: '1.1.1.3', port: 1112}
    const host4 = {host: '1.1.1.4', port: 1112}
    members.addOrUpdateMember(host1, ALIVE)
    members.addOrUpdateMember(host2, ALIVE)
    members.addOrUpdateMember(host3, ALIVE)
    members.addOrUpdateMember(host4, ALIVE)
    members.addOrUpdateMember(host1, ALIVE)
    const pingables = members.getPingReqGroupMembers(host1, 0)
    assert.deepEqual(pingables, [])
    done()
  })

  it('should get the correct ping-req target whit no pingable candidates', done => {
    const members = node.members
    const host1 = {host: '1.1.1.1', port: 1111}
    members.addOrUpdateMember(host1, ALIVE)
    const pingables = members.getPingReqGroupMembers(host1, 10)
    assert.deepEqual(pingables, [])
    done()
  })

  it('should get the correct ping-req target with four members', done => {
    const members = node.members
    const host1 = {host: '1.1.1.1', port: 1111}
    const host2 = {host: '1.1.1.2', port: 1112}
    const host3 = {host: '1.1.1.3', port: 1112}
    const host4 = {host: '1.1.1.4', port: 1112}
    members.addOrUpdateMember(host1, ALIVE)
    members.addOrUpdateMember(host2, ALIVE)
    members.addOrUpdateMember(host3, ALIVE)
    members.addOrUpdateMember(host4, ALIVE)
    const pingables = members.getPingReqGroupMembers(host1, 3)
    assert(pingables.length, 3)
    done()
  })

  it('should get the correct ping-req target when reaching the end of members list', done => {
    const members = node.members
    const host1 = {host: '1.1.1.1', port: 1111}
    const host2 = {host: '1.1.1.2', port: 1112}
    const host3 = {host: '1.1.1.3', port: 1112}
    const host4 = {host: '1.1.1.4', port: 1112}
    const host5 = {host: '1.1.1.5', port: 1112}
    members.addOrUpdateMember(host1, ALIVE)
    members.addOrUpdateMember(host2, ALIVE)
    members.addOrUpdateMember(host3, ALIVE)
    members.addOrUpdateMember(host4, ALIVE)
    members.addOrUpdateMember(host5, ALIVE)
    const me = members.me()
    const pingables1 = members.getPingReqGroupMembers(host1, 3)
    assert(pingables1.length, 3)
    for (const node of pingables1) {
      if (node.host === host1.host || node.host === me.host) {
        assert.fail(`{node}shoudn't be returned`)
      }
    }
    const pingables2 = members.getPingReqGroupMembers(host1, 3)
    assert(pingables2.length, 3)
    for (const node of pingables2) {
      if (node.host === host1.host || node.host === me.host) {
        assert.fail(`{node}shoudn't be returned`)
      }
    }
    // check after the shuffle
    const pingables3 = members.getPingReqGroupMembers(host1, 3)
    assert(pingables3.length, 3)
    for (const node of pingables3) {
      if (node.host === host1.host || node.host === me.host) {
        assert.fail(`{node}shoudn't be returned`)
      }
    }
    done()
  })
})
