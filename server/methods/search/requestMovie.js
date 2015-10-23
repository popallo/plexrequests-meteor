Meteor.methods({
	"requestMovie": function(request) {
		check(request, Object);
		var poster = request.poster_path || "/";

		// Check user request limit
		var date = Date.now() - 6.048e8;
		var weeklyLimit = Settings.find({}).fetch()[0].weeklyLimit;
		var userRequestTotal = Movies.find({user:request.user, createdAt: {"$gte": date} }).fetch().length;

		if (weeklyLimit !== 0 && (userRequestTotal >= weeklyLimit) && !(Meteor.user()) ) {
			return "limit";
		}

		// Movie Request only requires IMDB_ID
		//Get IMDB ID
		try {
			var imdb = TMDBSearch.externalIds(request.id, "movie");
		} catch (error) {
			console.log("Error getting IMDB ID:", error.message);
			return false;
		}

		// Check if it already exists in CouchPotato
		try {
			if (CouchPotato.mediaGet(imdb)) {
				try {
					Movies.insert({
						title: request.title,
						id: request.id,
						imdb: imdb,
						released: request.released,
						user: request.user,
						downloaded: false,
						approved: true,
						poster_path: poster
					});
					return 'exists';
				} catch (error) {
					console.log(error.message);
					return false;
				}
			}
		} catch (error) {
			console.log("Error adding to Couch Potato:", error.message)
			return false;
		}

		if (Settings.find({}).fetch()[0].approval) {
			// Approval required
			// Add to DB but not CP
			try {
				Movies.insert({
					title: request.title,
					id: request.id,
					imdb: imdb,
					released: request.released,
					user: request.user,
					downloaded: false,
					approved: false,
					poster_path: poster
				});
			} catch (error) {
				console.log(error.message);
				return false;
			}

			return true;
		} else {
			// No approval required

			if (Settings.find({}).fetch()[0].couchPotatoENABLED) {
				try {
					var add = CouchPotato.movieAdd(imdb);
				} catch (error) {
					console.log("Error adding to Couch Potato:", error.message)
					return false;
				}

				if (add) {
					try {
						Movies.insert({
							title: request.title,
							id: request.id,
							imdb: imdb,
							released: request.released,
							user: request.user,
							downloaded: false,
							approved: true,
							poster_path: poster
						});
					} catch (error) {
						console.log(error.message);
						return false;
					}

					return true;
				} else {
					return false;
				}
			} else {
				try {
					Movies.insert({
						title: request.title,
						id: request.id,
						imdb: imdb,
						released: request.released,
						user: request.user,
						downloaded: false,
						approved: true,
						poster_path: poster
					});
				} catch (error) {
					console.log(error.message);
					return false;
				}
			}
		}
	}
});
