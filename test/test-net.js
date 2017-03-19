/* eslint no-console:0 */

const Net = require('../lib/net')
const assert = require('power-assert')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const {describe, it} = lab

describe('TEST NET COMM - TODO', () => {
  it('should test communication', done => {
    const net = new Net({})
    console.log(net)
    assert.ok(net)
    done()
  })
})
