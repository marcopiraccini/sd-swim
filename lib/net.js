'use strict'

/* eslint no-console:0 */

const inherits = require('util').inherits
const EE = require('events').EventEmitter
// const net = require('net')

// reschedulable setTimeout for you node needs. This library is built for building a keep alive functionality across a large numbers of clients/sockets.
// const retimer = require('retimer')

function Net (opts) {
  if (!(this instanceof Net)) {
    return new Net(opts)
  }
  // TODO: add config
  this.opts = opts

  this._init()
}

Net.prototype._init = function init () {
  console.log('init') // temporary
}

inherits(Net, EE)

Net.prototype.send = msg => {
  console.log(msg) // temporary
}

module.exports = Net
