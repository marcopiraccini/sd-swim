/* eslint no-console:0 */

const assert = require('power-assert')
const pino = require('pino')
const Lab = require('lab')
const lab = exports.lab = Lab.script()

const {describe, it} = lab
const SDSwim = require('../lib/sd-swim')
const {states: {STARTED, STOPPED}} = require('../lib/states')


describe('SD-Swim', () => {

  it('should start a sd-swim node using default port (11000)', done => {
    // start a single node, that should know only his port.
    // Default port:
    const sdswim = new SDSwim({logger: pino()})

    sdswim.on('up', () => {
      const myself = sdswim.whoami()
      assert.strictEqual(myself.host, undefined)
      assert.strictEqual(myself.port, 11000)
      assert.strictEqual(myself.state, STARTED)
      sdswim.stop(() => {
        assert.strictEqual(sdswim.whoami().state, STOPPED)
        assert.equal(sdswim.memberList.length, 0)
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
      assert.strictEqual(myself.state, STARTED)
      sdswim.stop(() => {
        assert.strictEqual(sdswim.whoami().state, STOPPED)
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
      assert.strictEqual(sdswim.whoami().state, STARTED)
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
        assert.strictEqual(sdswim2.whoami().state, STOPPED)
        sdswim.stop(done)
      })
    })
  })

  it('should fail starting on the same port, using callbacks', done => {
    const port = 12345
    const sdswim = new SDSwim({port})
    sdswim.start(() => {
      const sdswim2 = new SDSwim({port}) // same port
      sdswim2.on('error', () => {})
      sdswim2.start(err => {
        assert.strictEqual(err.code, 'EADDRINUSE')
        assert.strictEqual(sdswim2.whoami().state, STOPPED)
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
      assert.strictEqual(myself.state, STARTED)
      sdswim.stop(() => {
        assert.strictEqual(sdswim.whoami().state, STOPPED)
        sdswim.start(() => {
          assert.strictEqual(sdswim.whoami().state, STARTED)
          sdswim.stop(() => {
            assert.strictEqual(sdswim.whoami().state, STOPPED)
            done()
          })
        })
      })
    })
  })

  it('should start a sd-swim node using promises', done => {
    const sdswim = new SDSwim({logger: pino()})
    sdswim.start().then(() => sdswim.stop()).then(done)
  })

})
