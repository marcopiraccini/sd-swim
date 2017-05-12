/* eslint no-console:0 */

const assert = require('power-assert')
const Lab = require('lab')
const lab = exports.lab = Lab.script()

const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')
const {states: {JOINED}} = require('../lib/states')
const {compareNodesLists} = require('./common')

describe('Join', () => {
  let target
  const targetPort = 12345

  beforeEach(done => {
    target = new SDSwim({port: targetPort})
    target.start(done)
  })

  afterEach(done => {
    target.stop(done)
  })

  it('should join and emit the joined event', done => {
    const hosts = [{host: '127.0.0.1', port: target.port}]
    // start a single node that join the target.
    const sdswim = new SDSwim({port: 12340, hosts})
    sdswim.on('joined', () => {
      const myself = sdswim.whoami()
      assert.strictEqual(myself.state, JOINED)
      sdswim.stop(() => {
        done()
      })
    })
    sdswim.start()
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
        { host: '127.0.0.1', port: 12345 },
        { host: '127.0.0.1', port: 12340 }]
      compareNodesLists(membersList, expectedList)
      compareNodesLists(target.memberList, expectedList)

      assert.deepEqual(sdswim.host, '127.0.0.1')
      assert.deepEqual(sdswim.port, 12340)
      assert.deepEqual(target.host, '127.0.0.1')
      assert.deepEqual(target.port, 12345)

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
      assert.fail('shoudn\'t receive an answer to join')
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
