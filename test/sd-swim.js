/* eslint no-console:0 */

const assert = require('power-assert')
const pino = require('pino')
const Lab = require('lab')
const lab = exports.lab = Lab.script()

const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')

describe('SD-Swim', () => {

  it('should start a sd-swim node using default port (11000)', done => {
    // start a single node, that should know only his port.
    // Default port:
    const sdswim = new SDSwim({logger: pino()})
    sdswim.on('up', () => {
      const myself = sdswim.whoami()
      assert.strictEqual(myself.host, undefined)
      assert.strictEqual(myself.port, 11000)
      assert.strictEqual(myself.state, 'STARTED')
      sdswim.stop(() => {
        assert.strictEqual(sdswim.whoami().state, 'STOPPED')
        assert.equal(sdswim.members.length, 0)
        done()
      })
    })
    sdswim.start()
  })

  it('should start a sd-swim node using random port (0)', done => {
    // start a single node, that should know only his port.
    // Default port:
    const sdswim = new SDSwim({logger: pino(), port: 0})
    sdswim.on('up', port => {
      const myself = sdswim.whoami()
      assert.notEqual(port, 11000)
      assert.strictEqual(myself.host, undefined)
      assert.strictEqual(myself.port, port)
      assert.strictEqual(myself.state, 'STARTED')
      sdswim.stop(() => {
        assert.strictEqual(sdswim.whoami().state, 'STOPPED')
        done()
      })
    })
    sdswim.start()
  })

  it('should start a sd-swim node passing a port', done => {
    // start a single node, that should know only his port.
    const port = 12345
    const sdswim = new SDSwim({port})
    sdswim.on('up', () => {
      const myself = sdswim.whoami()
      assert.strictEqual(myself.host, undefined)
      assert.strictEqual(myself.port, port)
      assert.strictEqual(sdswim.whoami().state, 'STARTED')
      sdswim.stop(done)
    })
    sdswim.start()
  })

  it('should start a sd-swim node using a callback', done => {
    const port = 12345
    const sdswim = new SDSwim({port})
    sdswim.start((err, port) => {
      if (err) {
        return assert.fail(err)
      }
      const myself = sdswim.whoami()
      assert.strictEqual(myself.host, undefined)
      assert.strictEqual(myself.port, port)
      sdswim.stop(done)
    })
  })

  it('should fail starting on the same port, checking event', done => {
    const port = 12345
    const sdswim = new SDSwim({port})
    sdswim.start(() => {
      const sdswim2 = new SDSwim({port}) // same port
      sdswim2.start()
      sdswim2.on('error', err => {
        assert.strictEqual(err.code, 'EADDRINUSE')
        assert.strictEqual(sdswim2.whoami().state, 'STOPPED')
        sdswim.stop(done)
      })
    })
  })

  it('should fail starting on the same port, using callbacks', done => {
    const port = 12345
    const sdswim = new SDSwim({port})
    sdswim.start(() => {
      const sdswim2 = new SDSwim({port}) // same port
      sdswim2.start(err => {
        assert.strictEqual(err.code, 'EADDRINUSE')
        assert.strictEqual(sdswim2.whoami().state, 'STOPPED')
        sdswim.stop(done)
      })
    })
  })


  it('should fail start, stop and then start again correctly', done => {
    const port = 12345
    const sdswim = new SDSwim({port})
    sdswim.start((err, port) => {
      assert.equal(err, null)
      const myself = sdswim.whoami()
      assert.strictEqual(myself.host, undefined)
      assert.strictEqual(myself.port, port)
      assert.strictEqual(myself.state, 'STARTED')
      sdswim.stop(() => {
        assert.strictEqual(sdswim.whoami().state, 'STOPPED')
        sdswim.start(() => {
          assert.strictEqual(sdswim.whoami().state, 'STARTED')
          sdswim.stop(() => {
            assert.strictEqual(sdswim.whoami().state, 'STOPPED')
            done()
          })
        })
      })
    })
  })


  describe('given a started node', () => {

    let target
    const targetPort = 12345

    beforeEach(done => {
      target = new SDSwim({port: targetPort})
      target.start(done)
    })

    afterEach(done => {
      target.stop(done)
    })

    it('should new node send a join message and get a correct member list', done => {
      const port = 12340
      const hosts = [{host: '127.0.0.1', port: targetPort}]
      const sdswim = new SDSwim({port, hosts})
      sdswim.start((err) => {
        assert.equal(err, null)
      })
      sdswim.on('updated-members', membersList => {
        const expectedList = [
          { node: { host: '127.0.0.1', port: 12345 },
            state: 0,
            setBy: { host: '127.0.0.1', port: 12345 } },
          { node: { host: '127.0.0.1', port: 12340 },
            state: 0,
            setBy: { host: '127.0.0.1', port: 12345 } } ]
        assert.deepEqual(membersList, expectedList)
        assert.deepEqual(target.members, expectedList)
        assert.deepEqual(sdswim.host, '127.0.0.1')
        assert.deepEqual(sdswim.port, 12340)
        assert.deepEqual(target.host, '127.0.0.1')
        assert.deepEqual(target.port, 12345)

        // must return the memebr list, excluding himself
        const otherMembers = sdswim._getOtherMembers()
        assert.deepEqual(otherMembers, [expectedList[0]])

        sdswim.stop(done)
      })
    })

    it('should new node reach the join timeout when trying to join a non-existing node', done => {
      const port = 12340
      const hosts = [{host: '127.0.0.1', port: targetPort + 1}]
      const sdswim = new SDSwim({port, hosts, joinTimeout: 1000})
      sdswim.start((err) => {
        assert.equal(err, null)
      })
      sdswim.on('updated-members', () => {
        assert.fail("shoudn't receive an answer to join")
        sdswim.stop(done)
      })
      sdswim.on('error', err => {
        assert.ok(err.message.includes('Timeout triggered'))
        sdswim.stop(done)
      })
    })

    it.skip('TODO - MISSING TEST: join more than one host')
    it.skip('TODO - MISSING TEST: timout trigger when join successful')

  })

  describe('given a started node with an empty member list', () => {

    let target
    const targetPort = 12345

    beforeEach(done => {
      target = new SDSwim({port: targetPort})
      target.host = '1.1.1.0'
      target.start(done)
    })

    afterEach(done => {
      target.stop(done)
    })

    it('should update the member list correctly', done => {
      const host1 = {host: '1.1.1.1', port: 1111}
      const host2 = {host: '1.1.1.2', port: 1112}
      const host3 = {host: '1.1.1.3', port: 1112}
      const setBy = {host: target.host, port: target.port}

      const expected1 = {node: host1, state: target.nodeStates.ALIVE, setBy}
      const expected2 = {node: host2, state: target.nodeStates.ALIVE, setBy}
      const expected3 = {node: host1, state: target.nodeStates.FAULTY, setBy}
      const expected4 = {node: host1, state: target.nodeStates.SUSPECT, setBy: host3}

      assert.deepEqual([], target.members)
      target._updateMember(host1, target.nodeStates.ALIVE)
      target._updateMember(host2, target.nodeStates.ALIVE)
      assert.deepEqual([expected1, expected2], target.members)

      target._updateMember(host1, target.nodeStates.FAULTY)
      assert.deepEqual([expected3, expected2], target.members)

      target._updateMember(host1, target.nodeStates.SUSPECT, host3) // set by a different host
      assert.deepEqual([expected4, expected2], target.members)

      done()
    })

  })
})
