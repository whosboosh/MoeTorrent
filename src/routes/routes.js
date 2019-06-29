import React, { Component } from 'react'
import Loadable from 'react-loadable' // Disable for hot-loading

//import Home from '../views/Home'

const Home = Loadable({
  loader: () => import('../views/Home'),
  loading() {
    return <div>Loading...</div>
  },
  delay: 300,
});

// Initial loading API
//import { fetchDownloads } from '../api'

export default [
  {
    component: Home,
    path: '/',
    exact: true,
  }
]
