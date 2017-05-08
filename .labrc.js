const outputs = [{
  reporter: 'html',
  output: 'coverage/index.html'
}, {
  reporter: 'console',
  output: 'stdout'
}]

module.exports = {
  coverage: true,
  leaks: true,
  globals: '__core-js_shared__', // came from power-assert
  lint: false,
  timeout: 15e3,
  threshold: 90, // lowered temporary
  transform: './node_modules/lab-espower-transformer',
  verbose: true,
  reporter: outputs.map(o => o.reporter),
  output: outputs.map(o => o.output),
}
