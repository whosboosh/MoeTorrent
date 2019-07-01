import { hot } from 'react-hot-loader/root'
import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { Container } from 'react-bootstrap'

// Component Imports...
import NoMatch from '../views/NoMatch'

import routes from './routes'

import '../styles/style.scss'

const isProduction = process.env.NODE_ENV === 'production'

class App extends Component {
  render () {
    return (
      <div>
        <Container className='container'>
          <Helmet>
            <link rel='shortcut icon' type='image/x-icon' href='/favicon.ico' />
            <title>MoeTorrent</title>
          </Helmet>
          <Switch>
            {routes.map(({ path, exact, component: C, ...rest }) => (
              <Route
                key={path}
                path={path}
                exact={exact}
                render={(props) => (
                  <C {...props} {...rest} data={this.props.data} />
                )}
              />
            ))}
            <Route render={(props) => <NoMatch {...props} />} />
          </Switch>
        </Container>
      </div>
    )
  }
}

export default !isProduction ? hot(App) : App
