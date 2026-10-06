import requests

URL = "https://www.vulture.com/static/leaderboard/production/cmuec30my000h3b7egrtm2p6h.json"

headers = {
    "Accept": "*/*",
    "Referer": "https://www.vulture.com/movies-league/",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/154.0.0.0 Safari/537.36"
    ),
}

# Users to look up
usernames = [
    "CarlPatel",
    "Dwerker15",
    "azcardinalslover",
]

# Get leaderboard
response = requests.get(URL, headers=headers, timeout=15)
response.raise_for_status()

players = response.json()

# Create case-insensitive lookup table
player_lookup = {
    player["displayName"].casefold(): player
    for player in players
    if player.get("displayName")
}


# Look up each user
for username in usernames:
    user = player_lookup.get(username.casefold())

    print("=" * 60)

    if user:
        print(f"Name:   {user['displayName']}")
        print(f"Rank:   #{user['ranking']}")
        print(f"Score:  {user['score']}")
        print(f"League: {user['leagueName']}")
        print("\nMovies:")

        for movie in user["movies"].split(", "):
            print(f"  - {movie}")
    else:
        print(f"Could not find {username}.")

print("=" * 60)