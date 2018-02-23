'use strict'

const Fetch = require('node-fetch')

module.exports = ({
  fetch = Fetch
}) => {
  const state = {
    fetch
  }

  return {
    get: createGet(state),
    getText: createGetText(state),
    getJSON: createGetJSON(state)
  }
}

const createGet = ({
  fetch
}) => ({
  url,
  options
}) =>
    fetch(url, options)

const createGetText = ({
  fetch
}) => ({
  url,
  options
}) => {
    const get = createGet({ fetch })

    return get({
      url,
      options
    })
      .then(response => response.text())
  }

const createGetJSON = ({
  fetch
}) => ({
  url,
  options
}) => {
    const get = createGet({ fetch })

    return get({
      url,
      options
    })
      .then(response => response.json())
  }