import React, { Component } from 'react'
import axios from 'axios'

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      torrents: []
    }
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.updateTorrents(),
      1000
    )
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }  

  updateTorrents() {
    axios.get('http://localhost:3000/api', { timeout: 1000, })
      .then(res => {
        const torrents = this.state.torrents
        for (const oldTorrent of torrents) {
          const index = res.data.map(e => { return e.infoHash; }).indexOf(oldTorrent.infoHash)
          if (index === -1) {
            axios.post('http://localhost:3000/api/remove', {
              url: oldTorrent.infoHash
            })
            .catch(e => console.log(e))
          }
        }
        this.setState({ torrents: res.data })
      })    
      .catch(e => clearInterval(this.timerID))
  }

  render () {
    const { torrents } = this.state
    const torrentItems = torrents.map((item, key) =>
      <ul key={key}>
        <li>{item.name}</li>
        <li>{item.infoHash}</li>
        <li>{item.downloaded}</li>
        <li>{item.downloadSpeed}</li>
        <li>{item.numPeers}</li>
        <li>{item.path}</li>
        <li>{item.progress}</li>
        <li>{item.timeRemaining}</li>      
      </ul>
    )
    return (
      <div>
        <h1>Torrents:</h1>
        <ul>
        {torrentItems}
        </ul>
      </div>
    )
  }
}

export default Home
