import { createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'
import logger from 'redux-logger'

import rootReducer from '../reducers'

const middleware = applyMiddleware(thunk, logger)

const store = createStore(
  rootReducer,
  compose(middleware)
)

export default store
