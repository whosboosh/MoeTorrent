import axios from 'axios'

const fetchDownloads = async () => {
  try {
    const response = await axios.get('http://localhost:3002/api/downloads')
    return response.data
  } catch (e) {
    console.log(e)
  }
}

export {
  fetchDownloads
}
