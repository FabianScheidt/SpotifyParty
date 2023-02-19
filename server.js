const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

const SpotifyWebApi = require('spotify-web-api-node');
const spotify = new SpotifyWebApi({ clientId, clientSecret });

const wishes = [];
let currentSong = null;

/**
 * Adds a song to the end of the wishlist
 *
 * @param song String
 */
function addWish(song) {
    const wish = getSongInWishlist(song);
    if(!wish) {
        wishes.push({ song: song, votes: 1 });
        console.log("Wish added: " + song);
        return;
    }
    wish.votes++;
    console.log("Song already wished, added vote: " + song);
}


/**
 * Adds a song to the beginning of the wishlist
 *
 * @param song String
 */
function addAdminWish(song) {
    const wish = getSongInWishlist(song);
    if(!wish) {
        wishes.push({ song: song, votes: 100 });
        console.log("Admin-Wish added: " + song);
        return;
    }
    wish.votes += 100;
    console.log("Song already wished, added admin vote: " + song);
}

function getSongInWishlist(song) {
    return wishes.find(w => w.song === song) || null;
}


function deleteWish(song) {
    const index = wishes.findIndex(w => w.song === song);
    if (index > -1) {
        wishes.splice(index, 1);
    }
}

function skip() {
    if(wishes.length > 0) {
        nextSong();
    }
}


/**
 * Plays the next song
 */
function nextSong() {
    if(wishes.length > 0) {
        // Get wish with most votes
        let nextWish;
        for (const wish of wishes) {
            if(!nextWish || wish.votes > nextWish.votes) {
                nextWish = wish;
            }
        }

        // Play Track
        spotify.play({ uris: [ nextWish.song ] });

        // Remove from wishlist
        deleteWish(nextWish.song);

        // Log
        console.log("Started Song: " + nextWish.song);
    } else {
        // No Songs in Wishlist
        console.log("No Songs in Wishlist");
    }

    // Send Wishlist
    io.emit("wishAdded", wishes);
}

/**
 * Polls playback state to notice changes in the current track and trigger playback of a new track.
 */
function pollPlaybackState() {
    let lastUri;
    setInterval(() => {
        if (!spotify.getAccessToken()) {
            return;
        }
        spotify.getMyCurrentPlaybackState().then(res => {
            if (!res || !res.body || !res.body.item) {
                return;
            }

            // Emit the song info when the current song changes
            const uri = res.body.item.uri;
            if (uri !== lastUri) {
                lastUri = uri;
                currentSong = {
                    name: res.body.item.name,
                    artist: res.body.item.artists[0].name,
                    uri: res.body.item.uri
                };
                console.log('New song found', currentSong);
                io.emit('currentSongInfo', currentSong);
            }

            // Play the next song when the last playback is paused
            if (!res.body.is_playing && res.body.progress_ms === 0 && wishes.length > 0) {
                console.log('End of song. Playing next...');
                nextSong();
            }
        }).catch((e) => console.error('Error while polling playback state', e));
    }, 3000);
}

/**
 * Requests an access token fot the client id and secret
 */
function requestAccessToken(callback) {
    spotify.clientCredentialsGrant().then((result) => {
        if (result.body && result.body.access_token) {
            callback(result.body.access_token);
        }
    });
}

// Start polling of the playback state
pollPlaybackState();

// Server
const http = require('http');
const express = require('express');
const app = express();

// Create Server and start listening
const server = http.createServer(app);
server.listen(1337);

// File Server
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client.html');
});
app.use(express.static(__dirname));

// Spotify authorization flow
app.get('/authorize', (req, res) => {
    const redirectUri = req.protocol + '://' + req.get('Host') + '/authorize-success';
    spotify.setRedirectURI(redirectUri);
    const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state'];
    const authorizeURL = spotify.createAuthorizeURL(scopes);
    res.redirect(302, authorizeURL);
});

app.get('/authorize-success', (req, res) => {
    const code = req.query.code;
    if (!code) {
        res.status(400).send('No code provided');
        return;
    }

    console.log('Received access code:', req.query.code);

    spotify.authorizationCodeGrant(code).then((data) => {
        const accessToken = data.body.access_token;
        const refreshToken = data.body.refresh_token;
        if (!accessToken || !refreshToken) {
            res.status(401).send('Access token response is invalid');
            return;
        }
        spotify.setAccessToken(accessToken);
        spotify.setRefreshToken(refreshToken);
        console.log('Received access and refresh token:', accessToken, refreshToken);
        const redirectUri = req.protocol + '://' + req.get('Host') + '/?admin=admin';
        res.redirect(302, redirectUri);
    }, (err) => {
        console.error('Failed to receive access token', err);
        res.status(401).send('Failed to receive access token');
    });
});

app.get('/deauthorize', (req, res) => {
    spotify.setAccessToken(undefined);
    spotify.setRefreshToken(undefined);
    const redirectUri = req.protocol + '://' + req.get('Host') + '/?admin=admin';
    res.redirect(302, redirectUri);
});


// Start Socket-Server
const { Server } = require("socket.io");
const io = new Server(server);
io.on('connection', (socket) => {
    console.log("Connection!");
    socket.emit('currentSongInfo', currentSong);

    socket.on('token', () => {
        requestAccessToken((token) => {
            socket.emit('token', token);
            socket.emit("wishAdded", wishes);
        });
    });

    socket.on('addWish', (wish) => {
        addWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('addAdminWish', (wish) => {
        addAdminWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('deleteWish', (wish) => {
        deleteWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('play', () => {
        spotify.play();
    });

    socket.on('pause', () => {
        spotify.pause();
    });

    socket.on('skip', () => {
        skip();
    })
});
