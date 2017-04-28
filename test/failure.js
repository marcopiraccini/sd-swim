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
    const ports = [12340]

    beforeEach(done => startNodes(ports, function(err, results) {
        [target] = results
        done()
      })
    )

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
         assert.strictEqual(target.port, ports[0])
         sdswim.stop(() => {
           done()
         })
      })

      sdswim.on('ack', target => {
         assert.strictEqual(target.node.port, ports[0])
         sdswim.stop(() => {
           done()
         })
      })

      sdswim.start()
    })

  })
})
