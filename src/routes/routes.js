import React, { Component } from 'react'
import Loadable from 'react-loadable'

const Home = Loadable({
  loader: () => import('../views/Home'),
  loading() {
    return <div>Loading...</div>
  },
  delay: 300,
})

export default [
  {
    component: Home,
    path: '/',
    exact: true,
  }
]
