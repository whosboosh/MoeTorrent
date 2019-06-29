import { connect } from 'react-redux'
import React, { Component } from 'react'
import { fetchDownloads } from '../redux/actions'

class Home extends Component {
  constructor() {
    super();
    this.state = { data: [] };
  }
  
  componentDidMount() {
    const { dispatch } = this.props
    dispatch(fetchDownloads())
  }

  render () {
    const { downloads } = this.props
    return (
      <div>
        <h1>Hi</h1>
        <p>asd</p>
      </div>
    )
  }
}

function mapStateToProps(state) {
  const { downloads } = state
  return {
    downloads
  }
}
 

export default connect(mapStateToProps)(Home)