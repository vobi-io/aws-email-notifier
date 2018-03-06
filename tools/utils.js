'use strict'

const os = require('os')
const path = require('path')
const crypto = require('crypto')
const globby = require('globby')
const bluebird = require('bluebird')
const _ = require('lodash')
const archiver = require('archiver')
const childProcess = bluebird.promisifyAll(require('child_process'))
const fs = bluebird.promisifyAll(require('graceful-fs'))
const fse = bluebird.promisifyAll(require('fs-extra'))

/**
 * @see https://github.com/serverless/serverless/blob/master/lib/plugins/package/lib/zipService.js
 */
const excludeNodeDevDependencies = lambdaPath => {
  const exAndIn = {
    include: [],
    exclude: []
  }

  // the files where we'll write the dependencies into
  const tmpDir = os.tmpdir()
  const randHash = crypto
    .randomBytes(8)
    .toString('hex')
  const nodeDevDepFile = path.join(
    tmpDir,
    `node-dependencies-${randHash}-dev`
  )
  const nodeProdDepFile = path.join(
    tmpDir,
    `node-dependencies-${randHash}-prod`
  )

  try {
    const packageJsonFilePaths = globby
      .sync(
        ['**/package.json'],
        {
          cwd: lambdaPath,
          dot: true,
          silent: true,
          follow: true,
          nosort: true
        }
      )

    // filter out non node_modules file paths
    const packageJsonPaths = _.filter(
      packageJsonFilePaths,
      filePath => {
        const isNodeModulesDir = !!filePath.match(/node_modules/)
        return !isNodeModulesDir
      }
    )

    if (_.isEmpty(packageJsonPaths)) {
      return bluebird.resolve(exAndIn)
    }

    // NOTE: using mapSeries here for a sequential computation (w/o race conditions)
    return bluebird
      .mapSeries(
        packageJsonPaths,
        packageJsonPath => {
          // the path where the package.json file lives
          const fullPath = path
            .join(
              lambdaPath,
              packageJsonPath
            )
          const dirWithPackageJson = fullPath
            .replace(
              path.join(path.sep, 'package.json'),
              ''
            )

          // we added a catch which resolves so that npm commands with an exit code of 1
          // (e.g. if the package.json is invalid) won't crash the dev dependency exclusion process
          return bluebird
            .map(
              ['dev', 'prod'],
              env => {
                const depFile = env === 'dev'
                  ? nodeDevDepFile
                  : nodeProdDepFile
                const cmd = `npm ls --${env}=true --parseable=true ` +
                  `--long=false --silent >> ${depFile}`

                return childProcess
                  .execAsync(
                    cmd,
                    { cwd: dirWithPackageJson }
                  ).catch(() => bluebird.resolve())
              })
        }
      )
      // NOTE: using mapSeries here for a sequential computation (w/o race conditions)
      .then(() => bluebird.mapSeries(
        ['dev', 'prod'],
        env => {
          const depFile = env === 'dev'
            ? nodeDevDepFile
            : nodeProdDepFile

          return fs
            .readFileAsync(depFile)
            .then(fileContent =>
              _.compact(
                (_.uniq(_.split(fileContent.toString('utf8'), '\n'))),
                elem => elem.length > 0
              )
            )
            .catch(() => bluebird.resolve())
        })
      )
      .then(devAndProDependencies => {
        const devDependencies = devAndProDependencies[0]
        const prodDependencies = devAndProDependencies[1]

        // NOTE: the order for _.difference is important
        const dependencies = _.difference(
          devDependencies,
          prodDependencies
        )
        const nodeModulesRegex = new RegExp(
          `${path.join('node_modules', path.sep)}.*`,
          'g'
        )

        if (!_.isEmpty(dependencies)) {
          return bluebird
            .map(
              dependencies,
              item => item
                .replace(
                  path.join(lambdaPath, path.sep),
                  ''
                )
            )
            .filter(item => item.length > 0 && item.match(nodeModulesRegex))
            .reduce(
              (globs, item) => {
                const packagePath = path.join(
                  lambdaPath,
                  item,
                  'package.json'
                )

                return fs
                  .readFileAsync(
                    packagePath,
                    'utf-8'
                  )
                  .then(packageJsonFile => {
                    const lastIndex = item.lastIndexOf(path.sep) + 1
                    const moduleName = item.substr(lastIndex)
                    const modulePath = item.substr(0, lastIndex)

                    const packageJson = JSON.parse(packageJsonFile)
                    const bin = packageJson.bin

                    const baseGlobs = [path.join(item, '**')]

                    // NOTE: pkg.bin can be object, string, or undefined
                    if (typeof bin === 'object') {
                      _.each(_.keys(bin), (executable) => {
                        baseGlobs.push(
                          path.join(modulePath, '.bin', executable)
                        )
                      })
                      // only 1 executable with same name as lib
                    } else if (typeof bin === 'string') {
                      baseGlobs.push(
                        path.join(modulePath, '.bin', moduleName)
                      )
                    }

                    return globs.concat(baseGlobs)
                  })
              },
              []
            )
            .then(globs => {
              exAndIn.exclude = exAndIn.exclude.concat(globs)
              return exAndIn
            })
        }

        return exAndIn
      })
      .catch(() => exAndIn)
  } catch (e) {
    // fail silently
  }
}

