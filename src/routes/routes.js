import React, { Component } from 'react'
import Loadable from 'react-loadable' // Disable for hot-loading


const Home = Loadable({
  loader: () => import('../views/Home'),
  loading() {
    return <div>Loading...</div>
  },
  delay: 300,
})

//import Home from '../views/Home'

export default [
  {
    component: Home,
    path: '/',
    exact: true,
  }
]