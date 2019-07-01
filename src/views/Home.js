import React, { Component } from 'react'
import { Container, Row, Col, Button, Card, Form, Alert } from 'react-bootstrap'
import moment from 'moment'

const client = new WebSocket('ws://localhost:3000/api')

class Home extends Component {
  constructor (props) {
    super(props)
    this.state = {
      torrents: [],
      value: '',
      location: '',
      title: '',
      error: '',
      showError: false,
      showSuccess: false,
      message: ''
    }
    this.handleChangeLocation = this.handleChangeLocation.bind(this)
    this.handleChangeValue = this.handleChangeValue.bind(this)
    this.handleChangeTitle = this.handleChangeTitle.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentDidMount () {
    client.onopen = () => {
      console.log('Connected to Torrent Server')
    }

    client.onmessage = (message) => {
      const parsed = JSON.parse(message.data)
      if (parsed.status === 'update') {
        const torrents = this.state.torrents

        const index = torrents.map(e => { return e.infoHash }).indexOf(parsed.data.infoHash) // Find torrent from state

        if (index !== -1) {
          torrents[index] = parsed.data // Update this torrent
        } else {
          torrents.push(parsed.data)
        }

        if (parsed.data.timeRemaining === 0) {
          torrents.splice(index, 1)
        }

        this.setState({ torrents })
      } else if (parsed.status === 'delete') {
        const torrents = this.state.torrents
        const index = torrents.map(e => { return e.infoHash }).indexOf(parsed.data.infoHash)

        const message = `${parsed.data.name}(${parsed.data.infoHash}) Deleted`

        torrents.splice(index, 1)
        this.setState({ torrents, showSuccess: true, message })
      } else if (parsed.status === 'complete') {
        const torrents = this.state.torrents
        const index = torrents.map(e => { return e.infoHash }).indexOf(parsed.data.infoHash)

        const message = `${parsed.data.name}(${parsed.data.infoHash}) Finished downloading`

        torrents.splice(index, 1)
        this.setState({ torrents, showSuccess: true, message })        
      } else if (parsed.status === 'collection') {
        this.setState({ torrents: parsed.data })
      } else if (parsed.status === 'error') {
        this.setState({ error: parsed.err, showError: true })
      }
    }

    client.onerror = (err) => {
      this.setState({ error: parsed.err, showError: true })
    }
  }

  addTorrent (torrent) {
    const location = torrent.location
    const data = torrent.data
    const title = torrent.title
    client.send(JSON.stringify({ status: 'addTorrent', data, location, title }))
  }

  removeTorrent (torrent) {
    client.send(JSON.stringify({ status: 'removeTorrent', data: torrent }))
  }

  pauseTorrent (torrent) {
    client.send(JSON.stringify({ status: 'pauseTorrent', data: torrent }))
  }

  resumeTorrent (torrent) {
    client.send(JSON.stringify({ status: 'resumeTorrent', data: torrent }))
  }

  handleChangeValue (event) {
    this.setState({ value: event.target.value })
  }

  handleChangeLocation (event) {
    this.setState({ location: event.target.value })
  }

  handleChangeTitle (event) {
    this.setState({ title: event.target.value })
  }

  handleSubmit (event) {
    event.preventDefault()
    this.addTorrent({ location: this.state.location, title: this.state.title, data: this.state.value })
  }

  handleDismissError () {
    this.setState({ showError: false })
  }

  handleDismissSuccess () {
    this.setState({ showSuccess: false })
  }

  render () {
    const torrentItems = this.state.torrents.map((item, key) =>
      <Container className='mt-2' key={key}>
        <Card bg='dark' text='white'>
          <Card.Header className='mb-1'>{item.name}</Card.Header>
          <Card.Body className='p-3'>
            <Row>
              <Col xs={8}>
                <Row><Col xs={12}>{item.infoHash}</Col></Row>
                <Row><Col xs={12}>{item.path}</Col></Row>
              </Col>
              <Col xs={4}>
                <Row>
                  <Col xs={3}><Button variant='warning' onClick={() => this.pauseTorrent(item)}>Stop</Button></Col>
                  <Col xs={3}><Button variant='success' onClick={() => this.resumeTorrent(item)}>Start</Button></Col>
                  <Col xs={3}><Button variant='danger' onClick={() => this.removeTorrent(item)}>Delete</Button></Col>
                </Row>
                <Row>
                  <Col xs={12}>{(item.downloaded / 1000000).toFixed(1)}MB / {((((item.downloaded / (item.progress * 100)) * 100) + item.downloaded) / 1000000).toFixed(1)}MB</Col>
                  <Col xs={12}>{(item.progress * 100).toFixed(2)}%</Col>
                  <Col xs={12}>{(item.downloadSpeed / 100000).toFixed(2)}Mb/s</Col>
                </Row>
                <Row>
                  <Col xs={12}>{moment(item.timeRemaining).format('hh:mm')}</Col>
                </Row>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    )
    return (
      <div>
        {this.state.showSuccess ? <SuccessAlert message={this.state.message} handler={() => this.handleDismissSuccess()} /> : null}
        {this.state.showError ? <ErrorAlert error={this.state.error} handler={() => this.handleDismissError()} /> : null}
        <h1>Torrents:</h1>
        <Form onSubmit={this.handleSubmit} className='mb-3'>
          <Container>
            <Card bg='light'>
              <Card.Body>
                <Row className='mb-3'>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Torrent URI:</Form.Label>
                      <Form.Control
                        placeholder='URI (magnet | .torrent | infoHash)'
                        aria-label='torrent'
                        aria-describedby='basic-addon1'
                        value={this.state.value} onChange={this.handleChangeValue}
                      />
                      <Form.Text className='text-muted'>
                      Can be a .torrent reference, magnet URI or info-hash.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className='mb-3'>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Download Location:</Form.Label>
                      <Form.Control
                        placeholder='File Location'
                        aria-label='location'
                        aria-describedby='basic-addon1'
                        value={this.state.location} onChange={this.handleChangeLocation}
                      />
                      <Form.Text className='text-muted'>
                        Download Location of the torrent
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className='mb-3'>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Title:</Form.Label>
                      <Form.Control
                        placeholder='Title'
                        aria-label='location'
                        aria-describedby='basic-addon1'
                        value={this.state.title} onChange={this.handleChangeTitle}
                      />
                      <Form.Text className='text-muted'>
                        Title of the name of show (anime)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col xs={12}>
                    <Button type='submit' variant='dark'>Add Torrent</Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Container>
        </Form>
        {torrentItems}
      </div>
    )
  }
}

class ErrorAlert extends Component {
  render () {
    const handleDismiss = () => this.props.handler()
    return (
      <Alert className='mt-2' display='none' variant='danger' onClose={handleDismiss} dismissible>
        <Alert.Heading>Oh snap! You got an error!</Alert.Heading>
        <p>
          {this.props.error}
        </p>
      </Alert>
    )
  }
}

class SuccessAlert extends Component {
  render () {
    const handleDismiss = () => this.props.handler()
    return (
      <Alert className='mt-2' display='none' variant='success' onClose={handleDismiss} dismissible>
        <Alert.Heading>Success</Alert.Heading>
        <p>
          {this.props.message}
        </p>
      </Alert>
    )
  }
}

export default Home
