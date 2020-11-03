window.Helpers = {
  authorize: function() {
    var client_id = this.getQueryParam('app_client_id');

    // Use Exportify application client_id if none given
    if (client_id == '') {
      client_id = "3e5b5b82a02a4c1da8bb623f9afd713d"
    }

    window.location = "https://accounts.spotify.com/authorize" +
    "?client_id=" + client_id +
    "&redirect_uri=" + encodeURIComponent([location.protocol, '//', location.host, location.pathname].join('')) +
    "&scope=playlist-read-private%20playlist-read-collaborative" +
    "&response_type=token";
  },

  // http://stackoverflow.com/a/901144/4167042
  getQueryParam: function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  },

  apiCall: function(url, access_token) {
    return $.ajax({
      url: url,
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
    }).fail(function (jqXHR, textStatus) {
      if (jqXHR.status == 401) {
        // Return to home page after auth token expiry
        window.location = window.location.href.split('#')[0]
      } else if (jqXHR.status == 429) {
        // API Rate-limiting encountered
        window.location = window.location.href.split('#')[0] + '?rate_limit_message=true'
      } else {
        // Otherwise report the error so user can raise an issue
        alert(jqXHR.responseText);
      }
    })
  }
}

var PlaylistTable = React.createClass({
  getInitialState: function() {
    return {
      playlists: [],
      playlistCount: 0,
      nextURL: null,
      prevURL: null
    };
  },

  loadPlaylists: function(url) {
    var userId = '';

    window.Helpers.apiCall("https://api.spotify.com/v1/me", this.props.access_token).then(function(response) {
      userId = response.id;

      return window.Helpers.apiCall(
        typeof url !== 'undefined' ? url : "https://api.spotify.com/v1/users/" + userId + "/playlists",
        this.props.access_token
      )
    }.bind(this)).done(function(response) {
      if (this.isMounted()) {
        this.setState({
          playlists: response.items,
          playlistCount: response.total,
          nextURL: response.next,
          prevURL: response.previous
        });

        $('#playlists').fadeIn();
        $('#subtitle').text((response.offset + 1) + '-' + (response.offset + response.items.length) + ' of ' + response.total + ' playlists for ' + userId)
      }
    }.bind(this))
  },


  componentDidMount: function() {
    this.loadPlaylists(this.props.url);
  },

  render: function() {
    if (this.state.playlists.length > 0) {
      return (
        <div id="playlists">
          <Paginator nextURL={this.state.nextURL} prevURL={this.state.prevURL} loadPlaylists={this.loadPlaylists}/>
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{width: "30px"}}></th>
                <th>Name</th>
                <th style={{width: "150px"}}>Owner</th>
                <th style={{width: "100px"}}>Tracks</th>
                <th style={{width: "120px"}}>Public?</th>
                <th style={{width: "120px"}}>Collaborative?</th>
                <th style={{width: "100px"}} className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {this.state.playlists.map(function(playlist, i) {
                return <PlaylistRow playlist={playlist} key={playlist.id} access_token={this.props.access_token}/>;
              }.bind(this))}
            </tbody>
          </table>
          <Paginator nextURL={this.state.nextURL} prevURL={this.state.prevURL} loadPlaylists={this.loadPlaylists}/>
        </div>
      );
    } else {
      return <div className="spinner"></div>
    }
  }
});

var PlaylistRow = React.createClass({
  exportPlaylist: function() {
    PlaylistExporter.export(this.props.access_token, this.props.playlist);
  },

  renderTickCross: function(condition) {
    if (condition) {
      return <i className="fa fa-lg fa-check-circle-o"></i>
    } else {
      return <i className="fa fa-lg fa-times-circle-o" style={{ color: '#ECEBE8' }}></i>
    }
  },

  render: function() {
    playlist = this.props.playlist
    if(playlist.uri==null) return (
      <tr key={this.props.key}>
        <td>{this.renderIcon(playlist)}</td>
        <td>{playlist.name}</td>
        <td colSpan="2">This playlist is not supported</td>
        <td>{this.renderTickCross(playlist.public)}</td>
        <td>{this.renderTickCross(playlist.collaborative)}</td>
        <td>&nbsp;</td>
      </tr>
    );
    return (
      <tr key={this.props.key}>
        <td><i className="fa fa-music"></i></td>
        <td><a href={playlist.uri}>{playlist.name}</a></td>
        <td><a href={playlist.owner.uri}>{playlist.owner.display_name}</a></td>
        <td>{playlist.tracks.total}</td>
        <td>{this.renderTickCross(playlist.public)}</td>
        <td>{this.renderTickCross(playlist.collaborative)}</td>
        <td className="text-right"><button className="btn btn-default btn-xs btn-success" type="submit" onClick={this.exportPlaylist}><span className="glyphicon glyphicon-save"></span> Export</button></td>
      </tr>
    );
  }
});