/**
 *
 * @param {string[]} include
 * @param {string[]} exclude
 * @param {string} root
 * @returns {string[]}
 */
const resolveFilePathsFromPatterns = (include, exclude, root) => {
  const patterns = ['**']

  exclude
    .forEach(pattern => {
      if (pattern.charAt(0) !== '!') {
        patterns.push(`!${pattern}`)
      } else {
        patterns.push(pattern.substring(1))
      }
    })

  // push the include globs to the end of the array
  // (files and folders will be re-added again even if they were excluded beforehand)
  include
    .forEach(pattern => {
      patterns.push(pattern)
    })

  return globby(
    patterns,
    {
      cwd: root,
      dot: true,
      silent: true,
      follow: true,
      nodir: true
    }
  )
    .then(filePaths => {
      if (filePaths.length !== 0) {
        return filePaths
      }

      throw new Error('No file matches include / exclude patterns')
    })
}

const getFileContentAndStat = (filePath, root) => {
  const fullPath = path
    .resolve(
      root,
      filePath
    )

  return bluebird
    .all([ // Get file contents and stat in parallel
      fs.readFileAsync(fullPath),
      fs.statAsync(fullPath)
    ])
    .then(result => ({
      data: result[0],
      stat: result[1],
      filePath
    }))
}

/**
 *
 * @param {string[]} files
 * @param {string} outputPath
 */
const zipFiles = (files, outputPath, root) => {
  if (files.length === 0) {
    const error = new Error('No files to package')
    return bluebird.reject(error)
  }

  const zip = archiver.create('zip')
  // Create artifact in temp path and move it to the package path (if any) later
  fse.mkdirsSync(path.dirname(outputPath))
  const output = fs.createWriteStream(outputPath)

  return new bluebird((resolve, reject) => {
    output.on('close', () => resolve(outputPath))
    output.on('error', (err) => reject(err))
    zip.on('error', (err) => reject(err))

    output.on('open', () => {
      zip.pipe(output)

      bluebird
        .all(
          files.map(filePath => getFileContentAndStat(filePath, root))
        )
        .then(contents => {
          _.forEach(
            _.sortBy(contents, ['filePath']),
            file => {
              zip.append(
                file.data,
                {
                  name: file.filePath,
                  mode: file.stat.mode,
                  date: new Date(0) // necessary to get the same hash when zipping the same content
                }
              )
            })

          zip.finalize()
        })
        .catch(reject)
    })
  })
}

module.exports = {
  excludeNodeDevDependencies,
  resolveFilePathsFromPatterns,
  zipFiles
}
