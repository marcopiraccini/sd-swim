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
  lint: true,
  timeout: 35e3,
  threshold: 70,
  transform: './node_modules/lab-espower-transformer',
  verbose: true,
  reporter: outputs.map(o => o.reporter),
  output: outputs.map(o => o.output),
}
