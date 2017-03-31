/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Messages = require('../lib/messages')
const {describe, it} = lab

describe('Messages', () => {

  const messages = new Messages()

  it('should create a join message correctly', done => {
    const host1 = {host: 'host1', port: 1234}
    const host2 = {host: 'host2', port: 5678}
    const hosts = [host1, host2]

    const joinMessages = messages.createJoinMessages(hosts)
    assert.equal(joinMessages.length, 2)
    messages.decodeMessage(joinMessages[0])
    messages.decodeMessage(joinMessages[1])
    done()
  })

})
