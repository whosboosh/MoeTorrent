import { Router } from 'express'
import downloads from '../../../downloads.json'

export default () => {
  const router = Router()

  router.get('/', (req, res, next) => {
    res.status(200).json(downloads)
  })

  return router
}