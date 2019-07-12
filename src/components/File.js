import React, { Component } from 'react'
import { Row, Col, Button, Card } from 'react-bootstrap'

class File extends Component {
  constructor(props) {
    super(props)
    this.state = {
      name: this.props.file.name,
      path: this.props.file.path,
      length: this.props.file.length,
      downloaded: this.props.file.downloaded,
      progress: this.props.file.progress,
    }
  }
  render() {
    return (
      <Row className='m-2'>
        <Col xs={12}>{this.state.name}</Col>
      </Row>
    )
  }
}

export default File