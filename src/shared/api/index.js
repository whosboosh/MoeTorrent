import axios from 'axios'

const fetchDownloads = async () => {
  try {
    const response = await axios.get('https://anifox.moe/api/anime/20')
    return response.data
  } catch (e) {
    console.log(e)
  }
}

export {
  fetchDownloads
}
