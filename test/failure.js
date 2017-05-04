/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')
const {states: {JOINED}} = require('../lib/states')
const pino = require('pino')
const assert = require('power-assert')
const {startNodes, stopNodes} = require('./common')


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

    it('should start 5 nodes, and then stop them and the member list must be coherent', done => {

      const expectedMemberListAfterStart =
      [ { host: '127.0.0.1', port: 12340 },
        { host: '127.0.0.1', port: 12341 },
        { host: '127.0.0.1', port: 12342 },
        { host: '127.0.0.1', port: 12343 },
        { host: '127.0.0.1', port: 12344 },
        { host: '127.0.0.1', port: 12345 } ]

      // check the member list after 2 secs
      setTimeout(() => {
        assert.deepEqual(nodes[0].memberList, expectedMemberListAfterStart)
        assert.deepEqual(nodes[1].memberList, expectedMemberListAfterStart)
        assert.deepEqual(nodes[2].memberList, expectedMemberListAfterStart)
        assert.deepEqual(nodes[3].memberList, expectedMemberListAfterStart)
        assert.deepEqual(nodes[4].memberList, expectedMemberListAfterStart)
        assert.deepEqual(nodes[5].memberList, expectedMemberListAfterStart)

        // TODO: stop and check the member list after every stop

        done()
      }, 2000)

    })
  })
})
