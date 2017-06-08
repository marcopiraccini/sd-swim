/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Messages = require('../lib/messages')
const uuidV4 = require('uuid/v4')
const {describe, it} = lab

describe('Messages', () => {
  const host1 = {host: 'host1', port: 1234}
  const host2 = {host: 'host2', port: 5678}
  const host3 = {host: 'host3', port: 9101}
  const members = []
  const uuid1 = Buffer.alloc(16)
  const uuid2 = Buffer.alloc(16)
  uuidV4(null, uuid1, 0)
  uuidV4(null, uuid2, 0)
  members.push({node: host1, state: 0, setBy: host3, incNumber: 0, uuid: uuid1})
  members.push({node: host2, state: 0, setBy: host3, incNumber: 0, uuid: uuid2})
  const updates = members

  const messages = new Messages()

  it('should create a Join message correctly', done => {
    const joinMessages = messages.joinMessages([host1, host2])
    assert.equal(joinMessages.length, 2)
    const message1 = messages.decodeMessage(joinMessages[0].data)
    const message2 = messages.decodeMessage(joinMessages[1].data)
    assert.deepEqual(message1.destination, host1)
    assert.deepEqual(message1.members, [])
    assert.deepEqual(message2.destination, host2)
    assert.deepEqual(message2.members, [])
    done()
  })

  it('should create an JoinAck message correctly', done => {
    const joinAckMessage = messages.joinAckMessage(host1, members)
    const message = messages.decodeMessage(joinAckMessage.data)
    assert.equal(message.type, 1)
    assert.deepEqual(message.destination, host1)
    assert.deepEqual(message.members, members)
    done()
  })

  it('should create a Ping message correctly', done => {
    const pingMessage = messages.pingMessage(host1, updates)
    const message = messages.decodeMessage(pingMessage.data)
    assert.equal(message.type, 2)
    assert.deepEqual(message.destination, host1)
    assert.deepEqual(message.updates, updates)
    done()
  })

  it('should create an Ack message correctly', done => {
    const pingMessage = messages.ackMessage(host1, null, null, updates)
    const message = messages.decodeMessage(pingMessage.data)
    assert.equal(message.type, 3)
    assert.deepEqual(message.destination, host1)
    assert.deepEqual(message.updates, updates)
    done()
  })

  it('should create a PingReq message correctly', done => {
    const pingMessage = messages.pingReqMessage(host1, host2, host3, updates)
    const message = messages.decodeMessage(pingMessage.data)
    assert.equal(message.type, 4)
    assert.deepEqual(message.destination, host1)
    assert.deepEqual(message.updates, updates)
    assert.deepEqual(message.request.target, host2)
    assert.deepEqual(message.request.requester, host3)
    done()
  })

  it('should create an Ack from a PingReq message correctly', done => {
    const pingMessage = messages.ackMessage(host1, host2, host3, updates)
    const message = messages.decodeMessage(pingMessage.data)
    assert.equal(message.type, 3)
    assert.deepEqual(message.destination, host1)
    assert.deepEqual(message.updates, updates)
    assert.deepEqual(message.request.target, host2)
    assert.deepEqual(message.request.requester, host3)
    done()
  })

  // Metadata extension messages ********************+

  it('should create an Meta messages correctly', done => {
    const metadata = [{
      owner: host1,
      entries: [
        {key: 'test1', value: Buffer.from('testValue1')},
        {key: 'test2', value: Buffer.from('testValue2')}
      ],
      version: 3
    }]
    const metaMessages = messages.metaMessages([host1], metadata)
    const message = messages.decodeMessage(metaMessages[0].data)
    assert.equal(message.type, 10)
    assert.deepEqual(message.metadata, metadata)
    done()
  })

  it('should create an ask All Meta message correctly', done => {
    const metaMessage = messages.askAllMetaMessage(host1)
    const message = messages.decodeMessage(metaMessage.data)
    assert.equal(message.type, 11)
    assert.deepEqual(message.destination, host1)
    done()
  })
})
