import { Router } from 'express'
import { version } from '../../package.json'
import downloads from './routes'

export default () => {
  let api = Router()

  // Api paths
  api.use('/downloads', downloads())

  // Root level path
  api.get('/', (req, res) => {
    res.status(200).json({ version })
  })

  return api
}
