import React, { Component } from 'react'
import File from '../components/File'
import { Row, Col, Button, Card } from 'react-bootstrap'
import moment from 'moment'

class Torrent extends Component {
  constructor(props) {
    super(props)
    this.state = {
      name: this.props.torrent.name,
      infoHash: this.props.torrent.infoHash,
      path: this.props.torrent.path,
      downloaded: this.props.torrent.downloaded,
      progress: this.props.torrent.progress,
      downloadSpeed: this.props.torrent.downloadSpeed,
      timeRemaining: this.props.torrent.timeRemaining,
      paused: this.props.torrent.paused,
      files: this.props.torrent.files,
      openFiles: false
    }
  }

  toggleFiles() {
    let openFiles = !this.state.openFiles
    this.setState({ openFiles })
  }

  render() {
    return (
      <Card bg='dark' text='white'>
        <Card.Header className='mb-1'>{this.state.name} {typeof this.state.paused !== 'undefined' && this.state.paused ? <p className='text-danger'>Paused</p> : null}</Card.Header>
        <Card.Body className='p-3'>
          <Row>
            <Col xs={8}>
              <Row><Col xs={12}>{this.state.infoHash}</Col></Row>
              <Row><Col xs={12}>{this.state.path}</Col></Row>
              <Row><Col xs={12}><Button onClick={() => this.toggleFiles()}>Files</Button></Col></Row>
            </Col>
            <Col xs={4}>
              <Row>
                <Col xs={3}><Button variant='warning' onClick={() => this.props.pauseTorrent(this.props.torrent)}>Stop</Button></Col>
                <Col xs={3}><Button variant='success' onClick={() => this.props.resumeTorrent(this.props.torrent)}>Start</Button></Col>
                <Col xs={3}><Button variant='danger' onClick={() => this.props.removeTorrent(this.props.torrent)}>Delete</Button></Col>
              </Row>
              <Row>
                <Col xs={12}>{(this.state.downloaded / 1000000).toFixed(1)}MB / {((this.state.downloaded / 1000000) / (this.state.progress)).toFixed(1)}MB</Col>
                <Col xs={12}>{(this.state.progress * 100).toFixed(2)}%</Col>
                <Col xs={12}>{(this.state.downloadSpeed / 100000).toFixed(2)}Mb/s</Col>
              </Row>
              <Row>
                <Col xs={12}>{moment(this.state.timeRemaining).format('hh:mm')}</Col>
              </Row>
            </Col>
          </Row>
          {!this.state.openFiles ? <span></span> :
          <Container>
            <Row>
              {this.state.files.map((file, key) =>
                <File key={key} file={file} />
              )}
            </Row>
          </Container>
          }
        </Card.Body>
      </Card>
    )
  }
}
export default Torrent