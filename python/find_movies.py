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

# Dwerker15
# target_movies = {
#     "Dune: Part Three",
#     "La Bola Negra",
#     "The Further Misadventures of Cliff Booth",
#     "Possible Love",
#     "NAZA",
#     "Tender Loving Care",
#     "You Can See Everything",
#     "Once Upon a Time in Harlem",
# }

# azcardinalslover
# target_movies = {
#     "Dune: Part Three",
#     "La Bola Negra",
#     "Wildwood",
#     "Possible Love",
#     "Jumanji: Open World",
#     "NAZA",
#     "Tender Loving Care",
#     "Once Upon a Time in Harlem",
# }

# CarlPatel
target_movies = {
    "Dune: Part Three",
    "Godzilla Minus Zero",
    "The Hunger Games: Sunrise on the Reaping",
    "Clayface",
    "Jumanji: Open World",
    "The Only Living Pickpocket in New York",
    "Minotaur",
    "You Can See Everything",
}

response = requests.get(URL, headers=headers, timeout=15)
response.raise_for_status()

players = response.json()

matches = []

for player in players:
    movies_string = player.get("movies")

    if not movies_string:
        continue

    player_movies = {
        movie.strip()
        for movie in movies_string.split(",")
    }

    if player_movies == target_movies:
        matches.append(player)

print(f"Found {len(matches)} matching players:\n")

for player in matches:
    print(f"Name:   {player.get('displayName')}")
    print(f"Rank:   #{player.get('ranking')}")
    print(f"Score:  {player.get('score')}")
    print(f"League: {player.get('leagueName')}")
    print()