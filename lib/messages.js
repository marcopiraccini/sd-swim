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

  updateJoinMessage (target, members) {
    const {host, port} = target
    const data = encode({target, members, type: MessageType.UPDATE_JOIN})
    return ({host, port, type: MessageType.UPDATE_JOIN, data})
  }

  pingMessage (target, members) {
    const {host, port} = target
    const data = encode({target, members, type: MessageType.PING})
    return ({host, port, type: MessageType.PING, data})
  }

  pingReqMessage (target, members) {
    const {host, port} = target
    const data = encode({target, members, type: MessageType.PING_REQ})
    return ({host, port, type: MessageType.PING_REQ, data})
  }

  ackMessage (target, members) {
    const {host, port} = target
    const data = encode({target, members, type: MessageType.ACK})
    return ({host, port, type: MessageType.ACK, data})
  }

  decodeMessage (message) {
    return decode(message)
  }

}

module.exports = Messages
