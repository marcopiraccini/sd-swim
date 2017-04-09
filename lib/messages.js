'use strict'

const uuidV4 = require('uuid/v4')
const {readFileSync} = require('fs')
const protobuf = require('protocol-buffers')
const {Msg: {decode, encode}, MessageType} = protobuf(readFileSync('./lib/proto/sd-swim.proto'))

class Messages {
  constructor(opts) {
    this.opts = opts
    this.types = MessageType
  }

  joinMessages (targets) {
    return targets.map(({host, port}) => {
      const type = MessageType.JOIN
      const data = encode({
        target: {host, port},
        token: uuidV4(),
        type
      })
      return ({host, port, type, data})
    })
  }

  updateJoinMessage (target, token, memberList) {
    const {host, port} = target
    const data = encode({target, token, memberList, type: MessageType.UPDATE_JOIN})
    return ({host, port, type: MessageType.UPDATE_JOIN, data})
  }

  pingMessage (target, memberList) {
    const {host, port} = target
    const data = encode({target, memberList, type: MessageType.PING})
    return ({host, port, type: MessageType.PING, data})
  }

  pingReqMessage (target, memberList) {
    const {host, port} = target
    const data = encode({target, memberList, type: MessageType.PING_REQ})
    return ({host, port, type: MessageType.PING_REQ, data})
  }

  ackMessage (target, memberList) {
    const {host, port} = target
    const data = encode({target, memberList, type: MessageType.ACK})
    return ({host, port, type: MessageType.ACK, data})
  }

  decodeMessage (message) {
    return decode(message)
  }

}

module.exports = Messages
