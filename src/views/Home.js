import React, { Component } from 'react'

class Home extends Component {
  render () {
    const { data } = this.props

    return (
      <div>
        <h1>His</h1>
        <p>{data}</p>
      </div>
    )
  }
}

export default Home
