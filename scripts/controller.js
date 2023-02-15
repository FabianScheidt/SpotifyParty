app.controller('controller', function ($scope, ws, $http) {
    $scope.currentSong  = {};
    $scope.wishes       = [];
    $scope.wishMap      = {};
    $scope.searchQuery  = "";
    $scope.results      = [];
    $scope.admin        = location.search.split('admin=')[1] === 'admin';
    $scope.accessToken  = "";

    /**
     * Performs a search for Spotify-Songs and saves the results in $scope.results
     *
     * @param query
     */
    $scope.search = function(query) {
        query = query.replace(" ", "+");
        var url = "https://api.spotify.com/v1/search?q=" + query + "&type=track&market=DE";
        var options = {
            headers: { "Authorization": "Bearer " + $scope.accessToken }
        }
        $http.get(url, options)
        .then(function(res) {
            if(!res.data) return;
            $scope.results = res.data.tracks.items;
        });
    };

    /**
     * Gets song metadata and saves it to $scope.wishMap
     *
     * @param song
     */
    $scope.mapSongInfo = function(song) {
        song = song.song.replace("spotify:track:", "");
        var url = "https://api.spotify.com/v1/tracks/" + song + "?market=DE";
        var options = {
            headers: { "Authorization": "Bearer " + $scope.accessToken }
        }
        $http.get(url, options)
        .then(function(res) {
            if(!res.data) return;
            $scope.wishMap["spotify:track:" + song] = res.data;
        });
    };

    /**
     * Returns the song info for the provided song
     *
     * @param song
     * @returns {*}
     */
    $scope.getSongInfo = function (song) {
        return $scope.wishMap[song];
    };

    /**
     * Adds a wish
     *
     * @param wish
     */
    $scope.wish = function (wish) {
        // Check history
        if (localStorage && !$scope.admin) {
            var history;
            history = localStorage.getItem('wish_history');
            history = history ? JSON.parse(history) : [];
            console.log(history);
            for (const i in history) {
                if (!history.hasOwnProperty(i)) continue;
                if (history[i].song === wish && history[i].date < (new Date()) + 1000*60*60) {
                    alert("Diesen Song hast du dir bereits gewünscht...");
                    return;
                }
            }
        }

        if($scope.admin) {
            ws.emit('addAdminWish', wish);
        } else {
            ws.emit('addWish', wish);
        }
        alert("Alles Klar! Dein Wunsch ist angekommen!");
        $scope.searchQuery = "";

        // Add wish to history
        if (localStorage) {
            var history;
            history = localStorage.getItem('wish_history');
            history = history ? JSON.parse(history) : [];
            history.push({ date: new Date(), song: wish });
            history = JSON.stringify(history);
            localStorage.setItem('wish_history', history);
        }
    };

    /**
     * Deletes a wish
     *
     * @param wish
     */
    $scope.deleteWish = function (wish) {
        ws.emit('deleteWish', wish);
    };


    /**
     * Play, pause and skip action
     */
    $scope.play  = function() { ws.emit('play');  };
    $scope.pause = function() { ws.emit('pause'); };
    $scope.skip  = function() { ws.emit('skip');  };

    /**
     * Redirect to authorize/deauthorize page
     */
    $scope.authorize = function() { location.href = '/authorize'; };
    $scope.deauthorize = function() { location.href = '/deauthorize'; };

    /**
     * Perform search on query-changes
     */
    $scope.$watch('searchQuery', function () {
        if($scope.searchQuery === "") {
            $scope.results = [];
        } else {
            $scope.search($scope.searchQuery);
        }
    });

    /**
     * Fetch an API-token
     */
    ws.emit('token');
    ws.on('token', function(token) {
        $scope.accessToken = token;
    })


    /**
     * Update Current Song
     */
    ws.on('currentSongInfo', function (currentSong) {
        $scope.currentSong = currentSong;
    });

    /**
     * Update current Wishlist
     */
    ws.on('wishAdded', function(wishes) {
        $scope.wishes = wishes;

        for(var i in wishes) {
            if(!wishes.hasOwnProperty(i)) continue;
            $scope.mapSongInfo(wishes[i]);
        }
        setTimeout(function () {
            console.log($scope.wishes, $scope.wishMap);
        }, 500)
    });
});
