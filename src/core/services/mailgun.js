'use strict'

const Mailgun = require('mailgun.js')

module.exports = ({
  apiKey,
  domain,
  mailgun = Mailgun
}) => {
  const state = {
    apiKey,
    domain,
    mailgun
  }

  return {
    send: createSend(state)
  }
}

/**
 *
 */
const createSend = ({
  apiKey,
  domain,
  mailgun
}) => ({
  from,
  to,
  subject,
  html,
  text
}) =>
    mailgun
      .client({
        apiKey,
        domain
      })
      .messages
      .create(
        domain,
        {
          from: `${from} <mailgun@${domain}>`,
          to,
          subject,
          html,
          text
        }
      )
