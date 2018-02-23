'use strict'

const { expect } = require('chai')
const {
  getStubP,
  assertCall,
  assertArgs
} = require('test/utils/stub')

const HttService = require('app/core/services/http')

describe('core:services:http', () => {

  it('should call fetch', () => {
    const url = 'http://test.com'
    const options = { a: 'b' }
    const expected = 'test'
    const fetch = getStubP(expected)
    const service = HttService({
      fetch
    })

    return service
      .get({
        url,
        options
      })
      .then(result => {
        expect(result).eq(expected)

        assertCall(fetch)
        assertArgs(fetch, url, options)
      })
  })

  it('should call fetch & text', () => {
    const url = 'http://test.com'
    const options = { a: 'b' }
    const expected = 'test'
    const text = getStubP(expected)
    const fetch = getStubP({
      text
    })
    const service = HttService({
      fetch
    })

    return service
      .getText({
        url,
        options
      })
      .then(result => {
        expect(result).eq(expected)

        assertCall(fetch)
        assertArgs(fetch, url, options)

        assertCall(text)
        assertArgs(text)
      })
  })

  it('should call fetch & json', () => {
    const url = 'http://test.com'
    const options = { a: 'b' }
    const expected = 'test'
    const json = getStubP(expected)
    const fetch = getStubP({
      json
    })
    const service = HttService({
      fetch
    })

    return service
      .getJSON({
        url,
        options
      })
      .then(result => {
        expect(result).eq(expected)

        assertCall(fetch)
        assertArgs(fetch, url, options)

        assertCall(json)
        assertArgs(json)
      })
  })

})