import React from 'react'
import { hydrate } from 'react-dom'
import Loadable from 'react-loadable'
import { BrowserRouter } from 'react-router-dom'
import App from '../shared/router'

import { Provider } from 'react-redux';
import configureStore from '../shared/redux/store'

// Grab the state from a global variable injected into the server-generated HTML
const preloadedState = window.__INITIAL_STATE__

// Allow the passed state to be garbage-collected
delete window.__INITIAL_STATE__

// Create Redux store with initial state
const store = configureStore(preloadedState)

Loadable.preloadReady().then(() => {
  hydrate(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>,
  document.getElementById('app')    
  )
})