/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Update = require('../lib/update')
const SDSwim = require('../lib/sd-swim')
const {describe, it, beforeEach, afterEach} = lab

describe('Update', () => {

  let node
  let nodeStates
  beforeEach(done => {
    node = new SDSwim({port: 12345})
    nodeStates = node.nodeStates
    node.start(done)
  })

  afterEach(done => {
    node.stop(done)
  })

  const host1 = {host: 'host1', port: 1234}
  const host2 = {host: 'host2', port: 5678}

  it('should create an alive update correctly', done => {
    const update = new Update({sdswim: node})
    const expected = [{target: host1, setBy: host2, claim: nodeStates.ALIVE}]
    update.addUpdate(host1, host2, node.nodeStates.ALIVE)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    const temp = update.getUpdates()
    assert.deepEqual([], temp) // no more updates
    done()
  })

  it('should create an alive update correctly passing the state', done => {
    const update = new Update({sdswim: node})
    const expected = [{target: host1, setBy: host2, claim: nodeStates.ALIVE}]
    update.addAliveUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    const temp = update.getUpdates()
    assert.deepEqual([], temp) // no more updates
    done()
  })

  it('should create a faulty update correctly', done => {
    const update = new Update({sdswim: node})
    const expected = [{target: host1, setBy: host2, claim: nodeStates.FAULTY}]
    update.addFaultyUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

  it('should create a suspect update correctly', done => {
    const update = new Update({sdswim: node})
    const expected = [{target: host1, setBy: host2, claim: nodeStates.SUSPECT}]
    update.addSuspectUpdate(host1, host2)
    const updates = update.getUpdates()
    assert.deepEqual(expected, updates)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

  it('should create a list of updates <= updatesMaxSize', done => {
    const update = new Update({sdswim: node})
    const expected = [
      {target: host1, setBy: host2, claim: nodeStates.SUSPECT},
      {target: host1, setBy: host2, claim: nodeStates.FAULTY},
      {target: host1, setBy: host2, claim: nodeStates.ALIVE},
      {target: host1, setBy: host2, claim: nodeStates.ALIVE}
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
    node.updatesMaxSize = 3
    const update = new Update({sdswim: node})
    const expected = [
      {target: host1, setBy: host2, claim: nodeStates.SUSPECT},
      {target: host1, setBy: host2, claim: nodeStates.FAULTY},
      {target: host1, setBy: host2, claim: nodeStates.ALIVE}
    ]
    const moreExpected = [
      {target: host1, setBy: host2, claim: nodeStates.ALIVE}
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
