
// Error handler
const errorHandler = (err, req, res, next) => {
  const code = res.statusCode
  console.log(err)
  // if status 200 change to 500, otherwise get the defined status code
  res.status(code === 200 ? 500 : code)
  res.json({ id: req.id, status: code, error: err.toString() })
}

// Require user to be authenticated
const requireAuthorisation = (req, res, next) => {
  if (req.header('Authorization') !== 'undefined' && req.header('Authorization') === process.env.ADMIN) {
    next()
  } else {
    res.status(401)
    next('Not Authorised')
  }
}

export {
  requireAuthorisation,
  errorHandler
}
