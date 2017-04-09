/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Messages = require('../lib/messages')
const {describe, it} = lab

describe('Messages', () => {

  const host1 = {host: 'host1', port: 1234}
  const host2 = {host: 'host2', port: 5678}
  const host3 = {host: 'host3', port: 9101}
  const memberList = []
  memberList.push({node: host1, state: 0, setBy: host3})
  memberList.push({node: host2, state: 0, setBy: host3})

  const messages = new Messages()

  it('should create a Join message correctly', done => {
    const joinMessages = messages.joinMessages([host1, host2])
    assert.equal(joinMessages.length, 2)
    const message1 = messages.decodeMessage(joinMessages[0].data)
    const message2 = messages.decodeMessage(joinMessages[1].data)
    assert.deepEqual(message1.target, host1)
    assert.ok(message1.token)
    assert.deepEqual(message1.memberList, [])
    assert.deepEqual(message2.target, host2)
    assert.ok(message2.token)
    assert.deepEqual(message2.memberList, [])
    done()
  })

  it('should create an UpdateJoin message correctly', done => {
    const token = '8601b162-c329-4f78-bc69-bc41b2ebcfc1'
    const updateJoinMessage = messages.updateJoinMessage(host1, token, memberList)
    const message = messages.decodeMessage(updateJoinMessage.data)
    assert.equal(message.type, 1)
    assert.deepEqual(message.target, host1)
    assert.equal(message.token, token)
    assert.deepEqual(message.memberList, memberList)
    done()
  })

  it('should create a Ping message correctly', done => {
    const pingMessage = messages.pingMessage(host1, memberList)
    const message = messages.decodeMessage(pingMessage.data)
    assert.equal(message.type, 2)
    assert.deepEqual(message.target, host1)
    assert.deepEqual(message.memberList, memberList)
    done()
  })

  it('should create an Ack message correctly', done => {
    const pingMessage = messages.ackMessage(host1, memberList)
    const message = messages.decodeMessage(pingMessage.data)
    assert.equal(message.type, 3)
    assert.deepEqual(message.target, host1)
    assert.deepEqual(message.memberList, memberList)
    done()
  })

  it('should create a PingReq message correctly', done => {
    const pingMessage = messages.pingReqMessage(host1, memberList)
    const message = messages.decodeMessage(pingMessage.data)
    assert.equal(message.type, 4)
    assert.deepEqual(message.target, host1)
    assert.deepEqual(message.memberList, memberList)
    done()
  })

})
