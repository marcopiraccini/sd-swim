/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()

const {describe, it, beforeEach, afterEach} = lab
const SDSwim = require('../lib/sd-swim')

describe('Failure Detector', () => {

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
      // TODO
      done()
    })

  })})
