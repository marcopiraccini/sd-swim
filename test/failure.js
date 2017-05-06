/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')
const {states: {JOINED}} = require('../lib/states')
const pino = require('pino')
const assert = require('power-assert')
const {startNodes, stopNodes, delay} = require('./common')


describe('Failure Detector', () => {

  describe('given a started node', () =>  {

    let target
    const nodeOpts = [{port: 12340}]

    beforeEach(done => startNodes(nodeOpts, function(err, results) {
      [target] = results
      done()
    }))

    afterEach(done => stopNodes([target], done))

    it('should send a ping message to target after join', done => {

      const hosts = [{host: '127.0.0.1', port: target.port}]

      // start a single node that join the target.
      const sdswim = new SDSwim({logger: pino(), port: 12341, hosts})
      sdswim.on('joined', () => {
        const myself = sdswim.whoami()
        assert.strictEqual(myself.state, JOINED)
      })

      sdswim.on('ping', target => {
         assert.strictEqual(target.port, nodeOpts[0].port)
         sdswim.stop(() => {
           done()
         })
      })

      sdswim.on('ack', target => {
         assert.strictEqual(target.port, nodeOpts[0].port)
         sdswim.stop(() => {
           done()
         })
      })

      sdswim.start()
    })

  })

  describe('given 5 started nodes', () =>  {

    let nodes
    const opts =
      [{port: 12340},
       {port: 12341, hosts: [{host: '127.0.0.1', port:12340}]},
       {port: 12342, hosts: [{host: '127.0.0.1', port:12340}]},
       {port: 12343, hosts: [{host: '127.0.0.1', port:12340}]},
       {port: 12344, hosts: [{host: '127.0.0.1', port:12340}]},
       {port: 12345, hosts: [{host: '127.0.0.1', port:12340}]}]

    beforeEach(done => startNodes(opts, function(err, res) {
      nodes = res
      done(err)
    }))

    afterEach(done => stopNodes(nodes, done))

    it('should start 5 nodes, and then stop them one by one and the member lists must be coherent', () => {

      const expectedMemberListAfterStart =
      [ { host: '127.0.0.1', port: 12340 },
        { host: '127.0.0.1', port: 12341 },
        { host: '127.0.0.1', port: 12342 },
        { host: '127.0.0.1', port: 12343 },
        { host: '127.0.0.1', port: 12344 },
        { host: '127.0.0.1', port: 12345 } ]

      const waitStart = delay(2000) // Startup of all nodes
      const waitClose = delay(2000) // must be higher than the "suspect" timeout

      // check the member list after 2 secs
      return waitStart()
        .then(() => {
          assert.deepEqual(nodes[0].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[1].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[2].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[3].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[4].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[5].memberList, expectedMemberListAfterStart)
          // All memebres lists are OK. now stop and check the member list after every stop
          return nodes[5].stop()
        })
        .then(waitClose)
        .then(() => {
          expectedMemberListAfterStart.pop()
          assert.deepEqual(nodes[0].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[1].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[2].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[3].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[4].memberList, expectedMemberListAfterStart)
          return nodes[4].stop()
        })
        .then(waitClose)
        .then(() => {
          expectedMemberListAfterStart.pop()
          assert.deepEqual(nodes[0].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[1].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[2].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[3].memberList, expectedMemberListAfterStart)
          return nodes[3].stop()
        })
        .then(waitClose)
        .then(() => {
          expectedMemberListAfterStart.pop()
          assert.deepEqual(nodes[0].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[1].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[2].memberList, expectedMemberListAfterStart)
          return nodes[2].stop()
        })
        .then(waitClose)
        .then(() => {
          expectedMemberListAfterStart.pop()
          assert.deepEqual(nodes[0].memberList, expectedMemberListAfterStart)
          assert.deepEqual(nodes[1].memberList, expectedMemberListAfterStart)
          return nodes[1].stop()
        })
        .then(waitClose)
        .then(() => {
          expectedMemberListAfterStart.pop()
          assert.deepEqual(nodes[0].memberList, expectedMemberListAfterStart)
          return nodes[0].stop()
        })
    })
  })
})
