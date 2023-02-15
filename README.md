# SpotifyParty

This project allows guests at a party to wish Spotify-songs using a web-interface. The songs are then played one after
another.

## Installation
Download and install [NodeJS](https://nodejs.org/). Download the dependencies by running the following command:

  ```bash
  npm install
  ```

Create an applicatication on the [Spotify Website](https://developer.spotify.com/my-applications/). Set the
environment variables `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` or edit `server.js`.

## Usage

Open the Spotify-application on your computer and start the server by running the following command:

  ```bash
  node server.js
  ```
  
You can now wish songs by opening your web-browser at <http://localhost:1337/>.

There is also a super-secret admin-interface at <http://localhost:1337/?admin=admin>. Songs added from the
admin-interface will be added at the beginning of the wish-list. You can also play, pause and skip tracks.
