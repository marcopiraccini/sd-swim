const assert = require('power-assert')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')
const Members = require('../lib/members')
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
    const members = new Members({sdswim: node})

    const host1 = {host: '1.1.1.1', port: 1111}
    const host2 = {host: '1.1.1.2', port: 1112}
    const host3 = {host: '1.1.1.3', port: 1112}
    const setBy = {host: node.host, port: node.port}

    const expected1 = {node: host1, state: ALIVE, setBy, incNumber: 0}
    const expected2 = {node: host2, state: ALIVE, setBy, incNumber: 0}
    const expected3 = {node: host1, state: FAULTY, setBy, incNumber: 0}
    const expected4 = {node: host1, state: SUSPECT, setBy: host3, incNumber: 0}

    assert.deepEqual([], members.list)
    members.updateMember(host1, ALIVE)
    members.updateMember(host2, ALIVE)
    assert.deepEqual([expected1, expected2], members.list)

    members.updateMember(host1, FAULTY)
    assert.deepEqual([expected3, expected2], members.list)

    members.updateMember(host1, SUSPECT, host3) // set by a different host
    assert.deepEqual([expected4, expected2], members.list)

    done()
  })

})
