/* eslint no-console:0 */

const assert = require('power-assert')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const pino = require('pino')
const proxyquire = require('proxyquire')
const {describe, it, before, beforeEach} = lab
const Messages = require('../lib/messages')

describe('Protocol Client', () => {

  let client
  let sentMessages = []
  const opts = {}
  const messages = new Messages(opts)

  before(done => {
    const mockedClient = {
      send: (message, offset, length, port, address, cb) => {
        sentMessages.push({message, offset, length, port, address})
        cb()
      },
      close: () => {}
    }
    const mockedDgram = {
      createSocket: () => (mockedClient)
    }
    const Client = proxyquire('../lib/client', {
      'dgram' : mockedDgram
    })
    client = new Client({logger: pino()})
    done()
  })

  beforeEach(done => {
    sentMessages = []
    done()
  })

  it('should send a bunch of join messages', done => {
    const host1 = {host: 'host1', port: 1234}
    const host2 = {host: 'host2', port: 5678}
    const hosts = [host1, host2]
    const joinMessages = messages.createJoinMessages(hosts)
    client.sendMessages(joinMessages, '127.0.0.1', 6666)
    assert.equal(sentMessages.length, 2)
    const firstJoin = messages.decodeMessage(sentMessages[0].message)
    const secondJoin = messages.decodeMessage(sentMessages[1].message)

    assert.deepEqual(firstJoin.target, host1)
    assert.ok(firstJoin.token)
    assert.equal(firstJoin.type, 0)

    assert.deepEqual(secondJoin.target, host2)
    assert.ok(secondJoin.token)
    assert.equal(secondJoin.type, 0)

    done()
  })
})
