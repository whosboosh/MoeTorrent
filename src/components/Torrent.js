import React, { Component } from 'react'
import File from '../components/File'
import { Container, Row, Col, Button, Card } from 'react-bootstrap'
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
      openFiles: false,
      Client: this.props.Client
    }
  }

  componentDidMount() {
    this.state.Client.addEventListener('message', (message) => {
      const parsed = JSON.parse(message.data)
      if (parsed.status === 'update') {
        if (parsed.data.infoHash === this.state.infoHash) {
          this.updateTorrent(parsed.data)
        }
      }
    })
  }

  updateTorrent (torrent) {
    let name = torrent.name
    let infoHash = torrent.infoHash
    let path = torrent.path
    let downloaded = torrent.downloaded
    let progress = torrent.progress
    let downloadSpeed = torrent.downloadSpeed
    let timeRemaining = torrent.timeRemaining
    let paused = torrent.paused
    let files = torrent.files
    this.setState({ name, infoHash, path, downloaded, progress, downloadSpeed, timeRemaining, paused, files })
  }

  toggleFiles () {
    let openFiles = !this.state.openFiles
    this.setState({ openFiles })
  }

  removeTorrent() {
    this.state.Client.send(JSON.stringify({ status: 'removeTorrent', data: this.props.torrent }))
  }

  pauseTorrent() {
    this.setState({ paused: true })
    this.state.Client.send(JSON.stringify({ status: 'pauseTorrent', data: this.props.torrent }))
  }

  resumeTorrent() {
    this.setState({ paused: false })
    this.state.Client.send(JSON.stringify({ status: 'resumeTorrent', data: this.props.torrent }))
  }

  render() {
    return (
      <Container className='mt-2'>
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
                  <Col xs={3}><Button variant='warning' onClick={() => this.pauseTorrent()}>Stop</Button></Col>
                  <Col xs={3}><Button variant='success' onClick={() => this.resumeTorrent()}>Start</Button></Col>
                  <Col xs={3}><Button variant='danger' onClick={() => this.removeTorrent()}>Delete</Button></Col>
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
              <Row>
                {this.state.files.map((file, key) =>
                  <File key={key} file={file} />
                )}
              </Row>
            }
          </Card.Body>
        </Card>   
      </Container>
    )
  }
}
export default Torrent