/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')
const {states: {JOINED}} = require('../lib/states')
const pino = require('pino')
const assert = require('power-assert')
const {startNodes, stopNodes, delay, compareMembers} = require('./common')
const {cloneDeep} = require('lodash')

describe('Failure Detector', () => {

  describe('given a started node', () =>  {

    let target
    const nodeOpts = [{port: 12340}]

    beforeEach(() => startNodes(nodeOpts).then(results => {
      [target] = results
    }))

    afterEach(() => stopNodes([target]))

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
       {port: 12341, hosts: [{host: '127.0.0.1', port:12340}], suspectTimeout: 500},
       {port: 12342, hosts: [{host: '127.0.0.1', port:12340}], suspectTimeout: 500},
       {port: 12343, hosts: [{host: '127.0.0.1', port:12340}], suspectTimeout: 500},
       {port: 12344, hosts: [{host: '127.0.0.1', port:12340}], suspectTimeout: 500},
       {port: 12345, hosts: [{host: '127.0.0.1', port:12340}], suspectTimeout: 500}]

     beforeEach(() => startNodes(opts).then(results => {
       nodes = results
     }))

    afterEach(() => stopNodes(nodes))

    it('should start 5 nodes, and then stop them one by one and the member lists must be coherent', () => {

      const expected =
      [ { host: '127.0.0.1', port: 12340 },
        { host: '127.0.0.1', port: 12341 },
        { host: '127.0.0.1', port: 12342 },
        { host: '127.0.0.1', port: 12343 },
        { host: '127.0.0.1', port: 12344 },
        { host: '127.0.0.1', port: 12345 } ]

      const waitStart = delay(1000) // Startup of all nodes
      const waitClose = delay(1500) // must be higher than the "suspect" timeout

      // check the member list after 2 secs
      return waitStart()
        .then(() => {
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          compareMembers(nodes[2].memberList, expected)
          compareMembers(nodes[3].memberList, expected)
          compareMembers(nodes[4].memberList, expected)
          compareMembers(nodes[5].memberList, expected)
          // All memebres lists are OK. now stop and check the member list after every stop
          return nodes[5].stop()
        })
        .then(waitClose)
        .then(() => {
          expected.pop()
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          compareMembers(nodes[2].memberList, expected)
          compareMembers(nodes[3].memberList, expected)
          compareMembers(nodes[4].memberList, expected)
          return nodes[4].stop()
        })
        .then(waitClose)
        .then(() => {
          expected.pop()
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          compareMembers(nodes[2].memberList, expected)
          compareMembers(nodes[3].memberList, expected)
          return nodes[3].stop()
        })
        .then(waitClose)
        .then(() => {
          expected.pop()
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          compareMembers(nodes[2].memberList, expected)
          return nodes[2].stop()
        })
        .then(waitClose)
        .then(() => {
          expected.pop()
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          return nodes[1].stop()
        })
        .then(waitClose)
        .then(() => {
          expected.pop()
          compareMembers(nodes[0].memberList, expected)
          return nodes[0].stop()
        })
    })

    it('should start 5 nodes, and then stop and restart two of them and the member lists must be coherent', () => {

      const expected =
        [ { host: '127.0.0.1', port: 12340 },
          { host: '127.0.0.1', port: 12341 },
          { host: '127.0.0.1', port: 12342 },
          { host: '127.0.0.1', port: 12343 },
          { host: '127.0.0.1', port: 12344 },
          { host: '127.0.0.1', port: 12345 } ]

      const afterFirstRestart = [expected[0], expected[1], expected[2],expected[3], expected[5]]
      const afterSecondRestart =  cloneDeep(expected)

      const waitStart = delay(1000) // Startup of all nodes
      const wait = delay(2000) // must be higher than the "fault node" timeout (2x suspect timeout)

      let new4, new5

      // check the member list after 2 secs
      return waitStart()
        .then(() => {
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          compareMembers(nodes[2].memberList, expected)
          compareMembers(nodes[3].memberList, expected)
          compareMembers(nodes[4].memberList, expected)
          compareMembers(nodes[5].memberList, expected)
          return nodes[5].stop()
        })
        .then(wait)
        .then(() => {
          expected.pop()
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          compareMembers(nodes[2].memberList, expected)
          compareMembers(nodes[3].memberList, expected)
          compareMembers(nodes[4].memberList, expected)
          return nodes[4].stop()
        })
        .then(wait)
        .then(() => {
          expected.pop()
          compareMembers(nodes[0].memberList, expected)
          compareMembers(nodes[1].memberList, expected)
          compareMembers(nodes[2].memberList, expected)
          compareMembers(nodes[3].memberList, expected)
          new5 = new SDSwim(opts[5]) // If I restart nodes[5] I have issues with the previous state: TODO: in close clean all
          nodes.push(new5)
          return new5.start()
        })
        .then(wait)
        .then(() => {
          compareMembers(nodes[0].memberList, afterFirstRestart)
          compareMembers(nodes[1].memberList, afterFirstRestart)
          compareMembers(nodes[2].memberList, afterFirstRestart)
          compareMembers(nodes[3].memberList, afterFirstRestart)
          compareMembers(new5.memberList, afterFirstRestart)
          new4 = new SDSwim(opts[4]) // If I restart nodes[5] I have issues with the previous state: TODO: in close clean all
          nodes.push(new4)
          return new4.start()
        })
        .then(wait)
        .then(() => {
          compareMembers(nodes[0].memberList, afterSecondRestart)
          compareMembers(nodes[1].memberList, afterSecondRestart)
          compareMembers(nodes[2].memberList, afterSecondRestart)
          compareMembers(nodes[3].memberList, afterSecondRestart)
          compareMembers(new4.memberList, afterSecondRestart)
          compareMembers(new5.memberList, afterSecondRestart)
        })
    })
  })
})
