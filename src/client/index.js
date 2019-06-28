import React from 'react'
import { hydrate } from 'react-router-dom'
import Loadable from 'react-loadable'
import { BrowserRouter } from 'react-router-dom'

import App from '../shared/router'

Loadable.preloadReady().then(() => {
  hydrate(
    <BrowserRouter>
      <App data={window.__INITIAL_DATA__} />
    </BrowserRouter>,
    document.getElementById('app')
  )
})
