/* eslint no-console:0 */

const protobuf = require('protocol-buffers')
const fs = require('fs')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Messages = require('../lib/messages')
const {describe, it} = lab

describe('TEST NET COMM - TODO', () => {

  const {Msg: {decode}} = protobuf(fs.readFileSync('./lib/proto/sd-swim.proto'))
  const messages = new Messages({})

  it('should create a join message correctly', done => {
    const host1 = {host: 'host1', port: 1234}
    const host2 = {host: 'host2', port: 5678}
    const hosts = [host1, host2]

    const joinMessages = messages.createJoinMessages(hosts)
    assert.equal(joinMessages.length, 2)
    decode(joinMessages[0])
    decode(joinMessages[1])
    done()
  })

})
