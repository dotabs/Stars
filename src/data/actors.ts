export interface Actor {
  id: string;
  name: string;
  birthYear: number;
  nationality: string;
  bio: string;
  image: string;
  knownFor: string[];
  awards: string[];
  movieIds: string[];
}

export const actors: Actor[] = [
  {
    id: "timothee-chalamet",
    name: "Timothée Chalamet",
    birthYear: 1995,
    nationality: "American",
    bio: "Timothée Chalamet is an American actor who rose to prominence with his role in 'Call Me by Your Name' (2017), earning an Academy Award nomination. Known for his distinctive style and intense performances, he has become one of Hollywood's most sought-after young actors.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Dune", "Dune: Part Two", "Wonka", "Call Me by Your Name"],
    awards: ["Academy Award Nominee", "Golden Globe Nominee"],
    movieIds: ["dune-part-two", "dune", "wonka", "call-me-by-your-name"]
  },
  {
    id: "zendaya",
    name: "Zendaya",
    birthYear: 1996,
    nationality: "American",
    bio: "Zendaya is an American actress and singer who began her career as a child model and backup dancer. She gained wider recognition for her role as Rue Bennett in HBO's 'Euphoria', winning two Primetime Emmy Awards. Her film work includes major franchises and acclaimed dramas.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Dune", "Dune: Part Two", "Spider-Man", "Euphoria"],
    awards: ["2x Emmy Winner", "Golden Globe Winner"],
    movieIds: ["dune-part-two", "dune", "spider-man-no-way-home"]
  },
  {
    id: "mikey-madison",
    name: "Mikey Madison",
    birthYear: 1999,
    nationality: "American",
    bio: "Mikey Madison is an American actress who gained critical acclaim for her breakout role in Sean Baker's 'Anora' (2024), earning her first Academy Award nomination. She previously appeared in 'Once Upon a Time in Hollywood' and the 'Scream' franchise.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Anora", "Once Upon a Time in Hollywood", "Scream"],
    awards: ["Academy Award Nominee"],
    movieIds: ["anora", "once-upon-a-time-in-hollywood", "scream"]
  },
  {
    id: "adrien-brody",
    name: "Adrien Brody",
    birthYear: 1973,
    nationality: "American",
    bio: "Adrien Brody is an Academy Award-winning actor known for his transformative performances. He won the Oscar for Best Actor for 'The Pianist' (2002), becoming the youngest actor to win in that category. His recent work in 'The Brutalist' has earned him widespread acclaim.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Pianist", "The Brutalist", "King Kong", "The Grand Budapest Hotel"],
    awards: ["Academy Award Winner", "BAFTA Winner", "César Award Winner"],
    movieIds: ["the-brutalist", "the-pianist", "king-kong", "grand-budapest-hotel"]
  },
  {
    id: "robert-pattinson",
    name: "Robert Pattinson",
    birthYear: 1986,
    nationality: "British",
    bio: "Robert Pattinson is a British actor who gained worldwide fame as Edward Cullen in 'The Twilight Saga'. He has since established himself as a serious dramatic actor with acclaimed performances in independent films and blockbusters alike, including 'The Batman' and 'Mickey 17'.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Batman", "Mickey 17", "Tenet", "Good Time"],
    awards: ["MTV Movie Award Winner"],
    movieIds: ["mickey-17", "the-batman", "tenet", "good-time"]
  },
  {
    id: "cate-blanchett",
    name: "Cate Blanchett",
    birthYear: 1969,
    nationality: "Australian",
    bio: "Cate Blanchett is one of the most acclaimed actresses of her generation. A two-time Academy Award winner, she has portrayed a wide range of characters from Queen Elizabeth I to a troubled socialite in 'Blue Jasmine'. Her versatility and commanding presence make her a cinematic icon.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Lord of the Rings", "Blue Jasmine", "Tár", "Carol"],
    awards: ["2x Academy Award Winner", "3x BAFTA Winner", "Golden Globe Winner"],
    movieIds: ["black-bag", "tar", "blue-jasmine", "carol"]
  },
  {
    id: "michael-fassbender",
    name: "Michael Fassbender",
    birthYear: 1977,
    nationality: "Irish-German",
    bio: "Michael Fassbender is an Irish-German actor known for his intense and transformative performances. He received Academy Award nominations for '12 Years a Slave' and 'Steve Jobs'. His work spans independent films, blockbusters, and the X-Men franchise.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["X-Men", "12 Years a Slave", "Shame", "Steve Jobs"],
    awards: ["Academy Award Nominee", "BAFTA Nominee"],
    movieIds: ["black-bag", "12-years-a-slave", "shame", "steve-jobs"]
  },
  {
    id: "demi-moore",
    name: "Demi Moore",
    birthYear: 1962,
    nationality: "American",
    bio: "Demi Moore is an American actress who became one of the highest-paid actresses in Hollywood during the 1990s. After a career resurgence, she delivered a critically acclaimed performance in 'The Substance' (2024), earning her first Golden Globe win.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Substance", "Ghost", "A Few Good Men", "G.I. Jane"],
    awards: ["Golden Globe Winner", "People's Choice Award Winner"],
    movieIds: ["the-substance", "ghost", "few-good-men"]
  },
  {
    id: "ralph-fiennes",
    name: "Ralph Fiennes",
    birthYear: 1962,
    nationality: "British",
    bio: "Ralph Fiennes is a British actor, film producer, and director. A noted Shakespeare interpreter, he first achieved success onstage at the Royal National Theatre. He is known for his roles in 'Schindler's List', 'The English Patient', and 'The Grand Budapest Hotel'.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Schindler's List", "The Grand Budapest Hotel", "The English Patient", "Conclave"],
    awards: ["BAFTA Winner", "Tony Award Winner"],
    movieIds: ["conclave", "schindlers-list", "grand-budapest-hotel"]
  },
  {
    id: "marlon-brando",
    name: "Marlon Brando",
    birthYear: 1924,
    nationality: "American",
    bio: "Marlon Brando is widely considered one of the greatest actors of all time. His method acting revolutionized Hollywood, and his performances in 'A Streetcar Named Desire', 'On the Waterfront', and 'The Godfather' remain iconic.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Godfather", "On the Waterfront", "A Streetcar Named Desire", "Apocalypse Now"],
    awards: ["2x Academy Award Winner", "Cannes Best Actor"],
    movieIds: ["the-godfather", "on-the-waterfront", "apocalypse-now"]
  },
  {
    id: "al-pacino",
    name: "Al Pacino",
    birthYear: 1940,
    nationality: "American",
    bio: "Al Pacino is an American actor and filmmaker. He is one of the few performers to have won the Triple Crown of Acting. His portrayal of Michael Corleone in 'The Godfather' trilogy is considered one of cinema's greatest performances.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Godfather", "Scarface", "Heat", "Scent of a Woman"],
    awards: ["Academy Award Winner", "2x Tony Award Winner", "Emmy Winner"],
    movieIds: ["the-godfather", "scarface", "heat", "scent-of-a-woman"]
  },
  {
    id: "jack-nicholson",
    name: "Jack Nicholson",
    birthYear: 1937,
    nationality: "American",
    bio: "Jack Nicholson is one of the most celebrated actors in Hollywood history. Known for his versatile range and iconic performances, he is the most nominated male actor in Academy Awards history with 12 nominations and 3 wins.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["One Flew Over the Cuckoo's Nest", "The Shining", "Chinatown", "The Departed"],
    awards: ["3x Academy Award Winner", "6x Golden Globe Winner"],
    movieIds: ["one-flew-over-cuckoos-nest", "the-shining", "chinatown"]
  },
  {
    id: "tom-hanks",
    name: "Tom Hanks",
    birthYear: 1956,
    nationality: "American",
    bio: "Tom Hanks is one of the most popular and recognizable film stars worldwide. Known for his everyman appeal and dramatic range, he has won two consecutive Academy Awards for Best Actor and has appeared in numerous beloved films.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Forrest Gump", "Saving Private Ryan", "Cast Away", "The Green Mile"],
    awards: ["2x Academy Award Winner", "7x Emmy Winner", "Presidential Medal of Freedom"],
    movieIds: ["forrest-gump", "saving-private-ryan", "cast-away", "green-mile"]
  },
  {
    id: "leonardo-dicaprio",
    name: "Leonardo DiCaprio",
    birthYear: 1974,
    nationality: "American",
    bio: "Leonardo DiCaprio is an Academy Award-winning actor and film producer. He began his career as a child actor and rose to international fame with 'Titanic'. Known for his collaborations with Martin Scorsese, he is also a prominent environmental activist.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Titanic", "The Revenant", "Inception", "The Wolf of Wall Street"],
    awards: ["Academy Award Winner", "Golden Globe Winner", "BAFTA Winner"],
    movieIds: ["titanic", "the-revenant", "inception", "wolf-of-wall-street"]
  },
  {
    id: "brad-pitt",
    name: "Brad Pitt",
    birthYear: 1963,
    nationality: "American",
    bio: "Brad Pitt is an Academy Award-winning actor and film producer. He first gained recognition as a cowboy hitchhiker in 'Thelma & Louise' and has since starred in numerous critically acclaimed and commercially successful films.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Fight Club", "Once Upon a Time in Hollywood", "Troy", "Se7en"],
    awards: ["Academy Award Winner", "2x Golden Globe Winner"],
    movieIds: ["fight-club", "once-upon-a-time-in-hollywood", "se7en"]
  },
  {
    id: "morgan-freeman",
    name: "Morgan Freeman",
    birthYear: 1937,
    nationality: "American",
    bio: "Morgan Freeman is an American actor, director, and narrator known for his distinctive voice and authoritative presence. He won an Academy Award for 'Million Dollar Baby' and is renowned for his roles in 'The Shawshank Redemption' and 'Driving Miss Daisy'.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Shawshank Redemption", "Million Dollar Baby", "Driving Miss Daisy", "Se7en"],
    awards: ["Academy Award Winner", "Golden Globe Winner", "AFI Lifetime Achievement"],
    movieIds: ["shawshank-redemption", "million-dollar-baby", "se7en"]
  },
  {
    id: "anthony-hopkins",
    name: "Anthony Hopkins",
    birthYear: 1937,
    nationality: "British",
    bio: "Anthony Hopkins is a Welsh actor, director, and film producer. He is best known for his portrayal of Hannibal Lecter in 'The Silence of the Lambs', for which he won the Academy Award for Best Actor. He won his second Oscar for 'The Father'.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["The Silence of the Lambs", "The Father", "Hannibal", "Thor"],
    awards: ["2x Academy Award Winner", "3x BAFTA Winner", "2x Emmy Winner"],
    movieIds: ["silence-of-the-lambs", "the-father", "hannibal"]
  },
  {
    id: "denzel-washington",
    name: "Denzel Washington",
    birthYear: 1954,
    nationality: "American",
    bio: "Denzel Washington is an American actor, director, and producer. He is widely regarded as one of the greatest actors of his generation, having received numerous accolades including two Academy Awards, three Golden Globes, and a Tony Award.",
    image: "https://image.tmdb.org/t/p/w500/7g1dDqE7qGrf9zQ1z1z1z1z1z1z.jpg",
    knownFor: ["Training Day", "Malcolm X", "Glory", "Fences"],
    awards: ["2x Academy Award Winner", "3x Golden Globe Winner", "Tony Award Winner"],
    movieIds: ["training-day", "malcolm-x", "glory", "fences"]
  }
];

export const getActorById = (id: string): Actor | undefined => {
  return actors.find(a => a.id === id);
};

export const getActorsByMovieId = (movieId: string): Actor[] => {
  return actors.filter(a => a.movieIds.includes(movieId));
};

export const getActorsByDecade = (decade: number): Actor[] => {
  return actors.filter(a => {
    const birthDecade = Math.floor(a.birthYear / 10) * 10;
    return birthDecade === decade;
  });
};
