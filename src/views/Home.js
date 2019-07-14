import React, { Component } from 'react'
import { Container, Row, Col, Button, Card, Form, Alert } from 'react-bootstrap'
import moment from 'moment'
import { RingLoader } from 'react-spinners';
import { css } from '@emotion/core';

import Torrent from '../components/Torrent'

const override = css`
    display: block;
    margin: 0 auto;
    border-color: white;
    color: white;
`;

class Home extends Component {
  constructor (props) {
    super(props)
    this.state = {
      torrents: [],
      completed: [],
      value: '',
      location: '',
      title: '',
      error: '',
      showError: false,
      showSuccess: false,
      showStart: false,
      message: '',
      startMessage: '',
      loading: false,
      display: 'downloading',
      Client: this.connect(),
      dead: true
    }
    this.handleChangeLocation = this.handleChangeLocation.bind(this)
    this.handleChangeValue = this.handleChangeValue.bind(this)
    this.handleChangeTitle = this.handleChangeTitle.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentDidMount () {
    this.state.Client.onopen = () => {
      console.log('Connected to Torrent Server')
      this.state.Client.send(JSON.stringify({ status: 'getDead', data: '' }))
    }

    this.state.Client.addEventListener('message', (message) => {
      const parsed = JSON.parse(message.data)
      if (parsed.status === 'start') { // on start
        console.log('STARTED')
        const torrents = this.state.torrents
        torrents.push(parsed.data)

        const startMessage = `${parsed.data.name} has started downloading`

        this.setState({ torrents, loading: false, showStart: true, startMessage })        
      } else if (parsed.status === 'delete') { // on delete
        const torrents = this.state.torrents
        const index = torrents.map(e => { return e.infoHash }).indexOf(parsed.data.infoHash)

        const message = `${parsed.data.name}(${parsed.data.infoHash}) Deleted`

        torrents.splice(index, 1)
        this.setState({ torrents, showSuccess: true, message, loading: false })
      } else if (parsed.status === 'complete') { // on complete
        const torrents = this.state.torrents
        const index = torrents.map(e => { return e.infoHash }).indexOf(parsed.data.infoHash)

        const message = `${parsed.data.name}(${parsed.data.infoHash}) Finished downloading`

        const completed = this.state.completed
        torrents[index].downloadSpeed = 0
        completed.push(torrents[index])

        torrents.splice(index, 1)
        this.setState({ torrents, showSuccess: true, message, completed }) 
      } else if (parsed.status === 'collection') { // on collection
        this.setState({ torrents: parsed.data })
      } else if (parsed.status === 'dead') { //on toggle timeout switch
        console.log('Setting state of dead to'+ parsed.data)
        this.setState({ dead: parsed.data })
      } else if (parsed.status === 'timeout') { // on recieving timeout
        const torrents = this.state.torrents
        const index = torrents.map(e => { return e.infoHash }).indexOf(parsed.data.infoHash)
        if (index !== -1) {
          torrents.splice(index, 1)
        }
        this.setState({ torrents, loading: false, showError: true, error: parsed.data.infoHash + ' Was deleted due to inactivity' })
      } else if (parsed.status === 'error') { //on Error
        this.setState({ error: parsed.err, showError: true, loading: false })
      }
    })

    this.state.Client.onerror = (err) => {
      this.setState({ error: err, showError: true })
    }
  }

  addTorrent (torrent) {
    const location = torrent.location
    const data = torrent.data
    const title = torrent.title
    this.state.Client.send(JSON.stringify({ status: 'addTorrent', data, location, title }))
  }

  // DELETE ////////
  removeTorrent (torrent) {
    this.state.Client.send(JSON.stringify({ status: 'removeTorrent', data: torrent }))
  }
  ////////

  connect () {
    let client
    if (location.protocol === 'https:') {
      client = new WebSocket(`wss://${window.location.href.replace(/https?:\/\//i, "")}api`)
    } else {
      client = new WebSocket(`ws://${window.location.href.replace(/https?:\/\//i, "")}api`)
    }
    return client
  }

  reconnect () {
    console.log('Reconnecting')
    this.state.Client.close()
    this.setState({ Client: this.connect(), loading: false })
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
    this.setState({ loading: true })
  }

  handleDismissError () {
    this.setState({ showError: false })
  }

  handleDismissSuccess () {
    this.setState({ showSuccess: false })
  }

  handleDismissStart () {
    this.setState({ showStart: false })
  }

  toggeDead () {
    this.state.Client.send(JSON.stringify({ status: 'dead', data: '' }))
  }

  changeDisplay (display) {
    this.setState({ display })
  }

  render () {
    const torrentItems = this.state.torrents.map((item, key) =>
      <Torrent key={key} Client={this.state.Client} torrent={item} />
    )
    const completedItems = this.state.completed.map((item, key) =>
      <Container className='mt-2' key={key}>
        <Card bg='dark' text='white'>
          <Card.Header className='mb-1'>{item.name} {typeof item.paused !== 'undefined' && item.paused ? <p className='text-danger'>Paused</p> : null}</Card.Header>
          <Card.Body className='p-3'>
            <Row>
              <Col xs={8}>
                <Row><Col xs={12}>{item.infoHash}</Col></Row>
                <Row><Col xs={12}>{item.path}</Col></Row>
              </Col>
              <Col xs={4}>
                <Row>
                  <Col xs={3}><Button variant='danger' onClick={() => this.removeTorrent(item)}>Delete</Button></Col>
                </Row>
                <Row>
                  <Col xs={12}>{(item.downloaded / 1000000).toFixed(1)}MB / {((item.downloaded / 1000000) / (item.progress)).toFixed(1)}MB</Col>
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
        {this.state.showStart ? <StartAlert message={this.state.startMessage} handler={() => this.handleDismissStart()} /> : null}
        {this.state.showSuccess ? <SuccessAlert message={this.state.message} handler={() => this.handleDismissSuccess()} /> : null}
        {this.state.showError ? <ErrorAlert error={this.state.error} handler={() => this.handleDismissError()} /> : null}
        <Container>
          <Row>
            <Col xs={8} >
              <h1>Torrents:</h1>
            </Col>
            <Col xs={2} >
              <Button className='mt-2' onClick={() => this.reconnect()}>Reconnect</Button>
            </Col>
            <Col>
              {this.state.dead ? <Button onClick={() => this.toggeDead()} variant='dark' className='mt-2'>Kill Inactive</Button> : <Button onClick={() => this.toggeDead()} variant='outline-dark' className='mt-2'>Kill inactive</Button>}
            </Col>
          </Row>
        </Container>
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
                    <Button type='submit' variant='dark'>{this.state.loading ? 
                      <RingLoader
                        sizeUnit={"px"}
                        css={override}
                        size={30}
                        color={'#FFFFFF'}
                        loading={this.state.loading}
                      /> : <p style={{height:'10px'}}>Add Torrent</p>}</Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Container>
        </Form>
        <Container>
          {this.state.display === 'downloading' ? <Button onClick={() => this.changeDisplay('downloading')} className='mr-2' variant='dark'>Downloading</Button> : <Button onClick={() => this.changeDisplay('downloading')} className='mr-2' variant='outline-dark' >Downloading</Button>}
          {this.state.display === 'completed' ? <Button onClick={() => this.changeDisplay('completed')} className='mr-2' variant='dark'>Completed</Button> : <Button onClick={() => this.changeDisplay('completed')} className='mr-2' variant='outline-dark' >Completed</Button>}
        </Container>
        {this.state.display === 'downloading' ? torrentItems : completedItems}
      </div>
    )
  }
}

class ErrorAlert extends Component {
  render () {
    const handleDismiss = () => this.props.handler()
    return (
      <Alert className='mt-2' display='none' variant='danger' onClose={handleDismiss} dismissible>
        <Alert.Heading>Error!</Alert.Heading>
        <p>
          {this.props.error}
        </p>
      </Alert>
    )
  }
}

class StartAlert extends Component {
  render () {
    const handleDismiss = () => this.props.handler()
    return (
      <Alert className='mt-2' display='none' variant='info' onClose={handleDismiss} dismissible>
        <Alert.Heading>Torrent Started</Alert.Heading>
        <p>
          {this.props.message }
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
