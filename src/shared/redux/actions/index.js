import axios from 'axios'
import fetch from 'node-fetch'

// Types
import {
  FETCH_DOWNLOADS
} from "./types";


// Actions
function requestDownloads() {
  return {
    type: FETCH_DOWNLOADS
  }
}

function receiveDownloads(json) {
  return {
    type: FETCH_DOWNLOADS,
    downloads: json
  }
}

function getDownloads() {
  return dispatch => {
    //dispatch(requestDownloads())
    return axios.get(`http://localhost:3002/api/downloads`)
      .then(response => {
        console.log(response.data)
        dispatch(receiveDownloads(response.data))
      })
  }
}

export function fetchDownloads() {
  return (dispatch) => {
      return dispatch(fetchDownloads())
  }
}