const pino = require('pino')
const minimist = require('minimist')
const SDSwim = require('./lib/sd-swim')

/* eslint no-console:0 */

function start () {
  const logger = pino()
  const info = logger.info.bind(logger)
  const debug = logger.info.bind(logger)
  const error = logger.error.bind(logger)

  const argv = minimist(process.argv.slice(2), {
    integer: ['port', 'list'],
    boolean: ['verbose'],
    alias: {
      port: 'p',
      help: 'H',
      verbose: 'v',
      list: 'l',
      joinTimeout: 'j' // join timeout
    },
    default: {
      // We could also assume that the default is 0. If so, UDP try to bind to
      // a random port
      port: process.env.SWIM_PORT || 11000,
      verbose: false,
      list: 0
    }
  })

  const usage = `Usage: ${process.argv[1]} [-p PORT] [-jt 2000] [-l 1000] -v host1[:port1] host2[:port2]...`
  if (argv.help) {
    console.error(usage)
    process.exit(1)
  }

  const nodes = argv._ //  contains all the arguments that didn't have an option associated with them
  const hosts = nodes.map(el => {
    const [host, portStr] = el.split(':')
    const port = Number(portStr)
    if (!port || port < 0 || port > 65535) {
      console.error(`Port ${portStr} not correct, must be a port valid number`)
      console.error(usage)
      process.exit(1)
    }
    return {host, port}
  })

  if (argv.verbose) {
    logger.level = 'debug'
  }

  const opts = Object.assign({hosts, logger}, argv)
  opts.logLevel  ='debug'
  const sdswim = new SDSwim(opts)

  sdswim.on('join-sent', () => {
    info('join reques sent to nodes')
  })

  // nothing on generic error
  sdswim.on('up', port => {
    info({event: 'I am up', port})
  })

  sdswim.on('joined', () => {
    info({id: sdswim.whoami()}, 'Joined')
  })

  sdswim.on('updated-members', members => {
    debug({members}, 'Members List Update')
  })

  sdswim.on('error', err => {
    error(err)
    process.exit(1)
  })
  sdswim.start()

  if (argv.list ) {
    setInterval(() => {
      console.log('*****************************************')
      console.log(sdswim.memberList)
    }, argv.list)
  }
}

if (require.main === module) {
  start()
}
