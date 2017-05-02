/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {omit} = require('lodash')
const assert = require('power-assert')
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
  const host3 = {host: 'host3', port: 5679}
  const host4 = {host: 'host4', port: 5679}

  it('should create an alive update correctly', done => {
    const update = node.opts.update
    const expected = [{node: host1, setBy: host2, state: ALIVE, incNumber: 0, uuid: "1"}]
    update.addUpdate(host1, host2, ALIVE, 0, "1")
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    const temp = update.getUpdates()
    assert.deepEqual([], temp) // no more updates
    done()
  })

  it('should create an alive update correctly passing the state', done => {
    const update = node.opts.update
    const expected = [{node: host1, setBy: host2, state: ALIVE, incNumber: 1, uuid: "1"}]
    update.addUpdate(host1, host2, ALIVE, 1, "1")
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    const temp = update.getUpdates()
    assert.deepEqual(temp, []) // no more updates
    done()
  })

  it('should create a faulty update correctly', done => {
    const update = node.opts.update
    const expected = [{node: host1, setBy: host2, state: FAULTY, incNumber: 0, uuid: "1"}]
    update.addUpdate(host1, host2, FAULTY, 0, "1")
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    assert.deepEqual([], update.getUpdates()) // no more updates
    done()
  })

  it('should create a suspect update correctly', done => {
    const update = node.opts.update
    const expected = [{node: host1, setBy: host2, state: SUSPECT, incNumber: 0, uuid: "1"}]
    update.addUpdate(host1, host2, SUSPECT, 0, "1")
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    assert.deepEqual(update.getUpdates(), []) // no more updates
    done()
  })

  it('should create a list of updates <= updatesMaxSize, with no member list', done => {
    const update = node.opts.update
    const expected = [
      {node: host1, setBy: host2, state: SUSPECT, incNumber: 0, uuid: "1"},
      {node: host2, setBy: host2, state: FAULTY, incNumber: 0, uuid: "1"},
      {node: host3, setBy: host2, state: ALIVE, incNumber: 0, uuid: "1"},
      {node: host4, setBy: host2, state: ALIVE, incNumber: 0, uuid: "1"}
    ]
    update.addUpdate(host1, host2, SUSPECT, 0, "1")
    update.addUpdate(host2, host2, FAULTY, 0, "1")
    update.addUpdate(host3, host2, ALIVE, 0, "1")
    update.addUpdate(host4, host2, ALIVE, 0, "1")
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    assert.deepEqual(update.getUpdates(), []) // no more updates, member list is 0 so also the dissemination Limit
    done()
  })

  it('should create a list of updates <= updatesMaxSize, with member list', done => {
    const update = node.opts.update
    update.opts.members.list = new Array(100) // a (empty) member list of 100 memebrs
    const expected = [
      {node: host1, setBy: host2, state: SUSPECT, incNumber: 0, uuid: "1"},
      {node: host2, setBy: host2, state: FAULTY, incNumber: 0, uuid: "1"},
      {node: host3, setBy: host2, state: ALIVE, incNumber: 0, uuid: "1"},
      {node: host4, setBy: host2, state: ALIVE, incNumber: 0, uuid: "1"}
    ]
    update.addUpdate(host1, host2, SUSPECT, 0, "1")
    update.addUpdate(host2, host2, FAULTY, 0, "1")
    update.addUpdate(host3, host2, ALIVE, 0, "1")
    update.addUpdate(host4, host2, ALIVE, 0, "1")
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    assert.deepEqual(update.getUpdates(), expected) // expecting the same
    done()
  })

  it('should create a list of updates > updatesMaxSize and return it correctly', done => {
    const update = node.opts.update
    update.updatesMaxSize = 3
    const expected = [
      {node: host1, setBy: host2, state: SUSPECT, incNumber: 0, uuid: "1"},
      {node: host2, setBy: host2, state: FAULTY, incNumber: 0, uuid: "1"},
      {node: host3, setBy: host2, state: ALIVE, incNumber: 0, uuid: "1"}
    ]
    update.addUpdate(host1, host2, SUSPECT, 0, "1")
    update.addUpdate(host2, host2, FAULTY, 0, "1")
    update.addUpdate(host3, host2, ALIVE, 0, "1")
    update.addUpdate(host4, host2, ALIVE, 0, "1")
    const updates = update.getUpdates()
    assert.deepEqual(updates, expected)
    done()
  })

  describe('Given an ALIVE update', () => {

    it('should process an ALIVE update correctly with unknown member', done => {
      const update = node.opts.update
      const updateToAlive = {
        node: host1,
        state: ALIVE,
        setBy: host2,
        incNumber: 0,
        uuid: "1"
      }
      update.processUpdates([updateToAlive])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [updateToAlive])
      done()
    })

    it('should process an ALIVE update correctly with member with incNumber <= than the update', done => {
      const update = node.opts.update
      const updateToAlive = {node: host1, state: ALIVE, setBy: host2, incNumber: 0, uuid: "1"}
      update.processUpdates([updateToAlive])
      assert.deepEqual(update.getUpdates(), [updateToAlive])
      const newUpdateToAlive = {node: host1, state: ALIVE, setBy: host3, incNumber: 1, uuid: "1"}
      update.processUpdates([newUpdateToAlive])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [newUpdateToAlive, updateToAlive])
      done()
    })

    it('should process an ALIVE update correctly with member with incNumber > than the update', done => {
      const update = node.opts.update
      const updateToAlive = {node: host1, state: ALIVE, setBy: host2, incNumber: 1, uuid: "1"}
      update.processUpdates([updateToAlive])
      const newUpdateToAlive = {node: host1, state: ALIVE, setBy: host3, incNumber: 0, uuid: "1"}
      update.processUpdates([newUpdateToAlive])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [updateToAlive])
      done()
    })

    it('should process an ALIVE update correctly with a SUSPECT member with incNumber <= than the update', done => {
      const update = node.opts.update
      const updateToSuspect = {node: host1, state: SUSPECT, setBy: host2, incNumber: 0, uuid: "1"}
      update.processUpdates([updateToSuspect])
      const newUpdateToAlive = {node: host1, state: ALIVE, setBy: host3, incNumber: 1, uuid: "1"}
      update.processUpdates([newUpdateToAlive])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      done()
    })
  })

  describe('Given an SUSPECT update', () => {

    it('should process an SUSPECT update correctly when target is ME', done => {
      // a new ALIVE message must be produces with incNumber incremented
      const update = node.opts.update
      node.host = host1.host
      node.port = host1.port
      const updateToSuspect = {
        node: host1,
        state: SUSPECT,
        setBy: host2,
        incNumber: 0,
        uuid: "1"
      }
      update.processUpdates([updateToSuspect])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])

      const expectedMember = {
        node: host1,
        state: ALIVE,
        setBy: host1,
        incNumber: 1
      }
      assert.deepEqual(update.getUpdates().map(el => omit(el, 'uuid')), [expectedMember])
      done()
    })

    it('should process an SUSPECT update correctly with unknown member', done => {
      const update = node.opts.update
      const updateToSuspect = {
        node: host1,
        state: SUSPECT,
        setBy: host2,
        incNumber: 0,
        uuid: "1"
      }
      update.processUpdates([updateToSuspect])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [updateToSuspect])
      done()
    })

    it('should process an SUSPECT update correctly with a ALIVE member with incNumber <= than the update', done => {
      const update = node.opts.update
      const updateToAlive = {node: host1, state: ALIVE, setBy: host2, incNumber: 0, uuid: "1"}
      update.processUpdates([updateToAlive])
      assert.deepEqual(update.getUpdates(), [updateToAlive])

      const newUpdateToSuspect = {node: host1, state: SUSPECT, setBy: host3, incNumber: 1, uuid: "1"}
      update.processUpdates([newUpdateToSuspect])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [newUpdateToSuspect, updateToAlive])
      done()
    })

    it('should ignore a SUSPECT update when ALIVE member with incNumber > than the update', done => {
      const update = node.opts.update
      const updateToAlive = {node: host1, state: ALIVE, setBy: host2, incNumber: 1, uuid: "1"}
      update.processUpdates([updateToAlive])
      assert.deepEqual(update.getUpdates(), [updateToAlive])

      const newUpdateToSuspect = {node: host1, state: SUSPECT, setBy: host3, incNumber: 0, uuid: "1"}
      update.processUpdates([newUpdateToSuspect])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [updateToAlive])
      done()
    })

    it('should process a SUSPECT update correctly with a SUSPECT member with incNumber <= than the update', done => {
      const update = node.opts.update
      const updateToSuspect = {node: host1, state: SUSPECT, setBy: host2, incNumber: 0, uuid: "1"}
      update.processUpdates([updateToSuspect])
      assert.deepEqual(update.getUpdates(), [updateToSuspect])

      const newUpdateToSuspect = {node: host1, state: SUSPECT, setBy: host3, incNumber: 1, uuid: "1"}
      update.processUpdates([newUpdateToSuspect])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [newUpdateToSuspect, updateToSuspect])
      done()
    })

    it('should ignore a SUSPECT update correctly with a SUSPECT member with incNumber > than the update', done => {
      const update = node.opts.update
      const updateToSuspect = {node: host1, state: SUSPECT, setBy: host2, incNumber: 1, uuid: "1"}
      update.processUpdates([updateToSuspect])
      assert.deepEqual(update.getUpdates(), [updateToSuspect])

      const newUpdateToSuspect = {node: host1, state: SUSPECT, setBy: host3, incNumber: 0, uuid: "1"}
      update.processUpdates([newUpdateToSuspect])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])
      assert.deepEqual(update.getUpdates(), [updateToSuspect])
      done()
    })

  })

  describe('Given an FAULTY update', () => {

    it('should ignore a FAULTY update if member is not present', done => {
      const update = node.opts.update
      const updateToFaulty = {
        node: host1,
        state: FAULTY,
        setBy: host2,
        incNumber: 0,
        uuid: "1"
      }
      update.processUpdates([updateToFaulty])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [])
      done()
    })

    it('should create an ALIVE message if target is ME', done => {
      // a new ALIVE message must be produces with incNumber incremented
      const update = node.opts.update
      node.host = host1.host
      node.port = host1.port
      const updateToFaulty = {
        node: host1,
        state: FAULTY,
        setBy: host2,
        incNumber: 0,
        uuid: "1"
      }
      update.processUpdates([updateToFaulty])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [host1])

      const expectedMember = {
        node: host1,
        state: ALIVE,
        setBy: host1,
        incNumber: 1
      }
      assert.deepEqual(update.getUpdates().map(el => omit(el, 'uuid')), [expectedMember])
      done()
    })

    it('should create a FAULTY update correctly (remove the member and propagates the update) when member with incNumber < than the update', done => {
      const update = node.opts.update
      const updateToAlive = {node: host1, state: ALIVE, setBy: host2, incNumber: 0, uuid: "1"}
      update.processUpdates([updateToAlive])
      assert.deepEqual(update.getUpdates(), [updateToAlive])
      const newUpdateToFaulty = {node: host1, state: FAULTY, setBy: host3, incNumber: 1, uuid: "1"}
      update.processUpdates([newUpdateToFaulty])
      assert.deepEqual(node.memberList.map(el => omit(el, 'uuid')), [])
      assert.deepEqual(update.getUpdates(), [newUpdateToFaulty, updateToAlive])
      done()
    })

  })

})