var Paginator = React.createClass({
  nextClick: function(e) {
    e.preventDefault()

    if (this.props.nextURL != null) {
      this.props.loadPlaylists(this.props.nextURL)
    }
  },

  prevClick: function(e) {
    e.preventDefault()

    if (this.props.prevURL != null) {
      this.props.loadPlaylists(this.props.prevURL)
    }
  },

  render: function() {
    if (this.props.nextURL != null || this.props.prevURL != null) {
      return (
        <nav className="paginator text-right">
          <ul className="pagination pagination-sm">
            <li className={this.props.prevURL == null ? 'disabled' : ''}>
              <a href="#" aria-label="Previous" onClick={this.prevClick}>
                <span aria-hidden="true">&laquo;</span>
              </a>
            </li>
            <li className={this.props.nextURL == null ? 'disabled' : ''}>
              <a href="#" aria-label="Next" onClick={this.nextClick}>
                <span aria-hidden="true">&raquo;</span>
              </a>
            </li>
          </ul>
        </nav>
      )
    } else {
      return <div>&nbsp;</div>
    }
  }
});



// Handles exporting a single playlist as a CSV file
var PlaylistExporter = {
  export: function(access_token, playlist) {
    this.csvData(access_token, playlist).then(function(data) {
      var blob = new Blob([ data ], { type: "text/csv;charset=utf-8" });
      saveAs(blob, this.fileName(playlist), true);
    }.bind(this))
  },

  csvData: function(access_token, playlist) {
    var requests = [];
    var limit = 100;

    for (var offset = 0; offset < playlist.tracks.total; offset = offset + limit) {
      requests.push(
        window.Helpers.apiCall(playlist.tracks.href + '?offset=' + offset + '&limit=' + limit, access_token)
      )
    }


    return $.when.apply($, requests).then(function() {
      var responses = [];

      // Handle either single or multiple responses
      if (typeof arguments[0] != 'undefined') {
        if (typeof arguments[0].href == 'undefined') {
          responses = Array.prototype.slice.call(arguments).map(function(a) { return a[0] });
        } else {
          responses = [arguments[0]];
        }
      }
      const playlistTracks = responses[0].items.map((a) => a.track);
      var albumRequests = [];
      console.log('playlistTracks', playlistTracks);
      for (var i = 0; i < playlistTracks.length; i += 1) {
        var item = playlistTracks[i];
        albumRequests.push(
          window.Helpers.apiCall(item.album.href, access_token)
        )
      }


      return $.when.apply($, albumRequests).then(function() {
        var albumArray = [];
        if (typeof arguments[0] != 'undefined') {
          if (typeof arguments[0].href == 'undefined') {
            albumArray = Array.prototype.slice.call(arguments).map(function(a) { return a[0] });
          } else {
            albumArray = [arguments[0]];
          }
        }
        const albums = {};
        albumArray.forEach((album) => {
          albums[album.id] = album;
        })
        var tracks = responses.map(function(response) {
          return response.items.map(function(item) {
            const album = albums[item.track.album.id];
            return [
              item.track.external_ids.isrc,
              item.track.external_urls.spotify,
              item.track.name,
              item.track.artists.map(function (artist) { return String(artist.name).replace(/,/g, "\\,"); }).join(', '),
              album.name,
              album.label,

              album.release_date,
              moment(album.release_date).format("LLLL"),

              album.release_date_precision,
              album.type,
            ];
          });
        });

        // Flatten the array of pages
        tracks = $.map(tracks, function(n) { return n })

        tracks.unshift([
          "ISRC",
          "Link",
          "Track Name",
          "Artist Name",
          "Album Name",
          "Label",
          "Release Date",
          "Release Date Formatted",
          "Release Date Precision",
          "Release Type",
        ]);

        csvContent = '';
        tracks.forEach(function(row, index){
          dataString = row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(",");
          csvContent += dataString + "\n";
        });

        return csvContent;
      });
    });
  },

  fileName: function(playlist) {
    return playlist.name.replace(/[\x00-\x1F\x7F/\\<>:;"|=,.?*[\] ]+/g, "_").toLowerCase() + ".csv";
  }
}

$(function() {
  var vars = window.location.hash.substring(1).split('&');
  var key = {};
  for (i=0; i<vars.length; i++) {
    var tmp = vars[i].split('=');
    key[tmp[0]] = tmp[1];
  }

  if (window.Helpers.getQueryParam('rate_limit_message') != '') {
    // Show rate limit message
    $('#rateLimitMessage').show();
  } else if (typeof key['access_token'] === 'undefined') {
    $('#loginButton').css('display', 'inline-block')
  } else {
    React.render(<PlaylistTable access_token={key['access_token']} />, playlistsContainer);
  }
});
