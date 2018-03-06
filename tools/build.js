'use strict'

const {
  join
} = require('path')
const {
  excludeNodeDevDependencies,
  resolveFilePathsFromPatterns,
  zipFiles
} = require('./utils')

const ROOT = join(__dirname, '../')
const {
  name: NAME,
  version: VERSION
} = require(ROOT + 'package.json')
const OUTPUT_DIR = join(ROOT, 'build')
const OUTPUT = join(OUTPUT_DIR, `${NAME}-${VERSION}.zip`)

const DEFAULT_EXCLUDES = [
  '.git/**',
  '.gitignore',
  '.DS_Store',
  'npm-debug.log'
]

excludeNodeDevDependencies(ROOT)
  .then(({ exclude, include }) =>
    resolveFilePathsFromPatterns(
      include,
      DEFAULT_EXCLUDES.concat(exclude),
      ROOT
    )
  )
  .then(files => zipFiles(files, OUTPUT, ROOT))
