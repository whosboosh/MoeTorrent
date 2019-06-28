import React, { Component } from 'react'
import Loadable from 'react-loadable' // Disable for hot-loading

import Home from '../views/Home'

// Initial loading API
import { fetchDownloads } from '../api'

export default [
  {
    component: Home,
    path: '/',
    exact: true,
    fetchInitialData: (path = '') => fetchDownloads()
  }
]
