/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Update = require('../lib/update')
const SDSwim = require('../lib/sd-swim')
const {nodeStates: {ALIVE, SUSPECT, FAULTY}} = require('../lib/states')
const {describe, it, beforeEach, afterEach} = lab

describe('Update', () => {

  let node
  beforeEach(done => {
    node = new SDSwim({port: 12345})
    node.start(done)
  })

  afterEach(done => {
    node.stop(done)
  })

  const host1 = {host: 'host1', port: 1234}
  const host2 = {host: 'host2', port: 5678}

  it('should create an alive update correctly', done => {
    const update = new Update({sdswim: node})
    const expected = [{node: host1, setBy: host2, state: ALIVE, incNumber: 0}]
    update.addUpdate(host1, host2, ALIVE, 0)
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    const temp = update.getUpdates()
    assert.deepEqual([], temp) // no more updates
    done()
  })

  it('should create an alive update correctly passing the state', done => {
    const update = new Update({sdswim: node})
    const expected = [{node: host1, setBy: host2, state: ALIVE, incNumber: 1}]
    update.addAliveUpdate(host1, host2, 1)
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    const temp = update.getUpdates()
    assert.deepEqual(temp, []) // no more updates
    done()
  })

  it('should create a faulty update correctly', done => {
    const update = new Update({sdswim: node})
    const expected = [{node: host1, setBy: host2, state: FAULTY, incNumber: 0}]
    update.addFaultyUpdate(host1, host2, 0)
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

  it('should create a suspect update correctly', done => {
    const update = new Update({sdswim: node})
    const expected = [{node: host1, setBy: host2, state: SUSPECT, incNumber: 0}]
    update.addSuspectUpdate(host1, host2, 0)
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    assert.deepEqual(update.getUpdates(), []) // no more updates
    done()
  })

  it('should create a list of updates <= updatesMaxSize', done => {
    const update = new Update({sdswim: node})
    const expected = [
      {node: host1, setBy: host2, state: SUSPECT, incNumber: 0},
      {node: host1, setBy: host2, state: FAULTY, incNumber: 0},
      {node: host1, setBy: host2, state: ALIVE, incNumber: 0},
      {node: host1, setBy: host2, state: ALIVE, incNumber: 0}
    ]
    update.addSuspectUpdate(host1, host2, 0)
    update.addFaultyUpdate(host1, host2, 0)
    update.addAliveUpdate(host1, host2, 0)
    update.addAliveUpdate(host1, host2, 0)
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    assert.deepEqual(update.getUpdates(), []) // no more updates
    done()
  })

  it('should create a list of updates > updatesMaxSize and return it correctly', done => {
    const update = new Update({updatesMaxSize: 3})
    const expected = [
      {node: host1, setBy: host2, state: SUSPECT, incNumber: 0},
      {node: host1, setBy: host2, state: FAULTY, incNumber: 0},
      {node: host1, setBy: host2, state: ALIVE, incNumber: 0}
    ]
    const moreExpected = [
      {node: host1, setBy: host2, state: ALIVE, incNumber: 0}
    ]
    update.addSuspectUpdate(host1, host2, 0)
    update.addFaultyUpdate(host1, host2, 0)
    update.addAliveUpdate(host1, host2, 0)
    update.addAliveUpdate(host1, host2, 0)
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    const moreUpdates = update.getUpdates()
    assert.deepEqual(moreUpdates, moreExpected)
    assert.deepEqual(update.getUpdates(), []) // no more updates
    done()
  })

})
