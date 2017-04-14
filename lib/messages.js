'use strict'

// Encodes and Decodes the protocol buffer messages

// const uuidV4 = require('uuid/v4')
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
        type
      })
      return ({host, port, type, data})
    })
  }

  updateJoinMessage (target, initialMemberList) {
    const {host, port} = target
    const data = encode({target, members: initialMemberList, type: MessageType.UPDATE_JOIN})
    return ({host, port, type: MessageType.UPDATE_JOIN, data})
  }

  pingMessage (target, updates) {
    const {host, port} = target
    const data = encode({target, type: MessageType.PING, updates})
    return ({host, port, type: MessageType.PING, data})
  }

  pingReqMessage (target, updates) {
    const {host, port} = target
    const data = encode({target, type: MessageType.PING_REQ, updates})
    return ({host, port, type: MessageType.PING_REQ, data})
  }

  ackMessage (target, updates) {
    const {host, port} = target
    const data = encode({target, type: MessageType.ACK, updates})
    return ({host, port, type: MessageType.ACK, data})
  }

  decodeMessage (message) {
    return decode(message)
  }

}

module.exports = Messages
