'use strict'


module.exports.handler = (event, context, callback) => {
  console.log('mymarket.ge notifier executed')

  console.log(JSON.stringify(process.env, null, 2))

  callback()
}
