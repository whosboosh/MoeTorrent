import { combineReducers } from 'redux'

import {
  FETCH_DOWNLOADS
} from "../actions/types";

const fetchDownloads = (state = {downloads: []}, action) => {
  switch (action.type) {
    case FETCH_DOWNLOADS:{
      return { ...state, ...action.downloads }
    }
    default: return state
  }
}

const rootReducer = combineReducers({
  fetchDownloads
})

export default rootReducer

