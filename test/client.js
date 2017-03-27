/* eslint no-console:0 */

const Client = require('../lib/client')
const assert = require('power-assert')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const pino = require('pino')
const {describe, it} = lab

describe('Communication Client', () => {
  it('should test communication', done => {
    const client = new Client({logger: pino()})
    // console.log(net)
    assert.ok(client)
    done()
  })
})
