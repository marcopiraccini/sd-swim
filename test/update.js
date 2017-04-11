/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Update = require('../lib/update')
const NodeStates = require('../lib/nodeStates')
const {describe, it} = lab

describe('Update', () => {

  const host1 = {host: 'host1', port: 1234}
  const host2 = {host: 'host2', port: 5678}

  it('should create an alive update correctly', done => {
    const update = new Update({})
    const expected = [{target: host1, setBy: host2, claim: NodeStates.ALIVE}]
    update.addAliveUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    const temp = update.getUpdates()
    assert.deepEqual([], temp) // no more updates
    done()
  })

  it('should create a faulty update correctly', done => {
    const update = new Update({})
    const expected = [{target: host1, setBy: host2, claim: NodeStates.FAULTY}]
    update.addFaultyUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

  it('should create a suspect update correctly', done => {
    const update = new Update({})
    const expected = [{target: host1, setBy: host2, claim: NodeStates.SUSPECT}]
    update.addSuspectUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

  it('should create a list of updates <= updatesMaxSize', done => {
    const update = new Update({})
    const expected = [
      {target: host1, setBy: host2, claim: NodeStates.SUSPECT},
      {target: host1, setBy: host2, claim: NodeStates.FAULTY},
      {target: host1, setBy: host2, claim: NodeStates.ALIVE},
      {target: host1, setBy: host2, claim: NodeStates.ALIVE}
    ]
    update.addSuspectUpdate(host1, host2)
    update.addFaultyUpdate(host1, host2)
    update.addAliveUpdate(host1, host2)
    update.addAliveUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

  it('should create a list of updates > updatesMaxSize and return it correctly', done => {
    const update = new Update({updatesMaxSize: 3})
    const expected = [
      {target: host1, setBy: host2, claim: NodeStates.SUSPECT},
      {target: host1, setBy: host2, claim: NodeStates.FAULTY},
      {target: host1, setBy: host2, claim: NodeStates.ALIVE}
    ]
    const moreExpected = [
      {target: host1, setBy: host2, claim: NodeStates.ALIVE}
    ]
    update.addSuspectUpdate(host1, host2)
    update.addFaultyUpdate(host1, host2)
    update.addAliveUpdate(host1, host2)
    update.addAliveUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    const moreUpdates = update.getUpdates()
    assert.deepEqual(moreExpected, moreUpdates)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

})
