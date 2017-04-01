/* eslint no-console:0 */

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const assert = require('power-assert')
const Messages = require('../lib/messages')
const {describe, it} = lab

describe('Messages', () => {

  const host1 = {host: 'host1', port: 1234}
  const host2 = {host: 'host2', port: 5678}

  const messages = new Messages()

  it('should create a join message correctly', done => {
    const joinMessages = messages.joinMessages([host1, host2])
    assert.equal(joinMessages.length, 2)
    const message1 = messages.decodeMessage(joinMessages[0])
    const message2 = messages.decodeMessage(joinMessages[1])
    assert.deepEqual(message1.target, host1)
    assert.ok(message1.token)
    assert.deepEqual(message1.memberList, [])
    assert.deepEqual(message2.target, host2)
    assert.ok(message2.token)
    assert.deepEqual(message2.memberList, [])
    done()
  })

  it('should create an updateJoin message correctly', done => {
    const token = '8601b162-c329-4f78-bc69-bc41b2ebcfc1'
    const memberList = []
    memberList.push(Object.assign({}, host1, {state: 0}))
    memberList.push(Object.assign({}, host2, {state: 0}))
    const updateJoinMessage = messages.updateJoinMessages(host1, token, memberList)
    const message = messages.decodeMessage(updateJoinMessage)
    assert.deepEqual(message.target, host1)
    assert.equal(message.token, token)
    assert.deepEqual(message.memberList, memberList)
    done()
  })

})
