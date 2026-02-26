using BettingServer.Data;
using BettingServer.Models;

namespace BettingServer.Repositories
{
    public class BetRepository : IBetRepository
    {
        private readonly ApplicationDbContext _db;

        public BetRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public Bet Get(int id) => _db.Bets.Find(id);

        public IEnumerable<Bet> GetByUserId(int userId) =>
            _db.Bets.Where(x => x.UserId == userId).ToList();

        public IEnumerable<Bet> GetAll() => _db.Bets.ToList();

        public void Add(Bet bet) => _db.Bets.Add(bet);

        public void Delete(Bet bet) => _db.Bets.Remove(bet);

        public void Save() => _db.SaveChanges();
    }
}